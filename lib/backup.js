const i18n = require('i18n')
const path = require('path')
const Promise = require('bluebird')
const { ipcMain, webContents } = require('electron')
const fs = Promise.promisifyAll(require('original-fs')) // eslint-disable-line

const { getMainWindow } = require('./window')
const Task = require('./backupTransform')
const { updateBackupDrive, serverGet, serverGetAsync, createBackupDirAsync, updateBackupDirsOrFiles, updateBackupDirsOrFilesAsync, createBackupDrive } = require('./server')

let instance = null

const getLocaleRestTime = (restTime) => {
  if (!(restTime > 0)) return i18n.__('Calculating Rest Time')
  const hour = Math.floor(restTime / 3600)
  const minute = Math.ceil((restTime - hour * 3600) / 60)
  if (!hour) return i18n.__('Rest Time By Minute %s', minute)
  return i18n.__('Rest Time By Hour And Minute %s, %s', hour, minute)
}

class Backup {
  constructor (drive, dirs) {
    this.drive = drive
    this.dirs = dirs
    this.status = 'Idle'
    this.watchers = []
    this.Tasks = []
    this.lastTenData = []

    this.checkTopDirAsync = async (entries, drv) => {
      const [driveUUID, dirUUID] = [drv.uuid, drv.uuid]
      const ep = `drives/${driveUUID}/dirs/${dirUUID}`
      const listNav = await serverGetAsync(ep, null)
      const remoteTopDirs = listNav.entries.filter(e => !e.deleted || (e.metadata && !e.metadata.disabled))
      const backupDir = []
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        const name = path.parse(entry).base
        const localPath = path.resolve(entry)
        const stat = await fs.lstatAsync(localPath)
        const children = await fs.readdirAsync(localPath)
        const newEntries = children.map(c => path.join(entry, c))
        const remoteEntry = remoteTopDirs.find(e => e.metadata && e.metadata.localPath === localPath)
        if (remoteEntry) {
          const { uuid } = remoteEntry
          const args = {
            archived: false,
            op: 'updateAttr',
            bctime: stat.ctime.getTime(),
            bmtime: stat.mtime.getTime(),
            metadata: {
              disabled: false,
              localPath: entry,
              status: 'Working'
            }
          }
          await updateBackupDirsOrFilesAsync(driveUUID, dirUUID, [{ bname: uuid, args }])
          backupDir.push({ driveUUID, dirUUID: uuid, entries: newEntries, localPath: entry })
        } else {
          const attr = {
            bctime: stat.ctime.getTime(),
            bmtime: stat.mtime.getTime(),
            metadata: {
              localPath: entry
            }
          }
          const res = await createBackupDirAsync(driveUUID, dirUUID, name, attr)
          backupDir.push({ driveUUID, dirUUID: res.uuid, entries: newEntries, localPath: entry })
        }
      }

      /* TODO
      // archive localDeleted remoteTopDirs
      if (lackDirs.size) {
        const lackEntries = [...lackDirs].map(d => ({ bname: d.name, args: { op: 'updateAttr', archived: true } }))
        await updateBackupDirsOrFilesAsync(driveUUID, dirUUID, lackEntries)
      }
      */
      return backupDir
    }
  }

  start () {
    this.startMonitor()
    this.status = 'Idle'
    this.dirty = true
    this.isAborted = false
    this.run()
  }

  run () {
    if (this.status !== 'Idle' || !this.dirty) return // run when (dirty && status === 'Idle')
    this.Tasks.length = 0
    this.status = 'running'
    this.dirty = false
    // no drive or topDirs
    if (!this.drive || !this.dirs.length || this.drive.client.disabled) {
      this.status = 'Idle'
      return
    }
    const purePaths = this.dirs.filter(d => !d.metadata.disabled).map(d => d.metadata.localPath)
    if (!purePaths.length) {
      this.status = 'Idle'
      this.run()
      return
    }

    updateBackupDrive(this.drive, { status: 'Working' }, () => console.log('Backup Working'))
    this.checkTopDirAsync(purePaths, this.drive).then((backupDir) => {
      this.backup(backupDir, (error) => {
        if (this.isAborted) return // aborted, no thing to do
        if (!error) {
          this.lastBackupTime = new Date().getTime()
          updateBackupDrive(this.drive, { status: 'Idle', lastBackupTime: this.lastBackupTime }, (err, drive) => {
            if (err || !drive) console.error('Failed to update backup drive to Idle')
            else this.drive = drive
            console.log('Backup Idle')
          })
        } else console.error('backup error', error)
        this.status = 'Idle'
        setTimeout(() => this.run(), 1000) // 1 second later
      })
    }).catch((e) => {
      console.error('checkTopDir error', e)
    })
  }

  startMonitor () {
    this.dirs.forEach((dir) => {
      const watcher = fs.watch(path.resolve(dir.metadata.localPath), { recursive: true }, () => {
        this.dirty = true
        setTimeout(() => this.run(), 3 * 1000) // start backup 3s later
      })
      this.watchers.push(watcher)
    })
    this.lastTenData.length = 0
    this.startTime = new Date().getTime()
    this.timer = setInterval(() => {
      const data = this.summary()
      this.lastTenData.unshift(data)
      if (this.lastTenData.length > 10) this.lastTenData.length = 10
      let restTime = -1
      let lastRestTime = -1
      let beforeLastRestTime = -1
      if (this.lastTenData.length === 10) {
        const deltaSize = this.lastTenData[0].completeSize - this.lastTenData[9].completeSize
        const restTimeBySize = (data.size - data.completeSize) / deltaSize * 10

        const deltaCount = this.lastTenData[0].finishCount - this.lastTenData[9].finishCount
        const restTimeByCount = (data.count - data.finishCount) / deltaCount * 10

        const usedTime = (new Date().getTime() - this.startTime) / 1000
        const restTimeByAllSize = data.size * usedTime / data.completeSize - usedTime
        const restTimeByAllCount = data.count * usedTime / data.finishCount - usedTime

        /* minimum of restime by different method */
        restTime = Math.min(restTimeBySize, restTimeByAllSize, restTimeByAllCount, restTimeByCount)

        /* average of last 3 restTime */
        restTime = (beforeLastRestTime + lastRestTime + restTime) / 3
        beforeLastRestTime = lastRestTime
        lastRestTime = restTime
      }
      const bProgress = data.count ? `${data.finishCount || 0}/${data.count}` : '--/--'
      const args = { restTime: getLocaleRestTime(restTime), bProgress, ...data }
      webContents.getAllWebContents().forEach(contents => contents.send('BACKUP_MSG', args))
    }, 1000)
  }

  removeMonitor () {
    this.watchers.forEach(w => w && typeof w.close === 'function' && w.close())
    this.watchers.length = 0
    clearInterval(this.timer)
  }

  createTask (topDir, cb) {
    const { entries, driveUUID, dirUUID, localPath } = topDir
    const task = new Task(entries, driveUUID, dirUUID, (errors, warnings) => {
      const args = {
        op: 'updateAttr',
        metadata: {
          localPath,
          disabled: false,
          status: 'Idle',
          lastBackupTime: new Date().getTime()
        }
      }
      updateBackupDirsOrFiles(driveUUID, driveUUID, [{ bname: dirUUID, args }], err => err && console.error('update topDir error', err))
      getMainWindow().webContents.send('driveListUpdate', { uuid: driveUUID })
      console.log('status:\n', task.status())
      cb()
    })
    this.Tasks.push(task)
    task.run()
  }

  backup (backupDir, cb) {
    let i = backupDir.length

    const done = () => {
      if (this.isAborted) cb(Error('Aborted'))
      i -= 1
      if (i === 0) cb()
    }
    backupDir.forEach((dir) => {
      this.createTask(dir, done)
    })
  }

  summary () {
    let [count, finishCount, size, completeSize] = [0, 0, 0, 0]
    this.Tasks.forEach((t) => {
      count += t.count
      finishCount += t.finishCount
      size += t.size
      completeSize += t.completeSize
    })
    return ({ count, finishCount, size, completeSize, status: this.status, lastBackupTime: this.lastBackupTime, drive: this.drive })
  }

  updateDirs (dirs) {
    this.abort()
    setImmediate(() => {
      this.isAborted = false
      this.dirs = dirs
      this.start()
    })
  }

  abort () {
    this.isAborted = true
    this.removeMonitor()
    this.Tasks.forEach(t => t.finish())
    this.Tasks.length = 0
  }
}

