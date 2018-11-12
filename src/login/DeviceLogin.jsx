import i18n from 'i18n'
import React from 'react'
import Promise from 'bluebird'
import prettysize from 'prettysize'
import { CircularProgress } from 'material-ui'
import DeviceAPI from '../common/device'
import FlatButton from '../common/FlatButton'
import { RRButton, FLButton, LIButton } from '../common/Buttons'
import { CheckOutlineIcon, CheckedIcon, BackwardIcon, AccountIcon, DeviceIcon } from '../common/Svg'

class DeviceLogin extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      failed: false,
      status: 'logging'
    }

    this.initDevice = () => {
      const { list } = this.props
      console.log('this.onSuccess', list)
      const cdev = list.find(l => !!l.online)
      if (!cdev) {
        this.setState({ status: 'error' })
      } else {
        const dev = Object.assign(
          { address: cdev.LANIP, domain: 'phiToLoacl', deviceSN: cdev.sn, stationName: 'test station' },
          cdev
        )
        this.device = new DeviceAPI(dev)
        this.device.on('updated', this.onUpdate)
        this.device.start()
      }
    }

    this.once = false

    this.onUpdate = (prev, next) => {
      this.setState({ dev: next }, () => {
        const status = this.systemStatus()
        /* TODO */
        if (this.once) return
        this.once = true
        if (status === 'ready') this.getLANToken()
        else if (status === 'offline') this.remoteLogin()
        else this.once = false
      })
    }

    this.LANLogin = () => {
      const user = {
        createTime: 1535357447894,
        isFirstUser: true,
        password: true,
        winasUserId: '88648258',
        phoneNumber: '18817301665',
        smbPassword: true,
        status: 'ACTIVE',
        username: 'admin',
        uuid: 'b8817656-50f5-4c54-a81b-745e93f3fcfc'
      }
      const uuid = user.uuid
      const password = '12345678'
      this.state.dev.request('token', { uuid, password }, (err, data) => {
        if (err) {
          console.error(`login err: ${err}`)
          const msg = (err && err.message === 'Unauthorized') ? i18n.__('Wrong Password') : (err && err.message)
          this.setState({ pwdError: msg })
        } else {
          Object.assign(this.state.dev, { token: { isFulfilled: () => true, ctx: user, data } })
          this.props.wisnucLogin({
            lan: true,
            name: i18n.__('Account Offline With Phone Number %s', user.phoneNumber),
            phoneNumber: user.phoneNumber
          })
          this.props.deviceLogin({ dev: this.state.dev, user, selectedDevice: this.device })
        }
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
      const user = Array.isArray(users) && users.find(u => u.winasUserId === account.winasUserId)

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
      const user = Array.isArray(users) && users.find(u => u.winasUserId === account.winasUserId)

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
    if (this.props.status === 'deviceList') this.initDevice()
  }

  componentDidUpdate (prevProps, prevState) {
    if (prevProps && prevProps.status === 'wisnucLogin' && this.props && this.props.status === 'deviceList') {
      this.initDevice()
    }
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

  deviceStatus () {
    switch (this.systemStatus()) {
      case 'probing':
        return i18n.__('Probing')
      case 'offline':
        return i18n.__('Offline')
      case 'systemError':
        return i18n.__('System Error')
      case 'ready':
        return ''
      case 'booting':
        return i18n.__('Booting')
      default:
        return ''
    }
  }

  loginStatus () {
    switch (this.state.status) {
      case 'error':
        return i18n.__('Login Error')
      case 'logging':
        return i18n.__('Logging')
      case 'Logging Error':
        return i18n.__('Logging Error')
      default:
        return ''
    }
  }

  render () {
    const username = 'WISNUC Office'
    console.log('render DeviceLogin', this.props, this.device)
    let [total, used, percent] = ['', '', '', 0]
    try {
      const space = this.device.state.space.data
      total = prettysize(space.total * 1024)
      used = prettysize(space.used * 1024)
      percent = space.used / space.total
    } catch (e) {
      // console.error('parse error')
    }
    const info = this.device && this.device.state && this.device.state.info && this.device.state.info.data
    const sn = info && info.device && info.device.sn && info.device.sn.slice(-4)
    const deviceName = sn ? `Winas-${sn}` : 'Winas'
    const isLogging = this.state.status === 'logging'
    return (
      <div style={{ width: 680, zIndex: 100, height: 510, position: 'relative' }} >
        <div style={{ marginTop: 46, height: 24, display: 'flex', alignItems: 'center' }}>
          {
            !isLogging &&
            <LIButton style={{ marginLeft: 48 }} onClick={this.props.backToLogin}>
              <BackwardIcon />
            </LIButton>
          }
          <div style={{ flexGrow: 1 }} />
          {
            !isLogging &&
            <div style={{ marginRight: 32 }}>
              <FlatButton
                primary
                label={i18n.__('Change Device')}
                onClick={() => this.setState({ view: 'list' })}
              />
            </div>
          }
        </div>
        <div style={{ marginTop: 24, height: 80, position: 'relative' }} className="flexCenter">
          <div style={{ position: 'absolute', top: 0, margin: '0 auto' }}>
            <CircularProgress size={79} thickness={4} />
          </div>
          {
            username ? (
              <div style={{ width: 72, height: 72, borderRadius: 36, overflow: 'hidden' }}>
                <img src="/home/lxw/Desktop/760373812.jpg" width={72} height={72} />
              </div>
            ) : <AccountIcon style={{ width: 72, height: 72, color: 'rgba(96,125,139,.26)' }} />
          }
        </div>
        <div style={{ marginTop: 12, fontSize: 14, height: 22 }} className="flexCenter">
          { username }
        </div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,.38)', height: 20 }} className="flexCenter">
          { this.loginStatus() }
        </div>
        <div style={{ marginTop: 24, height: 80, display: 'flex', alignItems: 'center', width: '100%' }}>
          <div style={{ width: 102, marginLeft: 16 }} className="flexCenter">
            <DeviceIcon style={{ width: 24, height: 24 }} />
          </div>
          <div>
            <div style={{ opacity: 0.87, fontWeight: 500 }}> { deviceName } </div>
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
                  width: percent * 280 || 0,
                  borderRadius: 4,
                  backgroundImage: 'linear-gradient(to right, #006e7b, #009688)'
                }}
              />
            </div>
            <div style={{ opacity: 0.54, color: 'rgba(0,0,0,.54)', fontSize: 12, fontWeight: 500 }}>
              { (used && total) ? `${used} / ${total}` : '-- / --' }
            </div>
          </div>
          <div style={{ flexGrow: 1 }} />
          <div style={{ marginRight: 24 }}>
            { this.deviceStatus() }
          </div>
          <div style={{ marginRight: 48 }}>
            { i18n.__('Default Device') }
          </div>
        </div>
      </div>
    )
  }
}

export default DeviceLogin
