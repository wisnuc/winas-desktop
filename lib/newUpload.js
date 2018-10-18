const i18n = require('i18n')
const path = require('path')
const UUID = require('uuid')
const Promise = require('bluebird')
const sanitize = require('sanitize-filename')
const { dialog, ipcMain } = require('electron')
const fs = Promise.promisifyAll(require('original-fs')) // eslint-disable-line

const { getMainWindow } = require('./window')
const { createTask } = require('./uploadTransform')
const { serverGetAsync, uploadFirm } = require('./server')

/*
  policy: { uuid, promise }
*/

const Policies = []

const choosePolicy = (conflicts) => {
  const session = UUID.v4()
  const promise = new Promise((resolve, reject) => {
    Policies.push({ session, resolve: value => resolve(value), reject: error => reject(error) })
    getMainWindow().webContents.send('conflicts', { session, conflicts })
  })
  return promise
}

const resolveHandle = (event, args) => {
  const index = Policies.findIndex(p => p.session === args.session)
  if (index < 0) throw Error('no such session !')
  if (args.response) return Policies[index].resolve(args.response)
  return Policies[index].reject(Error('cancel'))
}

const readUploadInfoAsync = async (entries, dirUUID, driveUUID, domain) => {
  /* remove unsupport files */
  let taskType = ''
  const filtered = []
  const nameSpace = []
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const name = path.parse(entry).base
    nameSpace.push(name)
    const stat = await fs.lstatAsync(path.resolve(entry))
    const entryType = stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : 'others'
    /* only upload directory or file, ignore others, such as symbolic link */
    if (entryType !== 'others' && (name === sanitize(name))) {
      if (!taskType) taskType = entryType
      filtered.push({ entry, name, stat, entryType })
    }
  }

  const isPhy = domain === 'phy' // phyDrvie or normal drive

  const ep = isPhy ? `phy-drives/${driveUUID}` : `drives/${driveUUID}/dirs/${dirUUID}`
  const qs = isPhy ? { path: dirUUID } : null

  const listNav = await serverGetAsync(ep, qs)
  const remoteEntries = isPhy ? listNav : listNav.entries

  nameSpace.push(...remoteEntries.map(e => e.name))
  const conflicts = []
  for (let i = 0; i < filtered.length; i++) {
    const { entry, entryType, name, stat } = filtered[i]
    const index = remoteEntries.findIndex(e => (e.name === name))
    if (index > -1) {
      let checkedName = name
      const extension = path.parse(name).ext
      for (let j = 1; nameSpace.includes(checkedName); j++) {
        if (!extension || extension === name) {
          checkedName = `${name}(${j})`
        } else {
          checkedName = `${path.parse(name).name}(${j})${extension}`
        }
      }
      conflicts.push({ entry, entryType, name, checkedName, stat, remote: remoteEntries[index] })
    }
  }

  /*  sort conflicts by order of following:
   *
   *  directory => directory: 1
   *  directory => file: 2
   *  file => directory: 3
   *  file => file: 4
   *
   */
  const typeCheck = (c) => {
    if (c.entryType === 'directory' && c.remote.type === 'directory') return 1
    if (c.entryType === 'directory' && c.remote.type === 'file') return 2
    if (c.entryType === 'file' && c.remote.type === 'directory') return 3
    if (c.entryType === 'file' && c.remote.type === 'file') return 4
    return 5 // error ?
  }
  conflicts.forEach(c => (c.type = typeCheck(c)))
  conflicts.sort((a, b) => (a.type - b.type))

  // conflicts.length = 0

  /* wait user to choose policy
   *
   * cancel: cancel all uploading
   * skip: skip specific entry
   * rename: need a checkedName
   * replace: need remote target's uuid
   * merge: using mkdirp when create directory
   *
   */
  if (conflicts.length) {
    const response = await choosePolicy(conflicts)
    conflicts.forEach((c, i) => {
      const res = response[i]
      const index = filtered.findIndex(f => (f.entry === c.entry))
      if (res === 'skip') {
        filtered.splice(index, 1)
      } else {
        filtered[index].policy = res
        filtered[index].remoteUUID = c.remote.uuid
        filtered[index].checkedName = c.checkedName
      }
    })
  }

  /* createTask */
  if (filtered.length) {
    const policies = []
    const newEntries = filtered.map((f, i) => {
      const mode = f.policy ? f.policy : 'normal'
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

/* handler */
const uploadHandle = (event, args) => {
  const { driveUUID, dirUUID, type, filters, domain } = args
  const dialogType = type === 'directory' ? 'openDirectory' : 'openFile'
  dialog.showOpenDialog(getMainWindow(), { properties: [dialogType, 'multiSelections'], filters }, (entries) => {
    if (!entries || !entries.length) return
    readUploadInfo(entries, dirUUID, driveUUID, domain)
  })
}

const dragFileHandle = (event, args) => {
  const { dirUUID, driveUUID, domain } = args
  let entries = args.files
  if (!entries || !entries.length) return
  entries = entries.map(entry => path.normalize(entry))
  readUploadInfo(entries, dirUUID, driveUUID, domain)
}

const uploadMediaHandle = (event, args) => {
  const { driveUUID, dirUUID } = args
  uploadHandle(event, {
    dirUUID,
    driveUUID,
    type: 'file',
    filters: [
      { name: 'Images', extensions: ['jpg', 'png', 'gif'] },
      { name: 'Movies', extensions: ['mkv', 'avi', 'mp4'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
}

const uploadFirmHandle = (event, args) => {
  const { absPath, session } = args
  fs.lstat(path.resolve(absPath), (err, stat) => {
    if (err || !stat) event.sender.send('UPLOAD_FIRM_RESULT', { success: !err, reason: err, session })
    else if (stat.size > 800 * 1024 * 1024) {
      event.sender.send('UPLOAD_FIRM_RESULT', { success: false, reason: i18n.__('Firmware File Too Large'), session })
    } else {
      uploadFirm(event, absPath, stat.size, session, (error, res) => {
        let reason = ''
        try {
          reason = JSON.parse(res && res.text)
        } catch (e) {
          console.error('parse reason error, use raw res', reason, e)
          reason = res
        }
        event.sender.send('UPLOAD_FIRM_RESULT', { success: !error, reason, session })
      })
    }
  })
}

/* ipc listener */
ipcMain.on('UPLOAD', uploadHandle)
ipcMain.on('UPLOADMEDIA', uploadMediaHandle)
ipcMain.on('DRAG_FILE', dragFileHandle)
ipcMain.on('resolveConflicts', resolveHandle)
ipcMain.on('UPLOAD_FIRM', uploadFirmHandle)