const onBackupDir = (event, args) => {
  const { drive, dirs } = args
  if (!instance) {
    instance = new Backup(drive, dirs)
    instance.start()
  } else {
    instance.updateDirs(dirs)
  }
}

const startBackup = () => {
  serverGet('drives', null, (error, drives) => {
    if (error) return // TODO
    const machineId = global.configuration.machineId.slice(-8)
    const drive = drives.find(d => d.type === 'backup' && d.client && (d.client.id === machineId))
    if (drive) {
      serverGet(`drives/${drive.uuid}/dirs/${drive.uuid}/`, null, (err, dirs) => {
        if (err) return
        const entries = dirs.entries.filter(e => !e.deleted)
        if (entries && entries.length) {
          if (instance) instance.abort()
          instance = new Backup(drive, entries)
          instance.start()
        }
      })
    }
  })
}

const stopBackup = () => {
  console.log('stop backup')
  if (instance) instance.abort()
}

const onCommand = (event, name, args) => {
  const onRes = (session, err, res) => {
    event.sender.send('COMMAND_RES', { session, err, res })
  }
  switch (name) {
    case 'createBackupDrive':
      createBackupDrive((err, res) => onRes(args.session, err, res))
      break
    case 'updateBackupDrive':
      updateBackupDrive(args.drive, args.attr, (err, res) => {
        if (instance) {
          instance.abort()
          instance.drive = res
          instance.start()
        }
        onRes(args.session, err, res)
      })
      break
    default:
      break
  }
}

ipcMain.on('BACKUP_DIR', onBackupDir)
ipcMain.on('LOGIN', () => setImmediate(startBackup))
ipcMain.on('LOGOUT', () => setImmediate(stopBackup))
ipcMain.on('COMMAND', onCommand)

instance = new Backup(null, [])
instance.start()

module.exports = Backup
