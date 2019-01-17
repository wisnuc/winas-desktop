const i18n = require('i18n')
const UUID = require('uuid')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('original-fs')) // eslint-disable-line
const stream = require('stream')
const path = require('path')
const crypto = require('crypto')
const childProcess = require('child_process')
const debug = require('debug')('node:lib:uploadTransform:')
const sanitize = require('sanitize-filename')

const Transform = require('./transform')
const { readXattr, setXattr } = require('./xattr')
const { createFoldAsync, UploadMultipleFiles, serverGetAsync } = require('./server')
const { getMainWindow } = require('./window')
const { Tasks, sendMsg, taskSchedule } = require('./transmissionUpdate')
const { hashFileAsync, spliceFile, calcFingerprint } = require('./filehash')

/* return a new file name */
const getName = (name, nameSpace) => {
  let checkedName = name
  const extension = path.parse(name).ext
  for (let i = 1; nameSpace.includes(checkedName); i++) {
    if (!extension || extension === name) {
      checkedName = `${name}(${i})`
    } else {
      checkedName = `${path.parse(name).name}(${i})${extension}`
    }
  }
  return checkedName
}

class Task {
  constructor (props) {
    /* props: { uuid, entries, dirUUID, driveUUID, taskType, createTime, isNew, policies, domain } */

    this.initStatus = () => {
      Object.assign(this, props)
      this.props = props
      this.completeSize = 0
      this.lastTimeSize = 0
      this.count = 0
      this.trueCount = 0
      this.finishCount = 0
      this.finishDate = 0
      this.name = (props.policies[0] && props.policies[0].checkedName) || path.parse(props.entries[0]).base
      this.paused = true
      this.restTime = 0
      this.size = 0
      this.trueSize = 0
      this.speed = 0
      this.lastSpeed = 0
      this.state = 'visitless'
      this.trsType = 'upload'
      this.errors = []
      this.warnings = []
      this.startUpload = (new Date()).getTime()
    }

    this.initStatus()

    this.countSpeedFunc = () => {
      if (this.paused) {
        this.speed = 0
        this.restTime = 0
        sendMsg()
        clearInterval(this.countSpeed)
        return
      }
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
      concurrency: 64,
      transform (x, callback) {
        const read = async (entries, dirUUID, driveUUID, policies, domain, task) => {
          for (let i = 0; i < entries.length; i++) {
            if (task.paused) break
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
              await read(newEntries, dirUUID, driveUUID, policies, domain, task)
            } else task.size += stat.size
          }
          return ({ entries, dirUUID, driveUUID, policies, domain, task })
        }
        const { entries, dirUUID, driveUUID, policies, domain, task } = x
        read(entries, dirUUID, driveUUID, policies, domain, task).then(y => callback(null, y)).catch(callback)
      }
    })

    this.mkdir = new Transform({
      name: 'mkdir',
      concurrency: 4,
      transform (x, callback) {
        const read = async (entries, dirUUID, driveUUID, policies, domain, task) => {
          const files = []
          for (let i = 0; i < entries.length; i++) {
            // if (task.paused) throw Error('task paused !')
            if (task.paused) break
            const policy = policies[i]
            const entry = entries[i]
            const stat = await fs.lstatAsync(path.resolve(entry))
            const fullName = path.parse(entry).base

            if (!stat.isFile() && !stat.isDirectory()) continue
            if (fullName !== sanitize(fullName)) continue

            task.trueCount += 1

            if (stat.isDirectory()) {
              /* create fold and return the uuid */
              const dirname = policy.mode === 'rename' ? policy.checkedName : fullName

              const res = await createFoldAsync(driveUUID, dirUUID, dirname, entries, policy, domain)
              const uuid = domain === 'phy'
                ? dirUUID ? `${dirUUID}/${dirname}` : dirname
                : res && res.uuid

              /* read child */
              const children = await fs.readdirAsync(path.resolve(entry))
              const newEntries = []
              children.forEach(c => newEntries.push(path.join(entry, c)))

              /* mode 'merge' should apply to children */
              const childPolicies = []
              childPolicies.length = newEntries.length
              childPolicies.fill({ mode: policy.mode }) // !!! fill with one object, all shared !!!
              if (policy.mode === 'rename' || policy.mode === 'replace') childPolicies.fill({ mode: 'normal' })

              if (task.paused) break
              this.push({ entries: newEntries, dirUUID: uuid, driveUUID, policies: childPolicies, domain, task })
            } else task.trueSize += stat.size

            files.push({ entry, stat, policy })
          }
          return ({ files, dirUUID, driveUUID, task, entries, domain })
        }
        const { entries, dirUUID, driveUUID, policies, domain, task } = x
        read(entries, dirUUID, driveUUID, policies, domain, task).then(y => callback(null, y)).catch(callback)
      }
    })

    this.hash = new Transform({
      name: 'hash',
      concurrency: 1,
      push (x) {
        const { files, dirUUID, driveUUID, task, domain } = x
        debug('this.hash push', files.length)
        files.forEach((f) => {
          if (f.stat.isDirectory()) {
            this.outs.forEach(t => t.push(Object.assign({}, f, { dirUUID, driveUUID, task, type: 'directory', domain })))
          } else {
            this.pending.push(Object.assign({}, f, { dirUUID, driveUUID, task, domain }))
          }
        })
        this.schedule()
        // debug('this.hash push forEach', files.length)
      },
      transform: (x, callback) => {
        const { entry, dirUUID, driveUUID, stat, policy, retry, domain, task } = x
        if (task.paused) return
        if (task.state !== 'uploading' && task.state !== 'diffing') task.state = 'hashing'
        readXattr(entry, (error, attr) => {
          if (domain === 'phy') { // phy drive, no hash
            const parts = spliceFile(stat.size, Infinity)
            callback(null, { entry, dirUUID, driveUUID, parts, type: 'file', stat, policy, retry, task, domain })
          } else if (!error && attr && attr.parts && retry === undefined) { // get xattr
            callback(null, { entry, dirUUID, driveUUID, parts: attr.parts, type: 'file', stat, policy, retry, task, domain })
          } else if (!(policy.mode === 'merge' || policy.mode === 'overwrite') && task.isNew && !retry) { // new post hash Upload
            const parts = spliceFile(stat.size, 1024 * 1024 * 1024)
            callback(null, { entry, dirUUID, driveUUID, parts, type: 'file', stat, policy, retry, task, domain })
          } else if (stat.size < 134217728) { // in process pre hash
            hashFileAsync(entry, stat.size, 1024 * 1024 * 1024)
              .then(parts => setXattr(entry, { parts }, (err, xattr) => {
                if (err) console.error('set xattar error', err)
                const p = xattr && xattr.parts
                const r = retry ? retry + 1 : retry
                callback(null, { entry, dirUUID, driveUUID, parts: p, type: 'file', stat, policy, retry: r, domain, task })
              }))
              .catch(callback)
          } else { // extra process pre hash
            const options = {
              env: { absPath: entry, size: stat.size, partSize: 1024 * 1024 * 1024 },
              encoding: 'utf8',
              cwd: process.cwd()
            }

            const child = childProcess.fork(path.join(__dirname, './filehash'), [], options)
            child.on('message', (result) => {
              setXattr(entry, result, (err, xattr) => {
                if (err) console.error('set xattr error', err)
                // debug('hash finished', ((new Date()).getTime() - hashStart) / 1000)
                const p = xattr && xattr.parts
                const r = retry ? retry + 1 : retry
                callback(null, { entry, dirUUID, driveUUID, parts: p, type: 'file', stat, policy, retry: r, domain, task })
              })
            })
            child.on('error', callback)
          }
        })
      }
    })

    this.diff = new Transform({
      name: 'diff',
      concurrency: 4,
      push (x) {
        if (x.type === 'directory' || (!(x.policy.mode === 'merge' || x.policy.mode === 'overwrite') && x.task.isNew && !x.retry)) {
          this.outs.forEach(t => t.push([x]))
        } else {
          /* combine to one post */
          const { dirUUID, policy } = x
          const i = this.pending.findIndex(p => p[0].dirUUID === dirUUID && policy.mode === p[0].policy.mode)
          if (i > -1) {
            this.pending[i].push(x)
          } else {
            // debug('this.diff new array', x.entry, x.dirUUID, this.pending.length)
            this.pending.push([x])
          }
          this.schedule()
        }
      },

      transform: (X, callback) => {
        const diffAsync = async (local, driveUUID, dirUUID, domain, task) => {
          /* phyDrive or normal drive */
          const isPhy = domain === 'phy'
          const ep = isPhy ? `phy-drives/${driveUUID}` : `drives/${driveUUID}/dirs/${dirUUID}`
          const qs = isPhy ? { path: dirUUID } : null
          const listNav = await serverGetAsync(ep, qs)
          const remote = isPhy ? listNav : listNav.entries

          if (!remote.length) return local
          const map = new Map() // compare hash and name
          const nameMap = new Map() // only same name
          const nameSpace = [] // used to check name
          local.forEach((l) => {
            const name = l.policy.mode === 'rename' ? l.policy.checkedName : path.parse(l.entry).base
            const key = name.concat(l.parts[l.parts.length - 1].fingerprint) // local file's key: name + fingerprint
            map.set(key, l)
            nameMap.set(name, key)
            nameSpace.push(name)
          })
          // debug('diffAsync map', map, remote)
          remote.forEach((r) => {
            const rKey = r.name.concat(r.hash) // remote file's key: name + hash
            if (map.has(rKey)) {
              task.finishCount += 1
              // debug('this.diff transform find already finished', task.finishCount, r.name)
              task.completeSize += map.get(rKey).stat.size
              map.delete(rKey)
            }
            if (nameMap.has(r.name)) nameMap.delete(r.name)
            else nameSpace.push(r.name)
          })
          const result = [...map.values()] // local files that need to upload

          /* get files with same name but different hash */
          const nameValue = [...nameMap.values()]
          nameValue.forEach(key => map.delete(key))
          const mapValue = [...map.values()]
          if (mapValue.length) {
            let mode = mapValue[0].policy.mode
            if (mode === 'merge') mode = 'rename'
            if (mode === 'overwrite') mode = 'replace'
            mapValue.forEach((l) => {
              const name = path.parse(l.entry).base // TODO mode rename but still same name ?
              const checkedName = getName(name, nameSpace)
              const remoteFile = remote.find(r => r.name === name)
              const remoteUUID = remoteFile.uuid
              const remoteHash = remoteFile.hash

              let seed = 0
              if (l.parts.length > 0) {
                const index = l.parts.findIndex(p => p.target === remoteHash)
                if (index > 0) {
                  seed = index
                  task.completeSize += index * 1024 * 1024 * 1024
                }
              }

              /* continue to upload big file */
              debug('get files with same name but different hash\n', l.entry, mode, checkedName, remoteUUID, seed, l.parts)

              l.policy = Object.assign({}, { mode, checkedName, remoteUUID, seed }) // important: assign a new object !
            })
          }
          /* task all finished */
          if (!task.paused && !result.length && task.finishCount === task.count &&
            this.readDir.isSelfStopped() && this.hash.isSelfStopped()) {
            this.finish()
          }
          return result
        }

        const { driveUUID, dirUUID, domain, task } = X[0]
        if (task.state !== 'uploading') task.state = 'diffing'

        diffAsync(X, driveUUID, dirUUID, domain, task).then(value => callback(null, value)).catch((e) => {
          debug('diffAsync error', e)
          callback(e)
        })
      }
    })

    this.upload = new Transform({
      name: 'upload',
      concurrency: 2,
      isBlocked: () => this.paused,
      push (X) {
        // debug('this.upload push', X.length)
        X.forEach((x) => {
          if (x.type === 'directory') {
            x.task.finishCount += 1
            this.root().emit('data', x)
          } else {
            /* combine to one post */
            const { dirUUID, policy } = x
            /* upload N file within one post */
            const i = this.pending.findIndex(p => p.length < 64 &&
              p[0].dirUUID === dirUUID && policy.mode === p[0].policy.mode)
            if (i > -1) {
              this.pending[i].push(x)
            } else {
              this.pending.push([x])
            }
          }
        })
        // debug('this.upload forEach', X.length)
        this.schedule()
      },
      transform: (X, callback) => {
        // debug('upload transform start', X.length)

        let handle
        let uploadedSum = 0
        let countSum = 0
        const Files = X.map((x) => {
          const { entry, stat, parts, policy, retry, task, domain } = x
          const name = policy.mode === 'rename' ? policy.checkedName : path.parse(entry).base
          const readStreams = parts.map((p, i) => {
            const rs = fs.createReadStream(entry, { start: p.start, end: Math.max(p.end, 0), autoClose: true })
            let lastTimeSize = 0
            let countReadHandle = null
            const countRead = () => { // eslint-disable-line
              sendMsg()
              if (task.paused) clearInterval(countReadHandle)
              else {
                const gap = rs.bytesRead - lastTimeSize
                task.completeSize += gap
                uploadedSum += gap
                lastTimeSize = rs.bytesRead
              }
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
              if (task.paused) return
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
              sha256: p.sha || undefined
            }

            p.PLACE_HOLDER_HASH = UUID.v4().concat('xxxxxxxxxxxxxxxxxxxxxxxxxxxx')

            if (p.start) {
              formDataOptions = Object.assign(formDataOptions, { hash: p.target || p.PLACE_HOLDER_HASH, op: 'append' })
            } else if (policy && policy.mode === 'replace') {
              formDataOptions = Object.assign(formDataOptions, { policy: ['replace', 'replace'] })
            }

            p.formDataOptions = { filename: JSON.stringify(formDataOptions) }

            if (!p.sha) {
              const digester = crypto.createHash('sha256')
              digester.setEncoding('hex')
              const ts = new stream.Transform({
                transform (chunk, encoding, cb) {
                  digester.update(chunk)
                  cb(null, chunk)
                },
                flush (cb) {
                  const sha256 = digester.digest('hex')
                  this.push(Buffer.from(sha256, 'hex'))
                  p.sha = sha256
                  /* calc fingerprint */
                  const fps = calcFingerprint(parts.slice(0, i + 1).map(pt => pt.sha))
                  p.fingerprint = [...fps].pop()

                  if (i === parts.length - 1) {
                    const newParts = parts.map((part, index) => {
                      const newPart = Object.assign({}, part, index ? { target: parts[index - 1].fingerprint } : {})
                      delete newPart.PLACE_HOLDER_HASH
                      delete newPart.formDataOptions
                      return newPart
                    })
                    setXattr(entry, { parts: newParts }, err => err && console.error('set xattr error', err))
                  }

                  /* hack to supagent -> forma-data -> header to set target fingerprint */
                  if (parts.length > i + 1) {
                    const np = parts[i + 1]
                    const hackStream = handle.handle._formData._streams
                    const index = hackStream.findIndex(arr => typeof arr === 'string' && arr.includes(np.PLACE_HOLDER_HASH))
                    if (index > 0) hackStream[index] = hackStream[index].replace(np.PLACE_HOLDER_HASH, p.fingerprint)
                  }
                  cb()
                }
              })

              const ns = rs.pipe(ts)
              ns.path = entry // !!important for superagent to read a transformed stream
              return ns
            }
            return rs
          })

          return ({ entry, stat, name, parts, readStreams, retry, policy })
        })

        const { driveUUID, dirUUID, task, domain } = X[0]
        task.state = 'uploading'
        handle = new UploadMultipleFiles(driveUUID, dirUUID, Files, domain, (error) => {
          task.reqHandles.splice(task.reqHandles.indexOf(handle), 1)
          if (error) {
            debug('UploadMultipleFiles handle callbak error', error)
            task.finishCount -= countSum
            task.completeSize -= uploadedSum
            X.forEach((x) => {
              if (x.retry > -1) x.retry += 1
              else x.retry = 0
            })
          }
          callback(error, { driveUUID, dirUUID, Files, task, domain })
        })
        task.reqHandles.push(handle)
        handle.upload()
      }
    })

    this.readDir.pipe(this.mkdir).pipe(this.hash).pipe(this.diff).pipe(this.upload)

    this.readDir.on('data', (x) => {
      const { dirUUID, task } = x
      getMainWindow().webContents.send('driveListUpdate', { uuid: dirUUID })
      // debug('this.readDir.on data', task.finishCount, task.count, this.readDir.isStopped())
      if (!task.paused && task.finishCount === task.count && this.readDir.isStopped() && !task.errors.length) {
        this.finish()
      }
      task.updateStore()
      sendMsg()
    })

    this.readDir.on('step', () => {
      if (this.trueSize > this.size || this.trueCount > this.count || this.mkdir.isFinished()) {
        this.size = this.trueSize
        this.count = this.trueCount
      }

      /* retry, if upload error && response code ∈ [400, 500) && retry times < 2 */
      for (let i = this.upload.failed.length - 1; i > -1; i--) {
        const X = this.upload.failed[i]
        const index = Array.isArray(X) && X.findIndex((x) => {
          let res = x.error && x.error.response
          if (!res) return false
          if (!Array.isArray(res)) res = [res]
          return x.retry < 1 && (res.findIndex(r => r.error && r.error.code !== 'EEXIST') > -1)
        })
        if (index > -1) {
          debug('X retry', X[0].retry, X[0].error)
          const files = []
          X.forEach(x => files.push({ entry: x.entry, stat: x.stat, policy: x.policy, retry: x.retry }))
          const { driveUUID, dirUUID, task } = X[0]
          this.hash.push({ files, driveUUID, dirUUID, task })
          this.upload.failed.splice(i, 1)
        }
      }

      const preLength = this.errors.length
      this.errors.length = 0
      const pipes = ['readDir', 'mkdir', 'hash', 'diff', 'upload']
      pipes.forEach((p) => {
        if (!this[p].failed.length) return
        this[p].failed.forEach((x) => {
          if (Array.isArray(x)) x.forEach(c => this.errors.push(Object.assign({ pipe: p }, c, { task: c.task.uuid })))
          else this.errors.push(Object.assign({ pipe: p }, x, { task: x.task.uuid }))
        })
      })
      if (this.errors.length !== preLength) this.updateStore()
      if (this.errors.length > 8 || (this.readDir.isStopped() && this.errors.length)) {
        debug('errorCount', this.errors.length)
        this.paused = true
        clearInterval(this.countSpeed)
        this.state = 'failed'
        this.updateStore()
        taskSchedule('upload')
        sendMsg()
      }
    })
  }

  run () {
    this.paused = false
    this.countSpeed = setInterval(this.countSpeedFunc, 1000)
    this.readDir.push({ entries: this.entries, dirUUID: this.dirUUID, driveUUID: this.driveUUID, policies: this.policies, domain: this.domain, task: this })
  }

  status () {
    return Object.assign({}, this.props, {
      completeSize: this.completeSize,
      lastTimeSize: this.lastTimeSize,
      count: this.count,
      finishCount: this.finishCount,
      finishDate: this.finishDate,
      name: this.name,
      paused: this.paused,
      restTime: this.restTime,
      size: this.size,
      speed: this.speed,
      lastSpeed: this.lastSpeed,
      state: this.state,
      warnings: this.warnings,
      errors: this.errors,
      trsType: this.trsType,
      waiting: this.waiting
    })
  }

  createStore () {
    this.countStore = 0
    if (!this.isNew) return
    global.DB.save(this.uuid, this.status(), err => err && console.error(this.name, 'createStore error: ', err))
  }

  updateStore () {
    if (!this.WIP && !this.storeUpdated) {
      this.WIP = true
      global.DB.save(this.uuid, this.status(), err => err && console.error(this.name, 'updateStore error: ', err))
      this.storeUpdated = true
      this.countStore += 1
      setTimeout(() => this && !(this.WIP = false) && this.updateStore(), 100)
    } else this.storeUpdated = false
  }

  pause (pure) { // if pure === true, don't update store
    this.wait(false)
    if (this.paused) return
    this.paused = true
    this.reqHandles.forEach(h => h.abort())
    clearInterval(this.countSpeed)
    if (!pure) this.updateStore()
    sendMsg()
  }

  resume () {
    this.readDir.clear()
    this.initStatus()
    this.isNew = false
    this.wait(true)
    sendMsg()
  }

  wait (state) {
    this.waiting = state
  }

  finish () {
    this.paused = true
    this.readDir.clear()
    this.reqHandles.forEach(h => h.abort())
    this.finishDate = (new Date()).getTime()
    this.state = 'finished'
    clearInterval(this.countSpeed)
    this.updateStore()
    taskSchedule('upload')
    sendMsg()
    let name = this.name || ''
    if (name.length > 20) name = name.slice(0, 20).concat('...')
    if (this.entries.length > 1) name = name.concat(i18n.__('And Other %s Items', this.entries.length))
    getMainWindow().webContents.send('snackbarMessage', { message: i18n.__('%s Upload Finished', name) })
  }
}

const createTask = (uuid, entries, dirUUID, driveUUID, taskType, createTime, isNew, policies, domain, preStatus) => {
  const task = new Task({ uuid, entries, dirUUID, driveUUID, taskType, createTime, isNew, policies, domain })
  Tasks.push(task)
  task.createStore()

  if (preStatus) Object.assign(task, preStatus, { isNew: false, paused: true, speed: 0, restTime: 0 })
  else if (Tasks.filter(t => !t.paused && t.state !== 'finished' && t.trsType === 'upload').length < 5) task.run()
  else task.wait(true)
  sendMsg()
}

module.exports = { createTask }
