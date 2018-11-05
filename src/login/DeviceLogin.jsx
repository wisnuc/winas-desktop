import i18n from 'i18n'
import React from 'react'
import Promise from 'bluebird'
import { CircularProgress } from 'material-ui'
import DeviceAPI from '../common/device'
import { RRButton, FLButton, LIButton } from '../common/Buttons'
import { CheckOutlineIcon, CheckedIcon, BackwardIcon, AccountIcon, DeviceIcon } from '../common/Svg'

class DeviceLogin extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      failed: false,
      loading: true
    }

    this.initDevice = () => {
      const { list } = this.props.accountInfo
      console.log('this.onSuccess', list)
      const cdev = list.find(l => l.onlineStatus === 'online')
      if (!cdev) this.setState({ failed: true, loading: false })
      else {
        const dev = Object.assign(
          { address: cdev.localIp, domain: 'phiToLoacl', deviceSN: cdev.deviceSN, stationName: cdev.bindingName },
          cdev
        )
        this.device = new DeviceAPI(dev)
        this.device.on('updated', this.onUpdate)
        this.device.start()
      }
    }

    this.onUpdate = (prev, next) => {
      console.log('this.onUpdate', next)
      this.setState({ dev: next }, () => {
        const status = this.systemStatus()
        if (status === 'ready') this.getLANToken()
        else if (status === 'offline') this.remoteLogin()
      })
    }

    this.getLANTokenAsync = async () => {
      const { account } = this.props
      const { dev } = this.state
      const args = { deviceSN: dev.mdev.deviceSN }
      const [tokenRes, users] = await Promise.all([
        this.props.phi.reqAsync('LANToken', args),
        this.props.phi.reqAsync('localUsers', args),
        Promise.delay(2000)
      ])
      const token = tokenRes.token
      const user = Array.isArray(users) && users.find(u => u.phicommUserId === account.phicommUserId)

      if (!token || !user) throw Error('get LANToken or user error')

      return ({ dev, user, token })
    }

    this.getLANToken = () => {
      this.getLANTokenAsync()
        .then(({ dev, user, token }) => {
          Object.assign(dev, { token: { isFulfilled: () => true, ctx: user, data: { token } } })
          this.props.deviceLogin({ dev, user, selectedDevice: this.device, isCloud: false })
        })
        .catch((error) => {
          console.error('this.getLANToken', error, this.props)
          this.setState({ status: 'error', error })
        })
    }

    this.remoteLoginAsync = async () => {
      const { account } = this.props
      const { dev } = this.state
      const args = { deviceSN: dev.mdev.deviceSN }
      const token = this.props.phi.token
      const [boot, users] = await Promise.all([
        this.props.phi.reqAsync('boot', args),
        this.props.phi.reqAsync('localUsers', args),
        Promise.delay(2000)
      ])
      const user = Array.isArray(users) && users.find(u => u.phicommUserId === account.phicommUserId)

      if (!token || !user || !boot) throw Error('get LANToken or user error')
      if (boot.state !== 'STARTED') throw Error('station not started')
      return ({ dev, user, token, boot })
    }

    this.remoteLogin = () => {
      this.remoteLoginAsync()
        .then(({ dev, user, token, boot }) => {
          /* onSuccess: auto login */
          Object.assign(dev, {
            token: {
              isFulfilled: () => true, ctx: user, data: { token }
            },
            boot: {
              isFulfilled: () => true, ctx: user, data: boot
            }
          })
          this.props.deviceLogin({ dev, user, selectedDevice: this.device, isCloud: true })
        })
        .catch((error) => {
          console.error('this.getLANToken', error)
          this.setState({ status: 'error', error })
        })
    }
  }

  systemStatus () {
    return (this.device && this.device.systemStatus()) || 'probing'
  }

  componentDidMount () {
    this.initDevice()
  }

  renderSuccess () {
    const text = i18n.__('Set Password Successfully')
    return (
      <div style={{ width: 380, height: 360, backgroundColor: '#FFF', zIndex: 100, margin: '0 auto' }}>
        {/* content */}
        <div style={{ height: 104, paddingTop: 32 }} className="flexCenter">
          <CheckedIcon style={{ color: '#4caf50', height: 72, width: 72 }} />
        </div>

        <div style={{ fontSize: 14, color: '#f44336' }} className="flexCenter">
          { text }
        </div>

        <div style={{ height: 32 }} />
        {/* button */}
        <div style={{ width: 328, height: 40, margin: '0 auto' }}>
          <RRButton
            label={i18n.__('Jump to Login')}
            onClick={this.props.backToLogin}
          />
        </div>
      </div>
    )
  }

  renderSendCode () {
    const isCodeSent = this.state.time > 0
    const disabled = isCodeSent || this.state.pnError || this.state.pn.length !== 11
    return (
      <div>
        <div style={{ position: 'absolute', top: 44, right: 8 }}>
          <FLButton
            label={isCodeSent ? i18n.__('%s Later to Send Verification Code', this.state.time) : i18n.__('Send Verification Code')}
            style={{ color: 'rgba(0,0,0,.26)', fontSize: 12 }}
            disabled={disabled}
            onClick={this.sendCode}
          />
        </div>
        {
          isCodeSent &&
            <div style={{ position: 'absolute', top: 8, left: 0, display: 'flex', alignItems: 'center', color: '#4caf50' }}>
              <CheckOutlineIcon style={{ color: '#4caf50', marginRight: 8 }} />
              { i18n.__('Verification Code Sent Hint') }
            </div>
        }
      </div>
    )
  }

  render () {
    const username = 'WISNUC Office'
    const loginStatus = '登陆中...'
    console.log('DeviceLogin this.props', this.props)
    return (
      <div style={{ width: 680, zIndex: 100, height: 510, position: 'relative' }} >
        <div style={{ marginTop: 46, height: 24, display: 'flex', alignItems: 'center' }}>
          <LIButton style={{ marginLeft: 48 }} onClick={this.props.backToLogin}>
            <BackwardIcon />
          </LIButton>
          <div style={{ flexGrow: 1 }} />
          <div style={{ marginRight: 48 }}>
            <FLButton
              label={i18n.__('Change Device')}
              onClick={() => this.setState({ view: 'list' })}
            />
          </div>
        </div>
        <div style={{ marginTop: 24, height: 80, position: 'relative' }} className="flexCenter">
          <div style={{ position: 'absolute', top: 0, margin: '0 auto' }}>
            <CircularProgress size={79} thickness={4} />
          </div>
          <AccountIcon style={{ width: 72, height: 72, color: 'rgba(96,125,139,.26)' }} />
        </div>
        <div style={{ marginTop: 12, fontSize: 14, height: 22 }} className="flexCenter">
          { username }
        </div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,.38)', height: 20 }} className="flexCenter">
          { loginStatus }
        </div>
        <div style={{ marginTop: 24, height: 80, display: 'flex', alignItems: 'center', width: '100%' }}>
          <div style={{ width: 102, marginLeft: 16 }} className="flexCenter">
            <DeviceIcon style={{ width: 24, height: 24 }} />
          </div>
          <div>
            <div style={{ opacity: 0.87, fontWeight: 500 }}> Winsun office </div>
            <div
              style={{
                height: 10,
                width: 280,
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
                  width: 40,
                  borderRadius: 4,
                  backgroundImage: 'linear-gradient(to right, #006e7b, #009688)'
                }}
              />
            </div>
            <div style={{ opacity: 0.54, color: 'rgba(0,0,0,.54)', fontSize: 12, fontWeight: 500 }}> 125.45GB / 4TB </div>
          </div>
          <div style={{ flexGrow: 1 }} />
          <div style={{ marginRight: 24 }}>
            离线
          </div>
          <div style={{ marginRight: 48 }}>
            默认登陆设备
          </div>
        </div>
      </div>
    )
  }
}

export default DeviceLogin
