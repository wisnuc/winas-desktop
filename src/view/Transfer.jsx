import i18n from 'i18n'
import React from 'react'
import { ipcRenderer } from 'electron'

import Base from './Base'
import { TransIcon } from '../common/Svg'
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
    return i18n.__('Transfer')
  }

  menuIcon () {
    return TransIcon
  }

  renderToolBar ({ style }) {
    return (
      <div style={style}>
        <div style={{ width: 16 }} />
        <div style={{ height: 40, display: 'flex', alignItems: 'center', fontSize: 18, color: 'rgba(0,0,0,.76)' }}>
          { this.menuName() }
        </div>
        <div style={{ flexGrow: 1 }} />
      </div>
    )
  }

  renderContent ({ navToDrive, pin }) {
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
        <TrsContainer navToDrive={navToDrive} pin={pin} />
      </div>
    )
  }
}

export default Transmission
