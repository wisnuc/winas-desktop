const path = require('path')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('original-fs')) // eslint-disable-line
const debug = require('debug')('node:lib:uploadTransform:')
const sanitize = require('sanitize-filename')

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
    this.completeSize = 0
    this.lastTimeSize = 0
    this.count = 0
    this.trueCount = 0
    this.finishCount = 0
    this.finishDate = 0
    this.restTime = 0
    this.size = 0
    this.trueSize = 0
    this.speed = 0
    this.lastSpeed = 0
    this.state = 'visitless'
    this.errors = []
    this.warnings = []
    this.startUpload = (new Date()).getTime()

    this.countSpeedFunc = () => {
      const speed = Math.max(this.completeSize - this.lastTimeSize, 0)
      this.speed = Math.floor((this.lastSpeed * 3 + speed) / 4)
      this.lastSpeed = this.speed
      this.averageSpeed = Math.round(this.completeSize / ((new Date()).getTime() - this.startUpload) * 1000)
      this.restTime = this.speed && (this.size - this.completeSize) / this.averageSpeed
      this.lastTimeSize = this.completeSize
      sendMsg()
    }

    this.reqHandles = []

    /* Transform must be an asynchronous function !!! */
    this.readDir = new Transform({
      name: 'readDir',
      isBlocked: () => false,
      concurrency: 4,
      transform (x, callback) {
        const read = async (entries, dirUUID, driveUUID, task) => {
          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i]
            const stat = await fs.lstatAsync(path.resolve(entry))
            const fullName = path.parse(entry).base

            if (!stat.isFile() && !stat.isDirectory()) {
              task.warnings.push(Object.assign({
                pipe: 'readDir', entry, error: { code: 'ETYPE' }, stat, task: task.uuid
              }))
              console.error('unsupport type', entry)
              continue
            }

            const type = stat.isDirectory() ? 'directory' : 'file'
            if (fullName !== sanitize(fullName)) {
              task.warnings.push(Object.assign({
                pipe: 'readDir', entry, error: { code: 'ENAME' }, stat, task: task.uuid, type
              }))
              console.error('invalid name:', entry)
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
      transform (x, callback) {
        const read = async (entries, dirUUID, driveUUID, task) => {
          /* read local */
          const localFiles = []
          const localDirs = []

          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i]
            const stat = await fs.lstatAsync(path.resolve(entry))
            const fullName = path.parse(entry).base

            if (!stat.isFile() && !stat.isDirectory()) continue
            if (fullName !== sanitize(fullName)) continue

            if (stat.isDirectory()) {
              const dirname = fullName
              const attr = {
                bctime: stat.ctime.getTime(),
                bmtime: stat.mtime.getTime()
              }
              const res = await createBackupDirAsync(driveUUID, dirUUID, dirname, attr)
              task.finishCount += 1
              const uuid = res && res.uuid
              /* read child */
              const children = await fs.readdirAsync(path.resolve(entry))
              const newEntries = []
              children.forEach(c => newEntries.push(path.join(entry, c)))
              this.push({ entries: newEntries, dirUUID: uuid, driveUUID, task })
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
                localFiles.push({ entry, stat, name: fullName, parts })
              }
            }
          }

          /* read reomte */
          const ep = `drives/${driveUUID}/dirs/${dirUUID}`
          const listNav = await serverGetAsync(ep, null)
          const remoteEntries = listNav.entries || []
          const remoteFiles = []
          const remoteDirs = []
          remoteEntries.forEach((entry) => {
            if (entry.type === 'file') remoteFiles.push(entry)
            else remoteDirs.push(entry)
          })
          console.log('remote', remoteFiles.map(f => f.bname), remoteDirs.map(d => d.bname))

          /* Compare between remote and local
           * new file: upload
           * same name && type && hash && bctime && bmtime: nothing to do
           * file with same name but different bctime/bmtime/hash: archive remote and then, upload
           * remote deleted: TODO
           */

          const map = new Map() // compare name && type && hash && bctime && bmtime
          const nameMap = new Map() // only same name
          localFiles.forEach((l) => {
            const { name, stat } = l
            const mtime = stat.mtime.getTime()
            const ctime = stat.ctime.getTime()
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
              Object.assign(value, { policy: { archiveRemote: true, remoteUUID: r.uuid, remoteHash: r.hash } })
              nameMap.delete(r.name)
            }

            if (map.has(rKey)) {
              map.delete(rKey)
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

          // newFiles
          const lackFiles = remoteFiles.filter(rf => !localFiles.find(f => (f.name === rf.name)))
          const diffFiles = [...diffFilesMap.values()]

          const lackDirs = remoteDirs.filter(rd => !localDirs.find(d => (d.name === rd.name)))
          console.log('localFiles', localFiles.map(f => f.entry))
          console.log('newFiles', newFiles.map(f => f.entry))
          console.log('diffFiles', diffFiles)
          console.log('lackFiles', lackFiles)
          console.log('lackDirs', lackDirs)
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

          return ({ files: [...newFiles, ...diffFiles], dirUUID, driveUUID, task })
        }
        const { entries, dirUUID, driveUUID, task } = x
        read(entries, dirUUID, driveUUID, task).then(y => callback(null, y)).catch(callback)
      }
    })

    this.upload = new Transform({
      name: 'upload',
      concurrency: 2,
      isBlocked: () => false,
      push (x) {
        this.pending.push(x) // TODO lenth to large
        /* upload N file within one post */
        /*
        const i = this.pending.findIndex(p => p.length < 64 && p[0].dirUUID === x.dirUUID)
        if (i > -1) {
          this.pending[i].push(x)
        } else {
          this.pending.push([x])
        }
        */
        this.schedule()
      },
      transform: (X, callback) => {
        console.log('upload X', X.files.map(x => x.entry))

        let uploadedSum = 0
        let countSum = 0
        const { driveUUID, dirUUID, task, domain } = X
        task.state = 'uploading'

        const Files = X.files.map((x) => {
          const { entry, stat, parts, name } = x
          const readStreams = parts.map((p, i) => {
            const rs = fs.createReadStream(entry, { start: p.start, end: Math.max(p.end, 0), autoClose: true })
            let lastTimeSize = 0
            let countReadHandle = null
            const countRead = () => { // eslint-disable-line
              sendMsg()
              const gap = rs.bytesRead - lastTimeSize
              task.completeSize += gap
              uploadedSum += gap
              lastTimeSize = rs.bytesRead
            }
            rs.on('open', () => {
              countReadHandle = setInterval(countRead, 200)
            })
            rs.on('end', () => { // eslint-disable-line
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
              bctime: stat.ctime.getTime(),
              bmtime: stat.mtime.getTime()
            }

            if (p.start) {
              formDataOptions = Object.assign(formDataOptions, { hash: p.target, op: 'append' })
            }

            p.formDataOptions = { filename: JSON.stringify(formDataOptions) }

            return rs
          })

          return ({ entry, stat, name, parts, readStreams })
        })

        // no files, TODO
        if (!Files.length) {
          setImmediate(() => callback(null, { driveUUID, dirUUID, Files, task, domain }))
          return
        }

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
      const { dirUUID, task } = x
      getMainWindow().webContents.send('driveListUpdate', { uuid: dirUUID })
      if (task.finishCount === task.count && this.readDir.isStopped()) {
        this.finish()
      }
      sendMsg()
    })

    this.readDir.on('step', () => {
      console.log('step', this.finishCount, this.count)
      if (this.trueSize > this.size || this.trueCount > this.count) {
        this.size = this.trueSize
        this.count = this.trueCount
      }

      this.errors.length = 0
      const pipes = ['readDir', 'diff', 'upload']
      pipes.forEach((p) => {
        if (!this[p].failed.length) return
        this[p].failed.forEach((x) => {
          if (Array.isArray(x)) x.forEach(c => this.errors.push(Object.assign({ pipe: p }, c, { task: c.task.uuid })))
          else this.errors.push(Object.assign({ pipe: p }, x, { task: x.task.uuid }))
        })
      })
      if (this.errors.length > 8 || (this.readDir.isStopped() && this.errors.length)) {
        debug('errorCount', this.errors.length)
        clearInterval(this.countSpeed)
        this.state = 'failed'
        sendMsg()
      }
    })
  }

  run () {
    this.countSpeed = setInterval(this.countSpeedFunc, 1000)
    this.readDir.push({ entries: this.localEntries, dirUUID: this.dirUUID, driveUUID: this.driveUUID, task: this })
  }

  status () {
    return Object.assign({}, this.props, {
      completeSize: this.completeSize,
      lastTimeSize: this.lastTimeSize,
      count: this.count,
      finishCount: this.finishCount,
      finishDate: this.finishDate,
      restTime: this.restTime,
      size: this.size,
      speed: this.speed,
      lastSpeed: this.lastSpeed,
      state: this.state,
      warnings: this.warnings,
      errors: this.errors,
      waiting: this.waiting
    })
  }

  finish () {
    this.readDir.clear()
    this.reqHandles.forEach(h => h.abort())
    this.finishDate = (new Date()).getTime()
    this.state = 'finished'
    clearInterval(this.countSpeed)
    this.onFinished(this.errors, this.warnings)
  }
}

module.exports = Task
