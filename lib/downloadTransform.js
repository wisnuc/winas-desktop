const i18n = require('i18n')
const path = require('path')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const mkdirp = Promise.promisify(require('mkdirp'))
const debug = require('debug')('node:lib:downloadTransform:')

const Transform = require('./transform')
const { getMainWindow } = require('./window')
const { serverGetAsync, DownloadFile } = require('./server')
const { Tasks, sendMsg, taskSchedule } = require('./transmissionUpdate')

class Task {
  constructor (props) {
    /* props: { uuid, downloadPath, name, entries, dirUUID, driveUUID, taskType, createTime, isNew, domain } */

    this.initStatus = () => {
      Object.assign(this, props)
      this.props = props
      this.completeSize = 0
      this.lastTimeSize = 0
      this.count = 0
      this.finishCount = 0
      this.finishDate = 0
      this.paused = true
      this.restTime = 0
      this.size = 0
      this.speed = 0
      this.lastSpeed = 0
      this.state = 'visitless'
      this.trsType = 'download'
      this.errors = []
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
    this.readRemote = new Transform({
      name: 'readRemote',
      concurrency: 4,
      isBlocked: () => this.paused && !this.waiting,
      transform (x, callback) {
        const read = async (entries, downloadPath, dirUUID, driveUUID, domain, task) => {
          for (let i = 0; i < entries.length; i++) {
            if (task.paused) throw Error('task paused !')
            const entry = entries[i]
            task.count += 1
            entry.newName = entry.newName || entry.name
            entry.downloadPath = path.join(downloadPath, entry.newName)
            entry.tmpPath = path.join(downloadPath, `${entry.newName}.download`)
            if (entry.type === 'directory') {
              /* mkdir */
              await mkdirp(entry.downloadPath)

              /* get children from remote: dir or phy */
              const isPhy = domain === 'phy'
              const ep = isPhy ? `phy-drives/${driveUUID}` : `drives/${driveUUID}/dirs/${entry.uuid}`
              const qs = isPhy ? { path: `${dirUUID}${entry.name}` } : null

              const children = isPhy ? await serverGetAsync(ep, qs) : (await serverGetAsync(ep, qs)).entries
              const newDirUUID = isPhy ? `${dirUUID}${entry.name}/` : entry.uuid

              this.push({ entries: children, downloadPath: entry.downloadPath, dirUUID: newDirUUID, driveUUID, domain, task })
            } else {
              task.size += entry.size
              entry.lastTimeSize = 0
              entry.seek = 0
            }
          }
          return ({ entries, downloadPath, dirUUID, driveUUID, domain, task })
        }

        const { entries, downloadPath, dirUUID, driveUUID, domain, task } = x
        if (task.state !== 'downloading') task.state = 'diffing'
        read(entries, downloadPath, dirUUID, driveUUID, domain, task).then(y => callback(null, y)).catch(e => callback(e))
      }
    })

    this.diff = new Transform({
      name: 'diff',
      concurrency: 1,
      push (X) {
        const { entries, downloadPath, dirUUID, driveUUID, domain, task } = X
        if (task.isNew) {
          this.outs.forEach(t => t.push(X))
        } else {
          const dirEntry = []
          const fileEntry = []
          entries.forEach((entry) => {
            if (entry.type === 'directory') dirEntry.push(entry)
            else fileEntry.push(entry)
          })
          if (dirEntry.length) this.outs.forEach(t => t.push({ entries: dirEntry, downloadPath, dirUUID, driveUUID, domain, task }))
          if (fileEntry.length) this.pending.push({ entries: fileEntry, downloadPath, dirUUID, driveUUID, domain, task })
        }
        this.schedule()
      },
      transform: (x, callback) => {
        const diffAsync = async (entries, downloadPath, dirUUID, driveUUID, domain, task) => {
          debug('diff async', entries.length, downloadPath, dirUUID, driveUUID)
          const localFiles = await fs.readdirAsync(downloadPath)
          for (let i = 0; i < entries.length; i++) {
            const entry = entries[i]
            if (localFiles.includes(entry.newName)) {
              task.completeSize += entry.size
              task.lastTimeSize += entry.size
              entry.finished = true
            } else if (localFiles.includes(`${entry.newName}.download`)) {
              const stat = await fs.lstatAsync(entry.tmpPath)
              if (stat.size < entry.size) {
                entry.seek = stat.size
                task.completeSize += entry.seek
              }
            }
            task.lastTimeSize = task.completeSize // set lastTimeSize
          }
          return ({ entries, downloadPath, dirUUID, driveUUID, task })
        }
        const { entries, downloadPath, dirUUID, driveUUID, domain, task } = x
        diffAsync(entries, downloadPath, dirUUID, driveUUID, domain, task).then(y => callback(null, y)).catch(e => callback(e))
      }
    })

    this.download = new Transform({
      name: 'download',
      concurrency: 4,
      push (X) {
        const { entries, downloadPath, dirUUID, driveUUID, domain, task } = X
        entries.forEach((entry) => {
          if (entry.type === 'directory' || entry.finished) {
            this.root().emit('data', { entry, downloadPath, dirUUID, driveUUID, domain, task })
          } else {
            this.pending.push({ entry, downloadPath, dirUUID, driveUUID, domain, retry: 0, task }) // set retry times to 0
          }
        })
        this.schedule()
      },
      transform: (x, callback) => {
        const { entry, downloadPath, dirUUID, driveUUID, domain, task } = x
        task.state = 'downloading'
        const stream = fs.createWriteStream(entry.tmpPath, { flags: entry.seek ? 'r+' : 'w', start: entry.seek })
        stream.on('error', err => callback(err))

        stream.on('drain', () => {
          const gap = stream.bytesWritten - entry.lastTimeSize
          entry.seek += gap
          task.completeSize += gap
          entry.lastTimeSize = stream.bytesWritten
        })

        stream.on('finish', () => {
          const gap = stream.bytesWritten - entry.lastTimeSize
          entry.seek += gap
          task.completeSize += gap
          entry.lastTimeSize = 0
          task.updateStore()
          if (entry.seek === entry.size) callback(null, { entry, downloadPath, dirUUID, driveUUID, domain, task })
          if (!task.paused && entry.seek !== entry.size) {
            const error = new Error('connection ended without finished')
            error.code = 'ECONNEND'
            callback(error)
          }
        })

        const isPhy = domain === 'phy'
        const ep = isPhy ? `phy-drives/${driveUUID}` : `drives/${driveUUID}/dirs/${dirUUID}/entries/${entry.uuid}`
        const qs = isPhy ? { path: `${dirUUID}${entry.name}` } : { name: entry.name, hash: entry.hash }
        const handle = new DownloadFile(ep, qs, entry.name, entry.size, entry.seek, stream, entry.station, (error) => {
          debug('donwload handle finish', entry.name, task.reqHandles.indexOf(handle))
          task.reqHandles.splice(task.reqHandles.indexOf(handle), 1)
          if (error) callback(error)
        })
        task.reqHandles.push(handle)
        handle.download()
      }
    })

    this.rename = new Transform({
      name: 'rename',
      concurrency: 4,
      isBlocked: () => this.paused,
      transform: (x, callback) => {
        const { entry, downloadPath, dirUUID, driveUUID, domain, task } = x
        fs.rename(entry.tmpPath, entry.downloadPath, (error) => {
          callback(error, { entry, downloadPath, dirUUID, driveUUID, domain, task })
        })
      }
    })

    this.readRemote.pipe(this.diff).pipe(this.download).pipe(this.rename)

    this.readRemote.on('data', (x) => {
      const { task, entry } = x
      task.finishCount += 1
      entry.finished = true
      if (task.count === task.finishCount) {
        this.finish()
      }
      task.updateStore()
      sendMsg()
    })

    this.readRemote.on('step', () => {
      /* retry, if upload error && response status !== EEXIST && retry times < 2 */
      for (let i = this.download.failed.length - 1; i > -1; i--) {
        const x = this.download.failed[i]
        console.log('failed x', x)
        if (x.retry < 2) {
          x.retry += 1
          x.task.download.pending.push(x)
          x.task.download.failed.splice(i, 1)
          x.task.download.schedule()
        }
      }

      const preLength = this.errors.length
      this.errors.length = 0
      const pipes = ['readRemote', 'diff', 'download', 'rename']
      pipes.forEach((p) => {
        if (!this[p].failed.length) return
        this[p].failed.forEach((x) => {
          if (Array.isArray(x)) {
            x.forEach(c => this.errors.push(Object.assign({ pipe: p }, c, { task: c.task.uuid, type: c.entry && c.entry.type })))
          } else this.errors.push(Object.assign({ pipe: p }, x, { task: x.task.uuid, type: x.entry && x.entry.type }))
        })
      })
      if (this.errors.length !== preLength) this.updateStore()
      if (this.errors.length > 15 || (this.readRemote.isStopped() && this.errors.length)) {
        this.paused = true
        clearInterval(this.countSpeed)
        this.state = 'failed'
        this.updateStore()
        taskSchedule('download')
        sendMsg()
      }
    })
  }

  run () {
    this.paused = false
    this.countSpeed = setInterval(this.countSpeedFunc, 1000)
    this.readRemote.push({
      entries: this.entries,
      downloadPath: this.downloadPath,
      dirUUID: this.dirUUID,
      driveUUID: this.driveUUID,
      domain: this.domain,
      task: this
    })
  }

  status () {
    return Object.assign({}, this.props, {
      completeSize: this.completeSize,
      lastTimeSize: this.lastTimeSize,
      count: this.count,
      finishCount: this.finishCount,
      finishDate: this.finishDate,
      paused: this.paused,
      restTime: this.restTime,
      size: this.size,
      speed: this.speed,
      lastSpeed: this.lastSpeed,
      state: this.state,
      errors: this.errors,
      domain: this.domain,
      trsType: this.trsType,
      waiting: this.waiting
    })
  }

  createStore () {
    if (!this.isNew) return
    global.DB.save(this.uuid, this.status(), err => err && console.error(this.name, 'createStore error: ', err))
  }

  updateStore () {
    if (!this.WIP && !this.storeUpdated) {
      this.WIP = true
      global.DB.save(this.uuid, this.status(), err => err && console.error(this.name, 'createStore error: ', err))
      this.storeUpdated = true
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
    this.readRemote.clear()
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
    this.readRemote.clear()
    this.reqHandles.forEach(h => h.abort())
    clearInterval(this.countSpeed)
    this.state = 'finished'
    this.finishDate = (new Date()).getTime()
    this.updateStore()
    taskSchedule('download')
    sendMsg()
    let name = this.name || ''
    if (name.length > 20) name = name.slice(0, 20).concat('...')
    if (this.entries.length > 1) name = name.concat(i18n.__('And Other %s Items', this.entries.length))
    getMainWindow().webContents.send('snackbarMessage', { message: i18n.__('%s Download Finished', name) })
  }
}

const createTask = (uuid, entries, name, dirUUID, driveUUID, taskType, createTime, isNew, downloadPath, domain, preStatus) => {
  const task = new Task({ uuid, entries, name, dirUUID, driveUUID, taskType, createTime, isNew, downloadPath, domain })
  Tasks.push(task)
  task.createStore()
  if (preStatus) Object.assign(task, preStatus, { isNew: false, paused: true, speed: 0, restTime: 0 })
  else if (Tasks.filter(t => !t.paused && t.state !== 'finished' && t.trsType === 'download').length < 5) task.run()
  else task.wait(true)
  sendMsg()
}

module.exports = { createTask }
