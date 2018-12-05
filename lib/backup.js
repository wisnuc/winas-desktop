const path = require('path')
const Promise = require('bluebird')
const sanitize = require('sanitize-filename')
const { ipcMain } = require('electron')
const fs = Promise.promisifyAll(require('original-fs')) // eslint-disable-line

const Task = require('./backupTransform')
const { updateBackupDir, serverGetAsync, createBackupDirAsync } = require('./server')

let instance = null

class Backup {
  constructor (drive, dirs) {
    this.drive = drive
    this.dirs = dirs
    this.status = 'Idle'
    this.lastLatestMtime = 0
    this.watchers = []

    this.checkTopDirAsync = async (entries, drv) => {
      const [driveUUID, dirUUID] = [drv.uuid, drv.uuid]
      const ep = `drives/${driveUUID}/dirs/${dirUUID}`
      const listNav = await serverGetAsync(ep, null)
      const remoteTopDirs = listNav.entries
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
          // TODO update remote topDir
          backupDir.push({ driveUUID, dirUUID: remoteEntry.uuid, entries: newEntries })
        } else {
          const attr = {
            bctime: stat.ctime.getTime(),
            bmtime: stat.mtime.getTime(),
            metadata: {
              localPath: entry
            }
          }
          const res = await createBackupDirAsync(driveUUID, dirUUID, name, attr)
          backupDir.push({ driveUUID, dirUUID: res.uuid, entries: newEntries })
        }
      }

      // TODO archive localDeleted remoteTopDirs
      return backupDir
    }
  }

  start () {
    this.startMonitor()
    this.status = 'Idle'
    this.dirty = true
    this.run()
  }

  checkTopDir (entries, drive, cb) {
    const filtered = []

    let count = entries.length
    const done = () => !(count -= 1) && cb()

    /* Check entries: directory with a valid name */
    entries.forEach((entry) => {
      const name = path.parse(entry).base
      fs.lstat(path.resolve(entry), (err, stat) => {
        if (err || !stat) {
          /* ignore error TODO */
          console.error('lstat error', err)
          done()
        } else {
          /* only upload directory or file, ignore others, such as symbolic link */
          if (stat.isDirectory() && (name === sanitize(name))) {
            filtered.push(entry)
          }
          done()
        }
      })
    })
  }

  run () {
    if (this.status !== 'Idle' || !this.dirty) return // run when (dirty && status === 'Idle')
    this.status = 'running'
    this.dirty = false
    const purePaths = this.dirs.map(d => d.metadata.localPath)

    this.checkTopDirAsync(purePaths, this.drive).then((backupDir) => {
      this.backup(backupDir, (error) => {
        if (!error) {
          console.log('upload success')
          updateBackupDir(this.drive, { lastBackupTime: new Date().getTime() }, () => console.log('update backup dir success'))
        }
        this.status = 'Idle'
        this.run()
      })
    }).catch((e) => {
      console.error('checkTopDir error', e)
    })
  }

  startMonitor () {
    this.dirs.forEach((dir) => {
      const watcher = fs.watch(path.resolve(dir.metadata.localPath), { recursive: true }, () => {
        this.dirty = true
        this.run()
      })
      this.watchers.push(watcher)
    })
  }

  removeMonitor () {
    this.watchers.forEach(w => w && typeof w.close === 'function' && w.close())
    this.watchers.length = 0
  }

  backup (backupDir, cb) {
    const { driveUUID, dirUUID, entries } = backupDir[0]
    this.task = new Task(entries, driveUUID, dirUUID, (errors, warnings) => {
      console.log('backup task res', errors, warnings)
      this.task = null
      cb()
    })

    this.task.run()
  }

  scan (dirs, drive) {
    const t = { dirCount: 0, count: 0, timeStamp: new Date().getTime(), children: [], latestMtime: 0 }
    const entries = dirs.map(d => ({ entry: d.localPath }))
    this.read(entries, t, t, (task) => {
      // event.sender.send('BACKUP_STAT', task)
      if (task.latestMtime > this.lastLatestMtime) {
        // console.log(task)
        this.lastLatestMtime = task.latestMtime
        const purePaths = dirs.map(d => d.localPath)
        this.readUploadInfo(purePaths, drive.uuid, drive.uuid, 'backup')
        setTimeout(() => (this.status = 'Idle'), 10 * 1000)
      } else {
        this.status = 'Idle'
        console.log('no need to backup')
      }
      console.log('cost:', new Date().getTime() - t.timeStamp)
    })
  }

  read (dirs, task, parent, cb) {
    let count = dirs.length
    if (!count) cb(task)
    const countDown = () => {
      count -= 1
      if (!count) cb(task)
    }
    dirs.forEach((dir) => {
      fs.lstat(path.resolve(dir.entry), (err, stat) => {
        if (err || !stat) {
          countDown()
          return
        }
        if (stat.mtimeMs > task.latestMtime) task.latestMtime = stat.mtimeMs
        fs.readdir(path.resolve(dir.entry), { withFileTypes: true }, (e, children) => {
          if (e || !Array.isArray(children)) {
            countDown()
            return
          }
          task.count += children.length
          task.dirCount += 1
          const newDirs = children.filter(d => d.isDirectory()).map((d) => {
            d.entry = path.join(dir.entry, d.name)
            return d
          })
          const node = { entry: dir.entry, children: [], mtime: stat.mtimeMs, ctime: stat.ctimeMs }
          parent.children.push(node)
          this.read(newDirs, task, node, countDown)
        })
      })
    })
  }

  updateDirs (dirs) {
    console.log('updateDirs', dirs)
    this.removeMonitor()
    this.dirs = dirs
    this.start()
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

ipcMain.on('BACKUP_DIR', onBackupDir)

module.exports = Backup
