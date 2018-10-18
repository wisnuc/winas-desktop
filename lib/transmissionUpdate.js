const fs = require('fs')
const i18n = require('i18n')
const Debug = require('debug')
const { ipcMain, powerSaveBlocker, shell } = require('electron')

const store = require('./store')
const { clearTmpTrans } = require('./server')
const { getMainWindow } = require('./window')

const debug = Debug('node:lib:transmissionUpdate:')

const Tasks = []

/* send message */
// let preUserTasksLength = 0
let lock = false
let last = true
let id = -1 // The power save blocker id returned by powerSaveBlocker.start

const sendMsg = () => {
  if (lock || !last) return (last = true)
  lock = true
  const userTasks = []
  const finishTasks = []
  Tasks.forEach((t) => {
    if (t.state === 'finished') finishTasks.push(typeof t.status === 'function' ? t.status() : t)
    else userTasks.push(t.status())
  })

  /* Ascending by createTime */
  userTasks.sort((a, b) => a.createTime - b.createTime)

  /* Descending by finished date */
  finishTasks.sort((a, b) => b.finishDate - a.finishDate) // Descending by finished date

  if (!powerSaveBlocker.isStarted(id) && userTasks.length !== 0 && !store.getState().config.enableSleep) {
    id = powerSaveBlocker.start('prevent-app-suspension')
  }

  /* Error: Object has been destroyed */
  try {
    getMainWindow().webContents.send('UPDATE_TRANSMISSION', [...userTasks], [...finishTasks])
  } catch (error) {
    console.error(error)
  }
  setTimeout(() => { lock = false; sendMsg() }, 200)
  return (last = false)
}

const taskSchedule = (trsType) => {
  if (Tasks.filter(t => !t.paused && t.state !== 'finished' && t.trsType === trsType).length < 5) {
    const task = Tasks.find(t => t.waiting && t.paused && t.state !== 'finished' && t.trsType === trsType)
    if (task) {
      task.wait(false)
      task.run()
      taskSchedule(trsType)
    }
  }
}

const actionHandler = (e, uuids, type) => {
  if (!Tasks.length || !uuids || !uuids.length) return

  let func
  switch (type) {
    case 'DELETE':
      func = (task) => {
        if (typeof task.pause === 'function' && task.state !== 'finished') task.pause(true)
        Tasks.splice(Tasks.indexOf(task), 1)
        global.DB.remove(task.uuid, err => err && console.error('DELETE_RUNNING error: ', err))
      }
      break
    case 'PAUSE':
      func = task => task.pause()
      break
    case 'RESUME':
      func = task => task.resume()
      break
    case 'FINISH':
      func = task => task.finish()
      break
    default:
      func = () => debug('error in actionHandler: no such action')
  }

  uuids.forEach((u) => {
    const task = Tasks.find(t => t.uuid === u)
    if (task) func(task)
  })
  taskSchedule('upload')
  taskSchedule('download')
  sendMsg()
}

const clearTasks = () => {
  debug('clearTasks !!')
  Tasks.forEach(task => task.state !== 'finished' && task.pause())
  Tasks.length = 0
  clearTmpTrans()
  sendMsg()
}

/* ipc listeners */
ipcMain.on('GET_TRANSMISSION', sendMsg)
ipcMain.on('OPEN_TRANSMISSION', (e, downloadPath) => {
  fs.access(downloadPath, (err) => {
    if (!err) shell.openItem(downloadPath)
    else if (err.code === 'ENOENT') e.sender.send('snackbarMessage', { message: i18n.__('Folder Not Found') })
    else e.sender.send('snackbarMessage', { message: i18n.__('Open Folder Error') })
  })
})

ipcMain.on('PAUSE_TASK', (e, uuids) => actionHandler(e, uuids, 'PAUSE'))
ipcMain.on('RESUME_TASK', (e, uuids) => actionHandler(e, uuids, 'RESUME'))
ipcMain.on('FINISH_TASK', (e, uuids) => actionHandler(e, uuids, 'FINISH'))
ipcMain.on('DELETE_TASK', (e, uuids) => actionHandler(e, uuids, 'DELETE'))

ipcMain.on('LOGOUT', clearTasks)

module.exports = { Tasks, sendMsg, clearTasks, taskSchedule }
