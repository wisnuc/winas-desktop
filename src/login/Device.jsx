import i18n from 'i18n'
import React from 'react'
import prettysize from 'prettysize'
import DeviceAPI from '../common/device'

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
    /* cloud dev or mdns dev */
    const { mdev, cdev } = this.props
    if (cdev) {
      const dev = Object.assign(
        { address: cdev.localIp, domain: 'phiToLoacl', deviceSN: cdev.deviceSN, stationName: cdev.bindingName },
        cdev
      )
      if (cdev.onlineStatus !== 'online') {
        this.onUpdate(null, { mdev: dev })
      } else {
        this.device = new DeviceAPI(dev)
        this.device.on('updated', this.onUpdate)
        this.device.start()
      }
    } else if (mdev) {
      this.device = new DeviceAPI(mdev)
      this.device.on('updated', this.onUpdate)
      this.device.start()
    } else console.error('Device Error: No mdev or cdev')
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
    const status = this.systemStatus()
    const isEnabled = this.isEnabled()

    const stationName = this.getStationName()
    const address = (this.state.dev && this.state.dev.mdev && this.state.dev.mdev.address) || '--'

    let devStorage = '--'

    try {
      const space = this.isCurrent() ? this.props.selectedDevice.space.data : this.state.dev.space.data
      const { used, available } = space
      devStorage = i18n.__('Storage Usage %s %s', prettysize(used * 1024), prettysize((available + used) * 1024))
    } catch (e) {
      devStorage = '--'
    }

    const data = [
      { des: i18n.__('Device Storage'), val: devStorage },
      { des: i18n.__('IP Address'), val: address }
    ]

    return (
      <div
        style={{
          width: 210,
          cursor: isEnabled && !this.isCurrent() ? 'pointer' : 'not-allowed',
          padding: '0 20px',
          margin: '30px 7px 0 7px'
        }}
        className="paper"
        onClick={() => isEnabled && !this.isCurrent() && this.select()}
      >
        <div style={{ height: 20, width: '100%', paddingTop: 20, display: 'flex', alignItems: 'center' }}>
          <div
            style={{ width: 170, fontSize: 16, color: '#525a60' }}
            className="text"
          >
            { stationName }
          </div>
          {
            !!this.onlineStatus() &&
              <div
                style={{
                  width: 40,
                  height: 20,
                  fontSize: 12,
                  color: '#FFF',
                  borderRadius: 20,
                  backgroundColor: this.onlineStatus() === i18n.__('Offline Mode') ? '#666666' : '#31a0f5'
                }}
                className="flexCenter"
              >
                { this.onlineStatus() }
              </div>
          }
        </div>
        <div style={{ height: 20, width: '100%', display: 'flex', alignItems: 'center' }}>
          {
            !!this.renderIsOwner() &&
            <div style={{ fontSize: 14, color: '#31a0f5' }}>
              { this.renderIsOwner() }
            </div>
          }
          {
            !!this.renderIsOwner() && !!this.renderStatus() &&
              <div style={{ margin: 5, width: 1, backgroundColor: '#d3d3d3', height: 10 }} />
          }
          {
            !!this.renderStatus() &&
              <div
                style={{
                  fontSize: 14,
                  color: ['noBoundUser', 'ready'].includes(status) ||
                  (this.renderStatus() === i18n.__('Current Logged Device')) ? '#44c468' : '#fa5353'
                }}
              >
                { this.renderStatus() }
              </div>
          }
        </div>
        <div style={{ height: 230 }} className="flexCenter">
          <img
            style={{
              width: 51,
              height: 104,
              filter: !isEnabled ? 'grayscale(100%)' : status === 'noBoundUser' ? 'hue-rotate(290deg)' : ''
            }}
            src="./assets/images/ic-n-2.png"
            alt=""
          />
        </div>
        {
          data.map(({ des, val }) => (
            <div style={{ height: 40, display: 'flex', alignItems: 'center' }} key={des}>
              <div style={{ color: '#525a60' }}>
                { des }
              </div>
              <div style={{ flexGrow: 1 }} />
              <div style={{ color: '#888a8c' }}>
                { val }
              </div>
            </div>
          ))
        }
        <div style={{ height: 10 }} />
      </div>
    )
  }
}

export default Device
