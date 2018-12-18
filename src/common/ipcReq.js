const UUID = require('uuid')
const Promise = require('bluebird')
const { ipcRenderer } = require('electron')

/*
 * name: createBackupDrive, updateBackupDrive
 */
const ipcReq = (name, args, callback) => {
  const uuid = UUID.v4()
  ipcRenderer.send('COMMAND', name, Object.assign({ session: uuid }, args))
  const handler = (event, data) => {
    const { err, res, session } = data
    if (session === uuid) {
      callback(err, res)
      ipcRenderer.removeListener('COMMAND_RES', handler)
    }
  }
  ipcRenderer.on('COMMAND_RES', handler)
}

const ipcReqAsync = Promise.promisify(ipcReq)

module.exports = { ipcReq, ipcReqAsync }
