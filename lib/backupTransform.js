const path = require('path')
const Promise = require('bluebird')
const sanitize = require('sanitize-filename')
const fs = Promise.promisifyAll(require('original-fs')) // eslint-disable-line

const Transform = require('./transform')
const { readXattrAsync, setXattrAsync } = require('./xattr')
const { createBackupDirAsync, UploadMultipleFiles, serverGetAsync, updateBackupDirsOrFilesAsync } = require('./server')
const { getMainWindow } = require('./window')
const { hashFileAsync } = require('./filehash')

const sendMsg = () => {}

class Task {
  constructor (localEntries, driveId, dirId, onFinished) {
    this.localEntries = localEntries
    this.driveUUID = driveId
    this.dirUUID = dirId
    this.onFinished = onFinished
    this.size = 0
    this.completeSize = 0
    this.skipSize = 0
    this.count = 0
    this.finishCount = 0
    this.state = 'visitless'
    this.errors = []
    this.warnings = []

    this.reqHandles = []

    /* Transform must be an asynchronous function !!! */
    this.readDir = new Transform({
      name: 'readDir',
      isBlocked: () => this.state === 'finished',
      concurrency: 4,
      transform (x, callback) {
        const read = async (entries, dirUUID, driveUUID, task) => {
          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i]
            const stat = await fs.lstatAsync(path.resolve(entry))
            const fullName = path.parse(entry).base
            const type = stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : 'others'

            const warning = { pipe: 'readDir', entry, name: fullName, isWarning: true }
            /* filter unsupport type */
            if (type === 'others') {
              task.warnings.push(Object.assign({ error: { code: 'ETYPE' } }, warning))
              console.error('unsupport type', entry)
              continue
            }

            /* filter invalid name */
            if (fullName !== sanitize(fullName)) {
              task.warnings.push(Object.assign({ error: { code: 'ENAME' } }, warning))
              console.error('invalid name:', entry)
              continue
            }

            /* filter skip files */
            if (stat.isFile() && (fullName === '.DS_Store' || fullName.startsWith('~$'))) {
              task.warnings.push(Object.assign({ error: { code: 'ESKIP' } }, warning))
              console.error('skip file', entry)
              continue
            }

            task.count += 1

            if (stat.isDirectory()) {
              /* read child */
              const children = await fs.readdirAsync(path.resolve(entry))
              const newEntries = []
              children.forEach(c => newEntries.push(path.join(entry, c)))
              await read(newEntries, dirUUID, driveUUID, task)
            } else task.size += stat.size
          }
          return ({ entries, dirUUID, driveUUID, task })
        }
        const { entries, dirUUID, driveUUID, task } = x
        read(entries, dirUUID, driveUUID, task).then(y => callback(null, y)).catch(callback)
      }
    })

    this.diff = new Transform({
      name: 'diff',
      concurrency: 4,
      isBlocked: () => this.state === 'finished',
      transform (x, callback) {
        const read = async (entries, dirUUID, driveUUID, task) => {
          /* read local */
          const localFiles = []
          const localDirs = []

          /* read reomte */
          const ep = `drives/${driveUUID}/dirs/${dirUUID}`
          const listNav = await serverGetAsync(ep, null)
          const remoteEntries = listNav.entries || []
          const remoteFiles = []
          const remoteDirs = []
          // includes deleted files, which does not need to upload or archive
          remoteEntries.filter(r => !r.archived && !r.fingerprint).forEach((entry) => {
            if (entry.type === 'file') remoteFiles.push(entry)
            else remoteDirs.push(entry)
          })
          // console.log('remote', remoteFiles.map(f => f.bname), remoteDirs.map(d => d.bname))

          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i]
            const stat = await fs.lstatAsync(path.resolve(entry))
            const fullName = path.parse(entry).base

            /* skip items */
            if (!stat.isFile() && !stat.isDirectory()) continue
            if (fullName !== sanitize(fullName)) continue
            if (stat.isFile() && (fullName === '.DS_Store' || fullName.startsWith('~$'))) continue

            if (stat.isDirectory()) {
              const dirname = fullName
              const attr = {
                bctime: stat.birthtime.getTime(),
                bmtime: stat.mtime.getTime()
              }
              const remoteDir = remoteDirs.find(v => v.bname === dirname)
              let uuid = null
              if (!remoteDir) {
                const res = await createBackupDirAsync(driveUUID, dirUUID, dirname, attr)
                uuid = res && res.uuid
              } else if (!remoteDir.deleted) {
                uuid = remoteDir.uuid
              } else { // deleted
                task.warnings.push({
                  pipe: 'diff',
                  entry,
                  error: { code: 'EDELDIR' },
                  name: fullName,
                  type: 'directory',
                  isWarning: true,
                  remote: { uuid: remoteDir.uuid, pdrv: driveUUID, pdir: dirUUID, name: remoteDir.bname }
                })
              }
              if (uuid) {
                /* read child */
                const children = await fs.readdirAsync(path.resolve(entry))
                const newEntries = []
                children.forEach(c => newEntries.push(path.join(entry, c)))
                this.push({ entries: newEntries, dirUUID: uuid, driveUUID, task })
              }
              task.finishCount += 1
              localDirs.push({ entry, stat, name: fullName })
            } else {
              try {
                const attr = await readXattrAsync(entry)
                if (attr && attr.parts) localFiles.push({ entry, stat, name: fullName, parts: attr.parts })
                else throw Error('No Attr')
              } catch (e) {
                const parts = await hashFileAsync(entry, stat.size, 1024 * 1024 * 1024)
                try {
                  await setXattrAsync(entry, { parts })
                } catch (err) {
                  console.error('setXattr error', err)
                }
                const newStat = await fs.lstatAsync(path.resolve(entry))
                localFiles.push({ entry, stat: newStat, name: fullName, parts })
              }
            }
          }

          /* Compare between remote and local
           * new file: upload
           * same name && type && hash && bctime && bmtime: nothing to do
           * file with same name but different bctime/bmtime/hash: archive remote and then, upload
           * remote deleted: not upload or archive
           */

          const lackFiles = []
          const map = new Map() // compare name && type && hash && bctime && bmtime
          const nameMap = new Map() // only same name
          localFiles.forEach((l) => {
            const { name, stat } = l
            const mtime = stat.mtime.getTime()
            const ctime = stat.birthtime.getTime()
            const hash = l.parts[l.parts.length - 1].fingerprint
            // local file's key: name + fingerprint + mtime + ctime
            const key = name.concat(hash).concat(mtime).concat(ctime)
            map.set(key, l)
            nameMap.set(name, key)
          })
          remoteFiles.forEach((r) => {
            // remote file's key: name + hash
            const [ctime, mtime] = [r.bctime, r.bmtime]
            const rKey = r.name.concat(r.hash).concat(mtime).concat(ctime)
            if (nameMap.has(r.name)) {
              const key = nameMap.get(r.name)
              const value = map.get(key)
              if (!r.deleted) {
                Object.assign(value, { policy: { archiveRemote: true, remoteUUID: r.uuid, remoteHash: r.hash } })
              }
              nameMap.delete(r.name)
            } else if (!r.deleted) {
              lackFiles.push(r)
            }

            // same files, no need to upload and regard as finished
            const value = map.get(rKey)
            if (value) {
              task.completeSize += value.stat.size
              task.skipSize += value.stat.size
              map.delete(rKey)
              /* remote delete file */
              if (r.deleted) {
                task.warnings.push({
                  pipe: 'diff',
                  entry: value.entry,
                  error: { code: 'EDELFILE' },
                  name: value.name,
                  type: 'file',
                  remote: { uuid: r.uuid, hash: r.hash, pdrv: driveUUID, pdir: dirUUID, name: r.bname },
                  isWarning: true
                })
              }
            }
          })
          // current nameMap: new files, map: new files and different files
          const newFiles = []
          const diffFilesMap = new Map([...map])

          const nameValue = [...nameMap.values()]
          nameValue.forEach((key) => {
            newFiles.push(map.get(key))
            diffFilesMap.delete(key)
          })

          // different files
          const diffFiles = [...diffFilesMap.values()]

          const lackDirs = remoteDirs.filter(rd => !rd.deleted && !localDirs.find(d => (d.name === rd.name)))

          // console.log('remoteFiles', remoteFiles.map(f => f.entry || f.name))
          // console.log('localFiles', localFiles.map(f => f.entry))
          // console.log('newFiles', newFiles.map(f => f.entry))
          // console.log('diffFiles', diffFiles.map(f => f.entry))
          // console.log('lackFiles', lackFiles.map(f => f.entry || f.name))
          // console.log('lackDirs', lackDirs.map(f => f.entry))

          task.finishCount += localFiles.length - newFiles.length - diffFiles.length

          /* archive local lack dirs or files */
          if (lackFiles.length + lackDirs.length) {
            const lackEntries = [...lackFiles, ...lackDirs].map((e) => {
              const { uuid, hash, bname } = e
              const args = hash ? { op: 'updateAttr', hash, uuid, archived: true } : { op: 'updateAttr', archived: true }
              return ({ bname, args })
            })
            await updateBackupDirsOrFilesAsync(driveUUID, dirUUID, lackEntries)
          }

          // check if any large file's part
          const partFiles = remoteEntries.filter(r => !r.deleted && !r.archived && r.fingerprint)

          // files need to upload, diff or new files
          const targetFiles = [...newFiles, ...diffFiles]

          targetFiles.forEach((l) => {
            // large file: > 1GB
            if (l.parts.length > 1) {
              // upload file start from position: (seed * 1024 * 1024 * 1024)
              let seed = 0
              const fingerprint = l.parts[l.parts.length - 1].fingerprint
              const targetParts = partFiles.filter(p => p.fingerprint === fingerprint)
              const reverseParts = [...l.parts].reverse()
              const index = reverseParts.findIndex(part => targetParts.some(p => p.hash === part.target))
              if (index > -1) {
                seed = reverseParts.length - 1 - index
                task.completeSize += seed * 1024 * 1024 * 1024
                task.skipSize += seed * 1024 * 1024 * 1024
              }

              l.policy = Object.assign({ seed }, l.policy) // important: assign a new object !
            }
          })

          return ({ files: targetFiles, dirUUID, driveUUID, task })
        }
        const { entries, dirUUID, driveUUID, task } = x
        read(entries, dirUUID, driveUUID, task).then(y => callback(null, y)).catch(callback)
      }
    })

    this.upload = new Transform({
      name: 'upload',
      concurrency: 2,
      isBlocked: () => this.state === 'finished',
      push (x) {
        const MAX = 8
        const { driveUUID, dirUUID, task, domain, files } = x
        for (let start = 0; start < files.length; start += MAX) {
          const currentFiles = files.slice(start, start + MAX)
          this.pending.push({ driveUUID, dirUUID, task, domain, files: currentFiles })
        }
        this.schedule()
      },
      transform: (X, callback) => {
        // console.log('upload X', X.files.map(x => x.entry))

        let uploadedSum = 0
        let countSum = 0
        const { driveUUID, dirUUID, task, domain } = X
        task.state = 'uploading'

        const Files = X.files.map((x) => {
          const { entry, stat, parts, name, policy } = x
          const readStreams = parts.map((p, i) => {
            const rs = fs.createReadStream(entry, { start: p.start, end: Math.max(p.end, 0), autoClose: true })
            let lastTimeSize = 0
            let countReadHandle = null
            const countRead = () => {
              sendMsg()
              const gap = rs.bytesRead - lastTimeSize
              task.completeSize += gap
              uploadedSum += gap
              lastTimeSize = rs.bytesRead
            }
            rs.on('open', () => {
              countReadHandle = setInterval(countRead, 200)
            })
            rs.on('end', () => {
              clearInterval(countReadHandle)
              const gap = rs.bytesRead - lastTimeSize
              task.completeSize += gap
              uploadedSum += gap
              lastTimeSize = rs.bytesRead
              if (i === parts.length - 1) {
                task.finishCount += 1
                countSum += 1
              }
              sendMsg()
            })

            if (domain === 'phy') return rs

            let formDataOptions = {
              op: 'newfile',
              size: p.end - p.start + 1,
              sha256: p.sha,
              bctime: stat.birthtime.getTime(),
              bmtime: stat.mtime.getTime()
            }

            // add fingerprint for backup large file(> 1G)
            if (parts.length > 1) {
              formDataOptions = Object.assign(formDataOptions, { fingerprint: parts[parts.length - 1].fingerprint })
            }

            // append file part for backup large file(> 1G)
            if (p.start) {
              formDataOptions = Object.assign(formDataOptions, { hash: p.target, op: 'append' })
            }

            p.formDataOptions = { filename: JSON.stringify(formDataOptions) }

            return rs
          })

          return ({ entry, stat, name, parts, readStreams, policy })
        })

        // no files
        if (!Files.length) {
          setImmediate(() => callback(null, { driveUUID, dirUUID, Files, task, domain }))
          return
        }

        this.hasFileUpload = true

        const handle = new UploadMultipleFiles(driveUUID, dirUUID, Files, domain, (error) => {
          task.reqHandles.splice(task.reqHandles.indexOf(handle), 1)
          if (error) {
            task.finishCount -= countSum
            task.completeSize -= uploadedSum
          }
          callback(error, { driveUUID, dirUUID, Files, task, domain })
        })
        task.reqHandles.push(handle)
        handle.upload()
      }
    })

    this.readDir.pipe(this.diff).pipe(this.upload)

    this.readDir.on('data', (x) => {
      const { dirUUID } = x
      getMainWindow().webContents.send('driveListUpdate', { uuid: dirUUID })
      sendMsg()
    })

    this.readDir.on('step', () => {
      this.errors.length = 0
      const pipes = ['readDir', 'diff', 'upload']
      pipes.forEach((p) => {
        if (!this[p].failed.length) return
        this[p].failed.forEach((x) => {
          if (Array.isArray(x)) x.forEach(c => this.errors.push(Object.assign({ pipe: p }, c, { task: c.task.uuid })))
          else this.errors.push(Object.assign({ pipe: p }, x, { task: x.task.uuid }))
        })
      })
      if (this.readDir.isStopped() || this.errors.length > 15) this.finish()
    })
  }

  run () {
    this.readDir.push({ entries: this.localEntries, dirUUID: this.dirUUID, driveUUID: this.driveUUID, task: this })
  }

  status () {
    return Object.assign({}, this.props, {
      completeSize: this.completeSize,
      skipSize: this.skipSize,
      count: this.count,
      finishCount: this.finishCount,
      size: this.size,
      state: this.state,
      warnings: this.warnings,
      errors: this.errors
    })
  }

  finish () {
    if (this.state === 'finished') return
    this.state = 'finished'
    this.readDir.clear()
    for (let i = this.reqHandles.length - 1; i >= 0; i--) {
      this.reqHandles[i].abort()
    }
    this.onFinished(this.errors, this.warnings)
  }
}

module.exports = Task
