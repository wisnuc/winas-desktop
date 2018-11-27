const i18n = require('i18n')
const UUID = require('uuid')
const path = require('path')
const Promise = require('bluebird')
const sanitize = require('sanitize-filename')
const { ipcMain } = require('electron')
const fs = Promise.promisifyAll(require('original-fs')) // eslint-disable-line

const { getMainWindow } = require('./window')
const { createTask } = require('./uploadTransform')

class BackUp {
  constructor (props) {
    this.props = props
    Object.assign(this, props)
    this.state = 'Idle'
  }

  readDir (dir, task) {
  }
}

const readUploadInfoAsync = async (entries, dirUUID, driveUUID, domain) => {
  /* remove unsupport files */
  let taskType = ''
  const filtered = []
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const name = path.parse(entry).base
    const stat = await fs.lstatAsync(path.resolve(entry))
    const entryType = stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : 'others'
    /* only upload directory or file, ignore others, such as symbolic link */
    if (entryType !== 'others' && (name === sanitize(name))) {
      if (!taskType) taskType = entryType
      filtered.push({ entry, name, stat, entryType })
    }
  }

  /* createTask */
  if (filtered.length) {
    const policies = []
    const newEntries = filtered.map((f, i) => {
      const mode = 'overwrite'
      const checkedName = mode === 'rename' ? f.checkedName : undefined
      policies[i] = { mode, checkedName, remoteUUID: f.remoteUUID }
      return f.entry
    })
    const taskUUID = UUID.v4()
    const createTime = (new Date()).getTime()
    const newWork = true
    createTask(taskUUID, newEntries, dirUUID, driveUUID, taskType, createTime, newWork, policies, domain)
  }
  return filtered.length
}

const readUploadInfo = (entries, dirUUID, driveUUID, domain) => {
  readUploadInfoAsync(entries, dirUUID, driveUUID, domain)
    .then((count) => {
      let message = i18n.__n('%s Add to Transfer List', count)
      if (count < entries.length) message = `${message} (${i18n.__n('%s Ignore Upload Text', entries.length - count)})`
      getMainWindow().webContents.send('snackbarMessage', { message })
    })
    .catch((e) => {
      console.error('readUploadInfo error: ', e)
      if (e.code === 'ECONNREFUSED') {
        getMainWindow().webContents.send('snackbarMessage', { message: i18n.__('Connection Lost') })
      } else if (e.message !== 'cancel') {
        getMainWindow().webContents.send('snackbarMessage', { message: i18n.__('Read Upload Failed') })
      }
    })
}

const read = async (dirs, task, parent) => {
  for (let i = 0; i < dirs.length; i++) {
    const dir = dirs[i]
    let stat = null
    try {
      stat = await fs.lstatAsync(path.resolve(dir.entry))
    } catch (e) {
      console.error('lstat error', e)
      stat = null
    }
    if (!stat) continue
    if (stat.mtimeMs > task.latestMtime) task.latestMtime = stat.mtimeMs
    let children = []
    try {
      children = await fs.readdirAsync(path.resolve(dir.entry), { withFileTypes: true })
    } catch (e) {
      console.error('readdir error', e)
      children = []
    }
    task.count += children.length
    task.dirCount += 1
    const newDirs = children.filter(d => d.isDirectory()).map((d) => {
      d.entry = path.join(dir.entry, d.name)
      return d
    })
    const node = { entry: dir.entry, children: [], mtime: stat.mtimeMs, ctime: stat.ctimeMs }
    parent.children.push(node)
    await read(newDirs, task, node)
  }
  return ({ dirs, task })
}

const backupHandle = (event, args) => {
  const { id, driveUUID, dirUUID, localPath } = args
  console.log('backupHandle', args)
  let lastLatestMtime = 0
  const t = { dirCount: 0, count: 0, id, timeStamp: new Date().getTime(), children: [], latestMtime: 0 }
  read([{ entry: localPath }], t, t).then(({ dirs, task }) => {
    event.sender.send('BACKUP_STAT', { dirs, task })
    if (task.latestMtime > lastLatestMtime) {
      console.log(dirs, task)
      lastLatestMtime = task.latestMtime
      // readUploadInfo([localPath], driveUUID, dirUUID, 'backup')
    } else {
      console.log('no need to backup')
    }
    console.log('cost:', new Date().getTime() - t.timeStamp)
  }).catch(e => console.error(e))
}

ipcMain.on('BACKUP', backupHandle)

module.exports = BackUp
