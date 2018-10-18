import i18n from 'i18n'
import React from 'react'
import { ipcRenderer } from 'electron'

import Base from './Base'
import { DownloadingIcon } from '../common/Svg'
import TrsContainer from '../transmission/TransmissionContainer'

class Transmission extends Base {
  navEnter () {
    ipcRenderer.send('GET_TRANSMISSION')
  }

  navLeave () {
    console.clear()
  }

  navGroup () {
    return 'transmission'
  }

  menuName () {
    return i18n.__('Downloading Menu Name')
  }

  menuIcon () {
    return DownloadingIcon
  }

  renderContent ({ navToDrive }) {
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
        <TrsContainer navToDrive={navToDrive} type="d" />
      </div>
    )
  }
}

export default Transmission
