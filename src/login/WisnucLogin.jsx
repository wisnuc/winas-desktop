import md5 from 'md5'
import React from 'react'
import i18n from 'i18n'
import { Divider, Checkbox } from 'material-ui'
import WeChatLogin from './WeChatLogin'
import RetrievePwd from './RetrievePwd'
import Dialog from '../common/PureDialog'
import { isPhoneNumber } from '../common/validate'
import { RRButton, FLButton, RSButton, TFButton, LoginTF } from '../common/Buttons'
import { EyeOpenIcon, EyeOffIcon, WinCloseIcon, MobileIcon, LockIcon, CheckBoxOutlineIcon, WisnucLogo } from '../common/Svg'

let firstLogin = true

class WisnucLogin extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      pn: '',
      pwd: '',
      pnError: '',
      pwdError: '',
      error: '',
      showPwd: false,
      saveToken: false,
      autoLogin: false,
      showFakePwd: false,
      status: 'account'
    }

    this.onPhoneNumber = (pn) => {
      this.setState({
        pn,
        showFakePwd: false,
        pnError: pn && !isPhoneNumber(pn) ? i18n.__('Invalid Phone Number') : ''
      })
    }

    this.onPassword = (pwd) => {
      this.setState({ pwd, pwdError: '' })
    }

    this.handleSaveToken = () => {
      this.setState({ saveToken: !this.state.saveToken, autoLogin: false, showFakePwd: false })
    }

    this.handleAutologin = () => {
      this.setState({ autoLogin: !this.state.autoLogin })
      if (!this.state.autoLogin) this.setState({ saveToken: true })
    }

    this.clearPn = () => this.setState({ pn: '', pnError: '', showFakePwd: false })

    this.togglePwd = () => this.setState({ showPwd: !this.state.showPwd })

    this.login = () => {
      this.setState({ loading: true })
      this.props.phi.req(
        'token',
        { phonenumber: this.state.pn, password: md5(this.state.pwd).toUpperCase() },
        (err, res) => {
          if (err || (res && res.error !== '0')) {
            if (res && res.error === '7') this.setState({ pnError: i18n.__('User Not Exist'), loading: false })
            else if (res && res.error === '8') this.setState({ pwdError: i18n.__('Wrong Password'), loading: false })
            else if (res && res.error === '34') this.setState({ pnError: i18n.__('Invalid Phone Number'), loading: false })
            else if (res && res.error === '15') this.setState({ pwdError: i18n.__('Password Not Set'), loading: false })
            else if (res && res.error && res.message) this.setState({ pwdError: res.message, loading: false })
            else this.setState({ failed: true, loading: false })
          } else {
            this.props.phi.req('stationList', null, (e, r) => {
              if (e || !r.result || !Array.isArray(r.result.list) || r.error !== '0') {
                this.setState({ failed: true, loading: false })
              } else {
                const phi = {
                  pn: this.state.pn,
                  puid: res.uid,
                  autoLogin: !!this.state.autoLogin,
                  token: this.state.saveToken ? res.access_token : null
                }
                const list = r.result.list.filter(l => l.type === 'owner' ||
                  (l.accountStatus === '1' && ['pending', 'accept'].includes(l.inviteStatus)))
                this.props.onSuccess({ list, phonenumber: this.state.pn, phicommUserId: res.uid, phi })
              }
            })
          }
        }
      )
    }

    this.fakeLogin = () => {
      this.setState({ loading: true })
      /* assign token to PhiAPI */
      Object.assign(this.props.phi, { token: this.phi.token })
      this.props.phi.req('stationList', null, (e, r) => {
        if (e || !r.result || !Array.isArray(r.result.list) || r.error !== '0') {
          if (r && r.error === '5') this.setState({ showFakePwd: false, pwdError: i18n.__('Token Expired'), loading: false })
          else this.setState({ failed: true, loading: false })
        } else {
          const phi = {
            pn: this.state.pn,
            puid: this.phi.puid,
            autoLogin: !!this.state.autoLogin,
            token: this.state.saveToken ? this.phi.token : null
          }
          const list = r.result.list.filter(l => l.type === 'owner' ||
            (l.accountStatus === '1' && ['pending', 'accept'].includes(l.inviteStatus)))

          this.props.onSuccess({ list, phonenumber: this.state.pn, phicommUserId: this.phi.puid, phi })
        }
      })
    }

    this.reset = () => {
      this.setState({ failed: false, pnError: '', pwdError: '' })
    }

    this.onKeyDown = (e) => {
      if (e.which === 13 && this.shouldFire()) {
        if (this.state.showFakePwd) this.fakeLogin()
        else this.login()
      }
    }
  }

  componentDidMount () {
    this.phi = window.config && window.config.global && window.config.global.phi
    if (this.phi) {
      const { autoLogin, pn, token } = this.phi
      this.setState({ saveToken: !!token, autoLogin: !!autoLogin, pn: pn || '', showFakePwd: !!token })
      if (firstLogin && token && !!autoLogin) this.fakeLogin()
    }
    firstLogin = false
    this.setState({ status: 'account' })
  }

  shouldFire () {
    return (!this.state.loading && !this.state.pnError && this.state.pn &&
      !this.state.pwdError && (this.state.pwd || this.state.showFakePwd))
  }

  renderFailed () {
    return (
      <div style={{ width: 300, zIndex: 100 }} className="paper" >
        <div style={{ height: 59, display: 'flex', alignItems: 'center', paddingLeft: 20 }} className="title">
          { i18n.__('Phi Login Failed Title') }
        </div>
        <Divider style={{ marginLeft: 20, width: 260 }} />
        <div style={{ padding: 20, width: 'calc(100% - 40px)', color: '#888a8c' }}>
          { i18n.__('Phi Login Failed Text') }
        </div>
        <div style={{ height: 31, display: 'flex', alignItems: 'center', padding: '0 20px 20px 0' }}>
          <div style={{ flexGrow: 1 }} />
          <RSButton label={i18n.__('Cancel')} onClick={this.reset} alt />
          <div style={{ width: 10 }} />
          <RSButton label={i18n.__('OK')} onClick={this.props.enterLANLoginList} />
        </div>
      </div>
    )
  }

  renderWisnucLogin () {
    return (
      <div>
        <div style={{ width: 328, margin: '0 auto', position: 'relative' }}>
          <LoginTF
            floatingLabelText={i18n.__('Phone Number')}
            type="text"
            errorText={this.state.pnError}
            value={this.state.pn}
            maxLength={11}
            onChange={e => this.onPhoneNumber(e.target.value)}
          />
          {
            this.state.showFakePwd
              ? (
                <LoginTF
                  floatingLabelText={i18n.__('Password')}
                  type="password"
                  value="**********"
                  onClick={() => this.setState({ showFakePwd: false })}
                  errorText={this.state.pwdError}
                />
              ) : (
                <LoginTF
                  type={this.state.showPwd ? 'text' : 'password'}
                  floatingLabelText={i18n.__('Password')}
                  errorText={this.state.pwdError}
                  value={this.state.pwd}
                  onChange={e => this.onPassword(e.target.value)}
                  onKeyDown={this.onKeyDown}
                />
              )
          }
          {/* icon of phone */}
          <div style={{ position: 'absolute', left: 0, top: 64 }}>
            <MobileIcon />
          </div>
          {/* icon of password */}
          <div style={{ position: 'absolute', left: 0, top: 160 }}>
            <LockIcon />
          </div>

          {/* clear password */}
          {
            !!this.state.pn && (
              <div style={{ position: 'absolute', right: 0, top: 64 }}>
                <TFButton icon={WinCloseIcon} onClick={this.clearPn} />
              </div>
            )
          }

          {/* password visibility */}
          {
            !this.state.showFakePwd && (
              <div style={{ position: 'absolute', right: 0, top: 160 }}>
                <TFButton icon={this.state.showPwd ? EyeOpenIcon : EyeOffIcon} onClick={this.togglePwd} />
              </div>
            )
          }
        </div>
        <div style={{ display: 'flex', height: 48, width: 328, alignItems: 'center', margin: '0 auto' }}>
          <Checkbox
            label={i18n.__('Remember Password')}
            checkedIcon={<CheckBoxOutlineIcon style={{ color: '#009688' }} />}
            disableTouchRipple
            style={{ width: 108, marginTop: 4 }}
            iconStyle={{ height: 18, width: 18, marginTop: 1, fill: this.state.saveToken ? '#009688' : 'rgba(0,0,0,.25)' }}
            labelStyle={{ fontSize: 12, color: 'rgba(0,0,0,.76)', marginLeft: -9 }}
            checked={this.state.saveToken}
            onCheck={() => this.handleSaveToken()}
          />
          <Checkbox
            label={i18n.__('Auto Login')}
            checkedIcon={<CheckBoxOutlineIcon style={{ color: '#009688' }} />}
            disableTouchRipple
            style={{ width: 108, marginLeft: -12, marginTop: 4 }}
            iconStyle={{ height: 18, width: 18, marginTop: 1, fill: this.state.autoLogin ? '#009688' : 'rgba(0,0,0,.25)' }}
            labelStyle={{ fontSize: 12, color: 'rgba(0,0,0,.76)', marginLeft: -9 }}
            checked={this.state.autoLogin}
            onCheck={() => this.handleAutologin()}
          />
          <div style={{ flexGrow: 1 }} />
          <div style={{ marginRight: -8 }}>
            <FLButton
              labelStyle={{ fontSize: 12 }}
              label={i18n.__('Forget Password')}
              onClick={() => this.setState({ status: 'retrievePwd' })}
            />
          </div>
        </div>
        <div style={{ height: 24 }} />
        <div style={{ width: 328, height: 40, margin: '0 auto' }}>
          <RRButton
            label={this.state.loading ? i18n.__('Logging') : i18n.__('Login')}
            onClick={() => (this.state.showFakePwd ? this.fakeLogin() : this.login())}
            disabled={!this.shouldFire()}
            loading={this.state.loading}
          />
        </div>
        {/*
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', height: 50, color: '#85868c' }}>
          <div style={{ width: '50%', textAlign: 'right' }}>
            <FLButton
              label={i18n.__('Sign Up')}
              onClick={() => shell.openExternal(phiSignupUrl)}
            />
          </div>
          <div style={{ width: 1, height: 10, backgroundColor: 'rgba(0,0,0,.38)' }} />
        </div>
        */}
      </div>
    )
  }

  render () {
    const { status } = this.state
    const isLogin = ['account', 'wechat'].includes(status)
    const headerStyle = {
      width: 328,
      height: 32,
      fontSize: 28,
      display: 'flex',
      alignItems: 'center',
      marginTop: 72,
      paddingLeft: 176
    }

    let view = null
    switch (status) {
      case 'account':
        view = this.renderWisnucLogin()
        break
      case 'wechat':
        view = <WeChatLogin {...this.props} />
        break
      case 'retrievePwd':
        view = <RetrievePwd {...this.props} backToLogin={() => this.setState({ status: 'account' })} />
        break
      default:
        break
    }

    return (
      <div style={{ width: 680, zIndex: 100, height: 510, position: 'relative' }} >
        {
          isLogin &&
            <div style={headerStyle}>
              <div
                style={{ opacity: status === 'account' ? 0.87 : 0.12, cursor: 'pointer' }}
                onClick={() => this.setState({ status: 'account' })}
              >
                { i18n.__('Account Login') }
              </div>
              <div
                style={{ marginLeft: 32, opacity: this.state.status === 'wechat' ? 0.87 : 0.12, cursor: 'pointer' }}
                onClick={() => this.setState({ status: 'wechat' })}
              >
                { i18n.__('Wechat Login') }
              </div>
            </div>
        }
        { view }
        <div style={{ position: 'absolute', left: 48, top: 64 }}>
          <WisnucLogo style={{ width: 55, height: 55, color: '#00695c' }} />
        </div>

        {/* Phi Login Failed */}
        <Dialog open={!!this.state.failed} onRequestClose={() => this.setState({ failed: false })} modal >
          { !!this.state.failed && this.renderFailed() }
        </Dialog>
      </div>
    )
  }
}

export default WisnucLogin
