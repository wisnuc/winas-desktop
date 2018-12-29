const i18n = require('i18n')
const path = require('path')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const fs = require('original-fs') // eslint-disable-line
const Promise = require('bluebird')
const fsUtils = require('nodejs-fs-utils')
const { ipcMain, BrowserWindow, app, Menu, shell } = require('electron')

const store = require('./store')

Promise.promisifyAll(fsUtils)
Promise.promisifyAll(mkdirp) // mkdirp.mkdirpAsync
const rimrafAsync = Promise.promisify(rimraf)

/* app icon */
const iconName = process.platform === 'win32' ? 'icon.ico' : process.platform === 'darwin' ? 'icon.icns' : 'icon.png'
const icon = path.join(global.rootPath, 'public/assets/images', iconName)
const isWin32 = process.platform === 'win32'

const isHiding = process.env.START_MODE === 'hiding'

let _mainWindow = null

const getMainWindow = () => _mainWindow

const env = process.env.NODE_ENV === 'dev'

const WINDOW_WIDTH = env ? 1440 : 450
const WINDOW_HEIGHT = env ? 600 : 500

let loggedIn = false

const initMainWindow = () => {
  let bounds = {}
  if (env) bounds = require('electron').screen.getAllDisplays().slice(-1)[0].bounds // eslint-disable-line
  else bounds = require('electron').screen.getPrimaryDisplay().bounds // eslint-disable-line
  const x = Math.ceil(bounds.x + ((bounds.width - WINDOW_WIDTH) / 2))
  const y = Math.ceil(bounds.y + ((bounds.height - WINDOW_HEIGHT) / 2))

  // create window
  _mainWindow = new BrowserWindow({
    minWidth: 450,
    minHeight: 500,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x,
    y,
    show: !isHiding,
    frame: false,
    transparent: false,
    resizable: true,
    title: 'Winas',
    center: true,
    icon
  })

  // Create the Application's main menu
  const template = [{
    label: 'Application',
    submenu: [
      { label: 'About Application', selector: 'orderFrontStandardAboutPanel:' },
      { type: 'separator' },
      { label: 'Quit', accelerator: 'Command+Q', click () { app.quit() } }
    ]
  }, {
    label: 'Edit',
    submenu: [
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
      { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
      { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
      { label: 'Select All', accelerator: 'CmdOrCtrl+A', selector: 'selectAll:' },
      {
        label: 'Toggle Developer Tools',
        accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        click: (item, focusedWindow) => focusedWindow && focusedWindow.toggleDevTools()
      }
    ]
  }]

  if (process.platform === 'darwin') Menu.setApplicationMenu(Menu.buildFromTemplate(template))

  // window title
  _mainWindow.on('page-title-updated', (event) => {
    event.preventDefault()
  })

  // debug mode
  // _mainWindow.webContents.openDevTools()
  if (env) setTimeout(() => _mainWindow.webContents.openDevTools(), 2500)

  _mainWindow.loadURL(`file://${path.join(global.rootPath, 'public', 'index.html')}`)

  // ipc message will be lost if sent early than 'did-finish-load'
  const contents = _mainWindow.webContents
  contents.on('did-finish-load', () =>
    contents.send('CONFIG_UPDATE', global.configuration.getConfiguration()))

  _mainWindow.on('will-resize', (e, newBounds) => {
    if (!loggedIn || (loggedIn && newBounds && (newBounds.height < 600 || newBounds.width < 960))) {
      e.preventDefault()
    }
  })

  return _mainWindow
}

const openAboutWindow = () => {
  const win = new BrowserWindow({
    width: 420,
    height: 316,
    frame: false,
    title: 'About',
    resizable: false,
    center: true,
    icon
  })
  win.on('page-title-updated', event => event.preventDefault())
  win.loadURL(`file://${path.join(global.rootPath, 'public', 'about.html')}`)
  return win
}

let trayWin
const openTrayWindow = () => {
  trayWin = new BrowserWindow({
    width: 242,
    height: 298,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    setSkipTaskbar: true,
    backgroudColor: '#FFFFFF'
  })
  trayWin.loadURL(`file://${path.join(global.rootPath, 'public', 'tray.html')}`)

  return trayWin
}

const openBootWindow = () => {
  let bounds = {}
  if (env) bounds = require('electron').screen.getAllDisplays().slice(-1)[0].bounds // eslint-disable-line
  else bounds = require('electron').screen.getPrimaryDisplay().bounds // eslint-disable-line
  const x = Math.ceil(bounds.x + ((bounds.width - WINDOW_WIDTH) / 2))
  const y = Math.ceil(bounds.y + ((bounds.height - WINDOW_HEIGHT) / 2))

  const win = new BrowserWindow({
    height: WINDOW_HEIGHT,
    width: WINDOW_WIDTH,
    x,
    y,
    center: true,
    frame: false,
    transparent: true,
    resizable: false,
    title: 'Winas',
    icon
  })
  win.on('page-title-updated', event => event.preventDefault())
  win.loadURL(`file://${path.join(global.rootPath, 'public', 'boot.html')}`)
  return win
}

/* clean dir: 'tmp tmpTrans thumb image' */
const calcCacheSize = async () => {
  const tmpSize = await fsUtils.fsizeAsync(store.getState().config.tmpPath, { countFolders: false, fs })
  const tmpTransSize = await fsUtils.fsizeAsync(store.getState().config.tmpTransPath, { countFolders: false, fs })
  const thumbSize = await fsUtils.fsizeAsync(store.getState().config.thumbPath, { countFolders: false, fs })
  const imageSize = await fsUtils.fsizeAsync(store.getState().config.imagePath, { countFolders: false, fs })
  // const boxSize = await fsUtils.fsizeAsync(store.getState().config.boxPath, { countFolders: false, fs })
  // return (tmpSize + tmpTransSize + thumbSize + imageSize + boxSize)
  return (tmpSize + tmpTransSize + thumbSize + imageSize)
}

const cleanCache = async () => {
  await rimrafAsync(store.getState().config.tmpPath, fs)
  await mkdirp.mkdirpAsync(store.getState().config.tmpPath)
  await rimrafAsync(store.getState().config.tmpTransPath, fs)
  await mkdirp.mkdirpAsync(store.getState().config.tmpTransPath)
  await rimrafAsync(store.getState().config.thumbPath, fs)
  await mkdirp.mkdirpAsync(store.getState().config.thumbPath)
  await rimrafAsync(store.getState().config.imagePath, fs)
  await mkdirp.mkdirpAsync(store.getState().config.imagePath)
  // await rimrafAsync(store.getState().config.boxPath, fs)
  // await mkdirp.mkdirpAsync(store.getState().config.boxPath, fs)
  return true
}

const onTrayData = (event) => {
  let [logged, deviceStatus, userName, avatarSrc] = [
    false,
    '',
    i18n.__('Not Logged'),
    ''
  ]
  if (store.getState().login.state === 'LOGIN') {
    const { user, isCloud } = store.getState().login
    logged = true
    deviceStatus = isCloud ? i18n.__('Remote Mode') : i18n.__('Online and LAN Mode')
    avatarSrc = user.avatarUrl
    userName = user.username
  }
  const data = {
    logged,
    avatarSrc,
    text: [
      ['userName', userName],
      ['deviceStatus', deviceStatus]
    ]
  }
  event.sender.send('TRAY_DATA', data)
}

const onAboutData = (event) => {
  const data = {
    text: [
      ['name', 'Winas'],
      ['version', i18n.__('Client Version %s', app.getVersion())],
      ['description', '多设备，跨平台，让您随时随地，方便快捷地管理您的数据'],
      ['copyright', `©上海闻上信息科技有限公司 2016-${new Date().getFullYear()}`],
      ['agreement', '用户使用协议']
    ]
  }
  event.sender.send('ABOUT_DATA', data)
}

const jumpTo = (nav) => {
  if (store.getState().login.state !== 'LOGIN') return
  getMainWindow().show()
  getMainWindow().webContents.send('JUMP_TO', nav)
}

ipcMain.on('POWEROFF', () => app.quit())

ipcMain.on('HIDE', () => (process.platform === 'win32' ? app.quit() : getMainWindow().hide()))

ipcMain.on('MINIMIZE', () => {
  const win = getMainWindow()
  win.minimize()
})

ipcMain.on('TOGGLE_MAX', () => {
  const win = getMainWindow()
  // win.setResizable(true)
  if (win.isMaximized()) win.unmaximize()
  else win.maximize()
  // win.setResizable(false)
})

ipcMain.on('SETCONFIG', (event, args) => {
  global.configuration.updateGlobalConfigAsync(args)
    .catch(e => console.error('SETCONFIG error', e))
})

ipcMain.on('GetCacheSize', () => {
  const wc = (getMainWindow()).webContents
  calcCacheSize().then(size => wc.send('CacheSize', { error: null, size })).catch((e) => {
    wc.send('CacheSize', { error: e, size: null })
  })
})

ipcMain.on('CleanCache', () => {
  const wc = (getMainWindow()).webContents
  cleanCache().then(() => wc.send('CleanCacheResult', null)).catch((e) => {
    wc.send('CleanCacheResult', e)
  })
})

const r = v => Math.round(v)

ipcMain.on('LOGIN', () => {
  loggedIn = true
  if (env) return
  const win = getMainWindow()
  const bounds = win.getBounds()
  if (isWin32) win.setOpacity(0)
  else win.hide()
  win.setBounds({
    x: r(bounds.x + (bounds.width - 960) / 2),
    y: r(bounds.y + (bounds.height - 600) / 2),
    width: 960,
    height: 600
  })
  setTimeout(() => (isWin32 ? win.setOpacity(1) : win.show()), 300)
})

ipcMain.on('LOGOUT', () => {
  loggedIn = false
  if (env) return
  const win = getMainWindow()
  const bounds = win.getBounds()
  if (isWin32) win.setOpacity(0)
  else win.hide()
  win.setBounds({
    x: r(bounds.x + (bounds.width - 450) / 2),
    y: r(bounds.y + (bounds.height - 500) / 2),
    width: 450,
    height: 500
  })
  setTimeout(() => (isWin32 ? win.setOpacity(1) : win.show()), 300)
})

ipcMain.on('REQ_TRAY_DATA', onTrayData)
ipcMain.on('REQ_ABOUT_DATA', onAboutData)
ipcMain.on('OPEN_CHANGE_DEVICE', () => store.getState().login.state === 'LOGIN' && getMainWindow().webContents.send('DEVICE_LOGOUT'))
ipcMain.on('OPEN_HOME', () => jumpTo('home'))
ipcMain.on('OPEN_ABOUT', openAboutWindow)
ipcMain.on('OPEN_UPDATE', () => shell.openExternal('http://www.wisnuc.com/download'))
ipcMain.on('OPEN_AGREEMENT', () => shell.openExternal('http://www.wisnuc.com'))

module.exports = { initMainWindow, getMainWindow, openTrayWindow, openBootWindow }
