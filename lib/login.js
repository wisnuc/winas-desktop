const { ipcMain } = require('electron')
const { Tasks, clearTasks } = require('./transmissionUpdate')
const uploadTransform = require('./uploadTransform')
const downloadTransform = require('./downloadTransform')

/*  Config will update 4 times:
 *    init: before LOGIN, get all kind of app path, get lastDevice info
 *    Login: update current device and user info
 *    update last device: updateGlobalConfigAsync({ lastDevice })
 *    update saved Token: updateUserConfigAsync(user.uuid, { saveToken: lastDevice.saveToken })
 */

ipcMain.on('LOGIN', (event, { device, user, isCloud }) => {
  global.dispatch({ type: 'LOGIN', data: { device, user, isCloud } })

  /* save last Device info */
  const lastDevice = device.mdev
  global.configuration.updateGlobalConfigAsync({ lastDevice })
    .catch(e => console.error('updateGlobalConfigAsync error', e))

  if (lastDevice.saveToken !== undefined) {
    global.configuration.updateUserConfigAsync(user.uuid, { saveToken: lastDevice.saveToken })
      .catch(e => console.error('updateUserConfigAsync error', e))
  }
})

ipcMain.on('LOGOUT', () => {
  global.dispatch({ type: 'LOGOUT' })
})

ipcMain.on('UPDATE_USER_CONFIG', (event, userUUID, data) => {
  global.configuration.updateUserConfigAsync(userUUID, data)
    .catch(e => console.error('updateUserConfigAsync error', e))
})

ipcMain.on('UPDATE_DEVICE', (event, device) => {
  global.dispatch({ type: 'UPDATE_DEVICE', data: { device } })
})

const loadAll = () => {
  global.DB.loadAll((error, tasks) => {
    if (error) console.error('load db store error', error)
    else {
      tasks.forEach((t) => {
        if (t.state === 'finished') Tasks.push(t)
        else if (t.trsType === 'upload') {
          uploadTransform
            .createTask(t.uuid, t.entries, t.dirUUID, t.driveUUID, t.taskType, t.createTime, false, t.policies, t.domain, t)
        } else if (t.trsType === 'download') {
          downloadTransform
            .createTask(t.uuid, t.entries, t.name, t.dirUUID, t.driveUUID, t.taskType, t.createTime, false, t.downloadPath, t.domain, t)
        }
      })
    }
  })
}

let timer = null
ipcMain.on('START_TRANSMISSION', () => {
  clearTimeout(timer)
  clearTasks()
  timer = setTimeout(loadAll, 1000)
})
