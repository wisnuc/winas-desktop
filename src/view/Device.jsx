import i18n from 'i18n'
import React from 'react'
import Base from './Base'
import DeviceInfo from '../settings/DeviceInfo'

class Device extends Base {
  constructor (ctx) {
    super(ctx)

    this.address = ctx.props.selectedDevice.mdev.address // TODO

    this.state = {
    }

    this.refresh = () => {
      this.ctx.props.apis.request('device')
      this.ctx.props.apis.request('memory')
      this.ctx.props.apis.request('cpus')
      this.ctx.props.apis.request('network')
    }

    this.refreshStat = () => {
      this.ctx.props.apis.request('memory')
      this.ctx.props.apis.request('cpus')
    }

    this.clearRefresh = () => clearInterval(this.timer)
  }

  willReceiveProps (nextProps) {
    this.handleProps(nextProps.apis, ['network', 'device', 'memory', 'cpus'])
  }

  navEnter () {
    this.refresh()
    this.timer = setInterval(this.refreshStat, 5000)
  }

  navLeave () {
    this.clearRefresh()
  }

  navGroup () {
    return 'settings'
  }

  menuName () {
    return i18n.__('Device Menu Name')
  }

  menuDes () {
    return i18n.__('Device Description')
  }

  menuIcon () {
    const Pic = props => (
      <div {...props}>
        <img src="./assets/images/ic-deviceinfo.png" alt="" width={44} height={48} />
      </div>
    )
    return Pic
  }

  renderContent ({ openSnackBar }) {
    return (
      <DeviceInfo
        {...this.ctx.props}
        {...this.state}
        clearRefresh={this.clearRefresh}
        address={this.address}
        openSnackBar={openSnackBar}
      />
    )
  }
}

export default Device
