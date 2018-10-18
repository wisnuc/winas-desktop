import React from 'react'
import ReactDom from 'react-dom'
import { ipcRenderer, remote } from 'electron'
import i18n from 'i18n'

import Phi from './Phi'

/* i18n config */
// const lang = navigator.language
i18n.configure({
  updateFiles: false,
  locales: ['en-US', 'zh-CN'],
  directory: remote.require('path').join(remote.app.getAppPath(), 'locales'),
  defaultLocale: 'zh-CN'
  // defaultLocale: /zh/.test(lang) ? 'zh-CN' : 'en-US'
})

/* render method */
const render = () => {
  ReactDom.render(React.createElement(Phi), document.getElementById('app'))
}

/* set useCapture true to prevent possible losting event */
window.addEventListener('dragover', e => e.preventDefault(), true)
window.addEventListener('drop', e => e.preventDefault(), true)

/* render after config loaded */
ipcRenderer.on('CONFIG_UPDATE', (event, config) => {
  if (process.env.NODE_ENV === 'dev') console.log('CONFIG_UPDATE', config)
  global.config = config
  /*
  if (config.global && config.global.locales) i18n.setLocale(config.global.locales)
  else i18n.setLocale(/zh/.test(lang) ? 'zh-CN' : 'en-US')
  */
  i18n.setLocale('zh-CN')
  render()
})
