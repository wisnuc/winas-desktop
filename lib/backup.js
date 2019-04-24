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
  if (!(restTime > 0) || restTime > 259200) return i18n.__('Calculating Rest Time')
  const hour = Math.floor(restTime / 3600)
  const minute = Math.ceil((restTime - hour * 3600) / 60)
  if (!hour) return i18n.__('Rest Time By Minute %s', minute)
  return i18n.__('Rest Time By Hour And Minute %s, %s', hour, minute)
}

let currentErrors = []
let currentWarnings = []

class Backup {
  constructor (drive, dirs) {
    this.drive = drive
    this.dirs = dirs
    this.status = 'Idle'
    this.watchers = []
    this.Tasks = []
    this.lastTenData = []
    // times of retry
    this.retryCount = 0

    this.checkTopDirAsync = async (entries, drv) => {
      const [driveUUID, dirUUID] = [drv.uuid, drv.uuid]
      const ep = `drives/${driveUUID}/dirs/${dirUUID}`
      const listNav = await serverGetAsync(ep, null)
      // contain deleted or disabled top dir
      // const remoteTopDirs = listNav.entries.filter(e => !e.deleted && e.metadata && !e.metadata.disabled)
      const remoteTopDirs = listNav.entries
      const backupDir = []
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        const name = path.parse(entry).base
        const localPath = path.resolve(entry)
        let stat = null
        let children = []
        try {
          stat = await fs.lstatAsync(localPath)
          children = await fs.readdirAsync(localPath)
        } catch (e) {
          console.warn('read local file error', e)
          currentErrors.push({ pipe: 'checkTopDir', entry, error: { code: 'ENOBDIR' }, name, type: 'directory' })
          continue
        }
        const newEntries = children.map(c => path.join(entry, c))
        const remoteEntry = remoteTopDirs.find(e => e.metadata && e.metadata.localPath === localPath)
        if (remoteEntry) {
          const { uuid } = remoteEntry
          const args = {
            archived: false,
            op: 'updateAttr',
            bctime: stat.birthtime.getTime(),
            bmtime: stat.mtime.getTime(),
            metadata: {
              disabled: false,
              localPath: entry,
              status: 'Working'
            }
          }
          const lastBackupTime = remoteEntry.metadata && remoteEntry.metadata.lastBackupTime
          await updateBackupDirsOrFilesAsync(driveUUID, dirUUID, [{ bname: uuid, args }])
          backupDir.push({ driveUUID, dirUUID: uuid, entries: newEntries, localPath: entry, lastBackupTime })
        } else {
          const attr = {
            bctime: stat.birthtime.getTime(),
            bmtime: stat.mtime.getTime(),
            metadata: {
              localPath: entry
            }
          }
          const res = await createBackupDirAsync(driveUUID, dirUUID, name, attr)
          backupDir.push({ driveUUID, dirUUID: res.uuid, entries: newEntries, localPath: entry })
          getMainWindow().webContents.send('driveListUpdate', { uuid: driveUUID })
        }
      }

      /* TODO
      // archive localDeleted remoteTopDirs
      if (lackDirs.size) {
        const lackEntries = [...lackDirs].map(d => ({ bname: d.name, args: { op: 'updateAttr', archived: true } }))
        await updateBackupDirsOrFilesAsync(driveUUID, dirUUID, lackEntries)
      }
      */
      getMainWindow().webContents.send('updateBackupRoot')
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

  retry () {
    this.retryCount += 1
    console.warn('Backup Failed, retry', 1000 * 60 * this.retryCount ** 2, 'ms later')
    this.status = 'Failed'
    this.dirty = true
    this.retryTimer = setTimeout(() => this.run(), 1000 * 60 * this.retryCount ** 2) // retry later
  }

  run () {
    if (this.status === 'Working' || !this.dirty) return // run when (dirty && status !== 'Working')
    clearTimeout(this.retryTimer)
    this.Tasks.length = 0
    this.status = 'Working'
    this.dirty = false
    this.hasFileUpload = false
    currentWarnings.length = 0
    currentErrors.length = 0
    // no drive or topDirs
    if (!this.drive || !this.dirs.length || this.drive.client.disabled) {
      this.status = 'Idle'
      return
    }
    const purePaths = this.dirs.map(d => d.metadata.localPath)
    if (!purePaths.length) {
      this.status = 'Idle'
      this.run()
      return
    }

    updateBackupDrive(this.drive, { status: 'Working' }, (er, res) => {
      if (er) {
        console.error('update BackupDrive error, try later')
        this.retry()
        return
      }
      const lbt = res.client.lastBackupTime
      this.checkTopDirAsync(purePaths, this.drive).then((backupDir) => {
        if (!backupDir.length) { // no avaliable backupDir
          this.status = 'Idle'
          return
        }
        this.backup(backupDir, (errorList, warningList) => {
          if (this.isAborted) return // aborted, no thing to do
          if (Array.isArray(errorList) && errorList.length) { // Backup Failed
            updateBackupDrive(this.drive, { status: 'Failed' }, (err, drive) => {
              if (err || !drive) console.error('Failed to update backup drive to Idle')
              else this.drive = drive
              this.retry()
            })
            // update currentErrors for notification
            currentErrors = errorList
          } else {
            // update currentErrors and currentWarnings for notification
            if (Array.isArray(warningList) && warningList) currentWarnings = warningList

            this.lastBackupTime = (this.hasFileUpload || !lbt) ? new Date().getTime() : lbt
            updateBackupDrive(this.drive, { status: 'Idle', lastBackupTime: this.lastBackupTime }, (err, drive) => {
              if (err || !drive) console.error('Failed to update backup drive to Idle')
              else this.drive = drive
              console.log('Backup Idle in backup callback')
              this.status = 'Idle'
              setTimeout(() => this.run(), 1000) // 1 second later
            })
          }
          getMainWindow().webContents.send('BACKUP_RES', { currentErrors, currentWarnings })
        })
      }).catch((e) => {
        console.error('checkTopDir error', e)
        this.retry()
      })
    })
  }

  startMonitor () {
    this.dirs.forEach((dir) => {
      let watcher
      try {
        watcher = fs.watch(path.resolve(dir.metadata.localPath), { recursive: true }, () => {
          this.dirty = true
          setTimeout(() => this.run(), 0) // start backup 3s later
        })
      } catch (e) {
        console.warn('watch file error', e)
        return
      }
      this.watchers.push(watcher)
    })

    // calc rest time of backup
    this.lastTenData.length = 0
    this.startTime = new Date().getTime()
    let restTime = -1
    let lastRestTime = -1
    let beforeLastRestTime = -1
    this.timer = setInterval(() => {
      const data = this.summary()
      this.lastTenData.unshift(data)
      if (this.lastTenData.length > 10) this.lastTenData.length = 10
      if (this.lastTenData.length === 10) {
        const deltaSize = this.lastTenData[0].completeSize - this.lastTenData[9].completeSize
        const restTimeBySize = (data.size - data.completeSize) / deltaSize * 10

        const deltaCount = this.lastTenData[0].finishCount - this.lastTenData[9].finishCount
        const restTimeByCount = (data.count - data.finishCount) / deltaCount * 10

        const usedTime = (new Date().getTime() - this.startTime) / 1000
        const restTimeByAllSize = data.size * usedTime / data.completeSize - usedTime
        const restTimeByAllCount = data.count * usedTime / data.finishCount - usedTime

        /* combine of restime by different method */
        restTime = Math.max(Math.min(restTimeBySize, restTimeByCount), restTimeByAllSize + restTimeByAllCount)

        /* average of the last 3 restTime */
        if (lastRestTime < 0 || beforeLastRestTime < 0) {
          lastRestTime = restTime
          beforeLastRestTime = restTime
        }
        restTime = (beforeLastRestTime + lastRestTime + restTime) / 3

        beforeLastRestTime = lastRestTime
        lastRestTime = restTime

        // console.log('restTime >>', restTime, restTimeBySize, restTimeByCount, restTimeByAllSize, restTimeByAllCount)
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
    const { entries, driveUUID, dirUUID, localPath, lastBackupTime } = topDir
    const task = new Task(entries, driveUUID, dirUUID, (errors, warnings) => {
      if (!this.isAborted && !errors.length) {
        // change lastBackupTime when any files uploaded
        const args = {
          op: 'updateAttr',
          metadata: {
            localPath,
            disabled: false,
            status: 'Idle',
            lastBackupTime: (task.hasFileUpload || !lastBackupTime) ? new Date().getTime() : lastBackupTime
          }
        }
        this.hasFileUpload = this.hasFileUpload || task.hasFileUpload // check if any file uploaded
        updateBackupDirsOrFiles(
          driveUUID,
          driveUUID,
          [{ bname: dirUUID, args }],
          err => err && console.error('update topDir error', err)
        )
        getMainWindow().webContents.send('driveListUpdate', { uuid: driveUUID })
      }
      cb(errors, warnings)
    })
    this.Tasks.push(task)
    task.run()
  }

  backup (backupDir, cb) {
    let i = backupDir.length
    const errorList = []
    const warningList = []
    const done = (errors, warnings) => {
      if (this.isAborted) cb()
      i -= 1
      errorList.push(...errors)
      warningList.push(...warnings)
      if (i === 0) cb(errorList, warningList)
    }
    backupDir.forEach((dir) => {
      this.createTask(dir, done)
    })
  }

  summary () {
    let [count, finishCount, size, completeSize] = [0, 0, 0, 0]
    this.Tasks.forEach((t) => {
      // to fix finishCount > count or completeSize > size, or any < 0
      count += Math.max(t.count, t.finishCount, 0)
      finishCount += Math.max(t.finishCount, 0)
      size += Math.max(t.size, t.completeSize, 0)
      completeSize += Math.max(t.completeSize, 0)
    })
    return ({ count, finishCount, size, completeSize, status: this.status, lastBackupTime: this.lastBackupTime, drive: this.drive })
  }

  updateDirs (drive, dirs) {
    this.abort()
    setImmediate(() => {
      this.isAborted = false
      this.drive = drive
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
  const { drive } = args
  const dirs = args.dirs.filter(d => !d.deleted && d.metadata && !d.metadata.disabled)
  if (!instance) {
    instance = new Backup(drive, dirs)
    instance.start()
  } else {
    instance.updateDirs(drive, dirs)
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
        const entries = dirs.entries.filter(e => !e.deleted && e.metadata && !e.metadata.disabled)
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

const onBackupReq = (event) => {
  event.sender.send('BACKUP_RES', { currentErrors, currentWarnings })
}

ipcMain.on('BACKUP_DIR', onBackupDir)
ipcMain.on('BACKUP_REQ', onBackupReq)
ipcMain.on('LOGIN', () => setTimeout(startBackup, 1000))
ipcMain.on('LOGOUT', () => setImmediate(stopBackup))
ipcMain.on('COMMAND', onCommand)

instance = new Backup(null, [])
instance.start()

module.exports = Backup
