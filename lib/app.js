const path = require('path')
const i18n = require('i18n')
const { app, dialog, Tray } = require('electron')

const store = require('./store')
const Configuration = require('./configuration')
const { clearTasks, Tasks } = require('./transmissionUpdate')
const { initMainWindow, getMainWindow, openTrayWindow, openBootWindow } = require('./window')

require('./mdns')
require('./login')
require('./media')
require('./newUpload')
require('./newDownload')

/* app close check */
let close = false
const onClose = (e) => {
  if (!willQuitApp) {
    e.preventDefault()
    getMainWindow().hide()
  } else {
    const noRunningTask = !Tasks.filter(t => t.state !== 'finished' && !t.paused).length
    if (close || noRunningTask) {
      clearTasks()
    } else {
      dialog.showMessageBox(getMainWindow(), {
        type: 'warning',
        title: i18n.__('Confirm Close Title'),
        buttons: [i18n.__('Cancel'), i18n.__('Confirm')],
        message: i18n.__('Confirm Close Text')
      }, (response) => {
        if (response === 1) {
          close = true
          setImmediate(app.quit)
        }
      })
      e.preventDefault()
    }
  }
}

/* app ready and open window */
let tray = null
let win = null
let willQuitApp = false

const showTrayWindow = () => {
  win = openTrayWindow()
  const windowBounds = win.getBounds()
  const trayBounds = tray.getBounds()
  const tx = trayBounds.x
  const ty = trayBounds.y

  /* set position of window */
  let x = 0
  let y = 0
  if (ty < 250 && tx > 220) {
    if (process.platform === 'darwin') {
      x = tx + trayBounds.width / 2 - windowBounds.width / 2
      y = ty + trayBounds.height
    } else {
      x = tx + trayBounds.width / 2 - windowBounds.width
      y = ty + trayBounds.height / 2
    }
  } else if (ty > 250 && tx > 220) {
    x = tx + trayBounds.width / 2 - windowBounds.width
    y = ty + trayBounds.height / 2 - windowBounds.height
  } else if (ty > 250 && tx < 220) {
    x = tx + trayBounds.width / 2
    y = ty + trayBounds.height / 2 - windowBounds.height
  }

  win.setPosition(x, y, false)
  win.setSkipTaskbar(true)

  win.on('blur', e => e && e.sender && e.sender.close())
  win.show()
  win.focus()
}

const updateTray = () => {
  if (process.platform === 'darwin') return // disable for mac

  const iconName = process.platform === 'win32' ? 'icon.ico' : process.platform === 'darwin' ? 'icon-mac.png' : 'icon.png'
  const icon = path.join(global.rootPath, 'public/assets/images', iconName)

  if (!tray) {
    tray = new Tray(icon)
    tray.setToolTip('PhiNAS')
    if (process.platform === 'win32') {
      tray.on('right-click', () => showTrayWindow())
      tray.on('click', () => getMainWindow().show())
    } else {
      tray.on('click', () => {
        getMainWindow().show()
        showTrayWindow()
      })
    }
  }
}

app.on('ready', () => {
  const appDataPath = app.getPath('appData')
  const configuration = new Configuration(appDataPath)
  configuration.initAsync()
    .then(() => {
      const bootWin = openBootWindow()
      const mainWin = initMainWindow()
      mainWin.on('close', onClose)

      let isReady = false
      const showMainWin = () => {
        if (isReady) {
          bootWin.close()
          mainWin.show()
        } else isReady = true
      }
      /* show in 2000ms or ready-to-show */
      setTimeout(showMainWin, 2000)
      mainWin.once('ready-to-show', showMainWin)
    })
    .catch((err) => {
      console.error('failed to load configuration, die', err)
      process.exit(1)
    })

  global.configuration = configuration

  i18n.configure({
    updateFiles: false,
    locales: ['en-US', 'zh-CN'],
    directory: path.resolve(__dirname, '../', 'locales'),
    defaultLocale: 'zh-CN'
    // defaultLocale: /zh/.test(app.getLocale()) ? 'zh-CN' : 'en-US'
  })

  updateTray()
})

app.on('window-all-closed', () => app.quit())

app.on('before-quit', () => (willQuitApp = true))

app.on('quit', () => tray && tray.destroy())

app.on('activate', () => getMainWindow() && getMainWindow().show())

/* makeSingleInstance */
const shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
  if (getMainWindow()) {
    if (getMainWindow().isMinimized()) getMainWindow().restore()
    if (!getMainWindow().isVisible()) getMainWindow().show()
    getMainWindow().focus()
  }
})

if (shouldQuit) {
  app.quit()
  return
}

/* configObserver */
let preGlobalConfig
let preUserConfig

const configObserver = () => {
  if (getMainWindow() && (store.getState().config !== preGlobalConfig || store.getState().userConfig !== preUserConfig)) {
    preGlobalConfig = store.getState().config
    preUserConfig = store.getState().userConfig
    const config = global.configuration.getConfiguration()
    /*
    if (config.global && config.global.locales) i18n.setLocale(config.global.locales)
    else i18n.setLocale(/zh/.test(app.getLocale()) ? 'zh-CN' : 'en-US')
    */
    i18n.setLocale('zh-CN')
    updateTray()
    getMainWindow().webContents.send('CONFIG_UPDATE', config)
  }
}

store.subscribe(configObserver)

/* handle uncaught Exception */
process.on('uncaughtException', (err) => {
  console.error(`!!!!!!\nuncaughtException:\n${err}\n------`)
})
