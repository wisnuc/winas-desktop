import i18n from 'i18n'
import React from 'react'
import Base from './Base'
import FirmwareUpdateApp from '../settings/FirmwareUpdateApp'

class FirmwareUpdate extends Base {
  constructor (ctx) {
    super(ctx)

    this.state = {
      error: null,
      device: null
    }

    this.refresh = () => {
      this.ctx.props.selectedDevice.request('device')
    }
  }

  willReceiveProps (nextProps) {
    this.handleProps(nextProps.selectedDevice, ['device'])
  }

  navEnter () {
    this.refresh()
  }

  navGroup () {
    return 'settings'
  }

  menuName () {
    return i18n.__('FirmwareUpdate Menu Name')
  }

  menuDes () {
    return i18n.__('FirmwareUpdate Description')
  }

  menuIcon () {
    const Pic = props => (
      <div {...props}>
        <img src="./assets/images/ic-firmwareupdate.png" alt="" width={44} height={48} />
      </div>
    )
    return Pic
  }

  render ({ openSnackBar }) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <FirmwareUpdateApp
          {...this.state}
          {...this.ctx.props}
          refresh={this.refresh}
          openSnackBar={openSnackBar}
        />
      </div>
    )
  }
}

export default FirmwareUpdate
