import i18n from 'i18n'
import React from 'react'
import prettySize from '../common/prettySize'
import DeviceAPI from '../common/device'
import { DeviceIcon } from '../common/Svg'

class Device extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      dev: {}
    }

    this.select = () => {
      this.props.slDevice(this.state.dev, this.device)
    }

    this.onUpdate = (prev, next) => {
      this.setState({ dev: next })
    }
  }

  componentDidMount () {
    const { cdev } = this.props
    const dev = Object.assign(
      { address: cdev.LANIP, domain: 'cloudToLocal', deviceSN: cdev.sn, stationName: cdev.name },
      cdev
    )
    if (!cdev.online) {
      this.onUpdate(null, { mdev: dev })
    } else {
      this.device = new DeviceAPI(dev)
      this.device.on('updated', this.onUpdate)
      this.device.start()
    }
  }

  componentWillUnmount () {
    if (this.device) this.device.removeListener('updated', this.onUpdate)
  }

  systemStatus () {
    return (this.device && this.device.systemStatus()) || 'probing'
  }

  onlineStatus () {
    if (!this.props.cdev) return null
    if (this.props.cdev.onlineStatus !== 'online') return i18n.__('Offline Mode')
    if (this.systemStatus() === 'offline') return i18n.__('Remote Mode')
    if (this.systemStatus() === 'probing') return null
    return i18n.__('Online and LAN Mode')
  }

  renderIsOwner () {
    if (!this.props.cdev) return null
    const { inviteStatus, accountStatus, type } = this.props.cdev
    if (type === 'owner') return i18n.__('Admin User')
    if (inviteStatus === 'accept' && accountStatus === '1') return i18n.__('Normal User')
    if (inviteStatus === 'accept' && accountStatus !== '1') return i18n.__('Account Deleted')
    if (inviteStatus === 'pending' && accountStatus === '1') return i18n.__('Need Check Invitation')
    if (inviteStatus === 'pending' && accountStatus !== '1') return i18n.__('Inactive Invitaion')
    if (inviteStatus === 'reject' && accountStatus === '1') return i18n.__('Rejected Invitaion')
    if (inviteStatus === 'reject' && accountStatus !== '1') return i18n.__('Rejected And Inactive Invitaion')
    return null
  }

  isEnabled () {
    const { type, cdev } = this.props
    const status = this.systemStatus()
    const isAdmin = cdev && cdev.type === 'owner'
    const isUser = cdev && ['accept', 'pending'].includes(cdev.inviteStatus) && cdev.accountStatus === '1'
    return (
      (type === 'LANTOBIND' && status === 'noBoundUser') ||
      (type === 'LANTOLOGIN' && status === 'ready') ||
      (type === 'CHANGEDEVICE' && status === 'ready') ||
      (type === 'CHANGEDEVICE' && status === 'offline') ||
      (type === 'BOUNDLIST' && status === 'noBoundVolume') ||
      (type === 'BOUNDLIST' && status === 'ready' && (isAdmin || isUser)) ||
      (type === 'BOUNDLIST' && status === 'offline')
    )
  }

  getStationName () {
    if (!this.state.dev) return 'N2'
    const { mdev } = this.state.dev
    if (mdev && mdev.stationName) return mdev.stationName
    const mac = mdev && mdev.mac
    if (mac) {
      const name = `N2-${mac.slice(-2)}`
      Object.assign(this.device.mdev, { stationName: name })
      return name
    }
    return 'N2'
  }

  isCurrent () {
    const currentSN = (this.props.selectedDevice && this.props.selectedDevice.mdev && this.props.selectedDevice.mdev.deviceSN)
    const newSN = this.state.dev && this.state.dev.mdev && this.state.dev.mdev.deviceSN
    return !!currentSN && (currentSN === newSN)
  }

  renderStatus () {
    const st = this.systemStatus()
    let text = st
    switch (st) {
      case 'noBoundUser':
        text = i18n.__('Wait To Bind')
        break

      case 'systemError':
        text = i18n.__('System Error')
        break

      case 'noBoundVolume':
        if (this.props.type === 'LANTOBIND') text = i18n.__('Already Bound')
        else text = i18n.__('Need Bind Volume')
        break

      case 'ready':
        if (this.props.type === 'LANTOBIND') text = i18n.__('Already Bound')
        else if (['CHANGEDEVICE', 'LANTOLOGIN'].includes(this.props.type)) {
          if (this.isCurrent()) text = i18n.__('Current Logged Device')
          else text = ''
        } else text = ''
        break

      case 'offline':
        if (this.onlineStatus()) {
          if (this.isCurrent()) text = i18n.__('Current Logged Device')
          else text = ''
        } else text = i18n.__('System Error')
        break

      case 'probing':
        text = i18n.__('Probing')
        if (this.props.cdev && this.props.cdev.onlineStatus === 'offline') text = ''
        break

      case 'booting':
        text = i18n.__('Booting')
        break

      default:
        break
    }
    return text
  }

  render () {
    const isFailed = this.state.status === 'error'
    let [total, used, percent] = ['', '', '', 0]
    try {
      const space = this.device.state.space.data
      total = prettySize(space.total * 1024)
      used = prettySize(space.used * 1024)
      percent = space.used / space.total
    } catch (e) {
      // console.error('parse error')
    }
    const info = this.device && this.device.state && this.device.state.info && this.device.state.info.data
    const sn = info && info.device && info.device.sn && info.device.sn.slice(-4)
    const name = this.props.cdev && this.props.cdev.name
    const deviceName = name || (sn ? `Winas-${sn}` : 'Winas')
    return (
      <div style={{ height: 80, display: 'flex', alignItems: 'center', width: '100%', position: 'relative', lineHeight: 'normal' }}>
        <div style={{ width: 56, marginLeft: 8, display: 'flex', alignItems: 'center' }}>
          <DeviceIcon style={{ width: 24, height: 24 }} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ opacity: 0.87, fontWeight: 500 }}> { deviceName } </div>
            <div style={{ flexGrow: 1 }} />
            <div style={{ fontSize: 12, color: isFailed ? '#f44336' : 'rgba(0,0,0,.38)', height: 20 }} className="flexCenter">
              { this.renderStatus() }
            </div>
          </div>
          <div
            style={{
              height: 10,
              width: 240,
              borderRadius: 4,
              backgroundColor: 'rgba(0,0,0,.08)',
              position: 'relative',
              margin: '8px 0px'
            }}
          >
            <div
              style={{
                position: 'absolute',
                height: 10,
                width: percent * 240 || 0,
                borderRadius: 4,
                backgroundImage: 'linear-gradient(to right, #006e7b, #009688)'
              }}
            />
          </div>
          <div style={{ opacity: 0.54, color: 'rgba(0,0,0,.54)', fontSize: 12, fontWeight: 500 }}>
            { (used && total) ? `${used} / ${total}` : '-- / --' }
          </div>
        </div>
      </div>
    )
  }
}

export default Device
