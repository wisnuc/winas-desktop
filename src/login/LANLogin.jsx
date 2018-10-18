import i18n from 'i18n'
import React from 'react'
import { Divider } from 'material-ui'
import { BackIcon, EyeOpenIcon, EyeOffIcon, DelPwdIcon } from '../common/Svg'

import { RRButton, LIButton, TFButton, TextField } from '../common/Buttons'

class LANLogin extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      pn: '',
      pnError: '',
      pwd: '',
      pwdError: '',
      error: '',
      showPwd: false,
      loading: false
    }

    this.onPhoneNumber = (pn) => {
      this.setState({ pn, pnError: '' })
    }

    this.onPassword = (pwd) => {
      this.setState({ pwd, pwdError: '' })
    }

    this.handleSaveToken = () => {
    }

    this.handleAutologin = () => {
    }

    this.clearPn = () => this.setState({ pn: '', pnError: '' })
    this.togglePwd = () => this.setState({ showPwd: !this.state.showPwd })

    this.login = () => {
      const users = this.props.dev.users && this.props.dev.users.data
      const user = users && users.find(u => u.phoneNumber === this.state.pn)
      if (!user) {
        this.setState({ pnError: i18n.__('User Not Exist') })
        return
      }
      this.setState({ loading: true })
      const { uuid } = user
      const password = this.state.pwd
      this.props.dev.request('token', { uuid, password }, (err, data) => {
        if (err) {
          console.error(`login err: ${err}`)
          const msg = (err && err.message === 'Unauthorized') ? i18n.__('Wrong Password') : (err && err.message)
          this.setState({ pwdError: msg })
        } else {
          Object.assign(this.props.dev, { token: { isFulfilled: () => true, ctx: user, data } })
          const { selectedDevice } = this.props
          this.props.phiLogin({
            lan: true,
            name: i18n.__('Account Offline With Phone Number %s', user.phoneNumber),
            phoneNumber: user.phoneNumber
          })
          this.props.deviceLogin({ dev: this.props.dev, user, selectedDevice })
        }
        this.setState({ loading: false })
      })
    }

    this.onKeyDown = (e) => {
      if (e.which === 13 && this.shouldFire()) this.login()
    }
  }

  shouldFire () {
    return !this.state.pnError && !this.state.pwdError && this.state.pn && this.state.pwd
  }

  getStationName () {
    if (!this.props.dev) return 'N2'
    const { mdev } = this.props.dev
    if (mdev && mdev.stationName) return mdev.stationName
    const mac = mdev && mdev.mac
    if (mac) return `N2-${mac.slice(-2)}`
    return 'N2'
  }

  render () {
    return (
      <div style={{ width: 320, zIndex: 100 }} className="paper" >
        <div style={{ height: 59, display: 'flex', alignItems: 'center', paddingLeft: 5 }} className="title">
          <LIButton onClick={this.props.onRequestClose} >
            <BackIcon />
          </LIButton>
          { this.getStationName() }
        </div>
        <Divider style={{ marginLeft: 20, width: 280 }} className="divider" />
        <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            style={{ width: 280, height: 150 }}
            src="./assets/images/pic-login-offline.png"
            alt=""
          />
        </div>
        <div style={{ height: 20, marginTop: 10, fontSize: 12, color: '#85868c' }} className="flexCenter">
          { i18n.__('LAN Login Text') }
        </div>
        <div style={{ width: 280, margin: '-10px auto 0px auto', position: 'relative' }}>
          <TextField
            hintText={i18n.__('Phone Number Hint')}
            type="text"
            errorText={this.state.pnError}
            value={this.state.pn}
            onChange={e => this.onPhoneNumber(e.target.value)}
          />
          <TextField
            hintText={i18n.__('Password Hint')}
            type={this.state.showPwd ? 'text' : 'password'}
            errorText={this.state.pwdError}
            value={this.state.pwd}
            onChange={e => this.onPassword(e.target.value)}
            onKeyDown={this.onKeyDown}
          />

          {/* clear password */}
          {
            !!this.state.pn &&
              <div style={{ position: 'absolute', right: 0, top: 35 }}>
                <TFButton icon={DelPwdIcon} onClick={this.clearPn} />
              </div>
          }

          {/* password visibility */}
          <div style={{ position: 'absolute', right: 0, top: 105 }}>
            <TFButton icon={this.state.showPwd ? EyeOpenIcon : EyeOffIcon} onClick={this.togglePwd} />
          </div>
        </div>
        <div style={{ height: 30 }} />
        <div style={{ width: 240, height: 40, margin: '0 auto' }}>
          <RRButton
            label={this.state.loading ? i18n.__('Logging') : i18n.__('Login')}
            onClick={this.login}
            disabled={!this.shouldFire()}
            loading={this.state.loading}
          />
        </div>
        <div style={{ height: 30 }} />
      </div>
    )
  }
}

export default LANLogin
