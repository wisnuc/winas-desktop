import md5 from 'md5'
import React from 'react'
import i18n from 'i18n'
import { shell } from 'electron'
import { Divider } from 'material-ui'
import Dialog from '../common/PureDialog'
import { isPhoneNumber } from '../common/validate'
import { EyeOpenIcon, EyeOffIcon, DelPwdIcon } from '../common/Svg'
import { RRButton, FLButton, RSButton, TFButton, Checkbox, TextField } from '../common/Buttons'

const phiSignupUrl = 'https://mall.phicomm.com/passport-signup.html'
const phiResetPwdUrl = 'https://mall.phicomm.com/passport-reset_password.html'
let firstLogin = true

class PhiLogin extends React.Component {
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
      showFakePwd: false
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

  render () {
    return (
      <div style={{ width: 320, zIndex: 100 }} className="paper" >
        <div style={{ height: 59, display: 'flex', alignItems: 'center', paddingLeft: 20 }} className="title">
          { i18n.__('Login') }
        </div>
        <Divider style={{ marginLeft: 20, width: 280 }} className="divider" />
        <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            style={{ width: 280, height: 150 }}
            src="./assets/images/pic-login.png"
            alt=""
          />
        </div>
        <div style={{ width: 280, margin: '0 auto', position: 'relative' }}>
          <TextField
            hintText={i18n.__('Phone Number Hint')}
            type="text"
            errorText={this.state.pnError}
            value={this.state.pn}
            maxLength={11}
            onChange={e => this.onPhoneNumber(e.target.value)}
          />
          {
            this.state.showFakePwd
              ? (
                <TextField
                  type="password"
                  value="**********"
                  onClick={() => this.setState({ showFakePwd: false })}
                  errorText={this.state.pwdError}
                />
              ) : (
                <TextField
                  type={this.state.showPwd ? 'text' : 'password'}
                  hintText={i18n.__('Password Hint')}
                  errorText={this.state.pwdError}
                  value={this.state.pwd}
                  onChange={e => this.onPassword(e.target.value)}
                  onKeyDown={this.onKeyDown}
                />
              )
          }

          {/* clear password */}
          {
            !!this.state.pn && (
              <div style={{ position: 'absolute', right: 0, top: 35 }}>
                <TFButton icon={DelPwdIcon} onClick={this.clearPn} />
              </div>
            )
          }

          {/* password visibility */}
          {
            !this.state.showFakePwd && (
              <div style={{ position: 'absolute', right: 0, top: 105 }}>
                <TFButton icon={this.state.showPwd ? EyeOpenIcon : EyeOffIcon} onClick={this.togglePwd} />
              </div>
            )
          }
        </div>
        <div style={{ display: 'flex', width: 280, height: 40, alignItems: 'center', margin: '0 auto' }}>
          <Checkbox
            label={i18n.__('Remember Password')}
            disableTouchRipple
            style={{ width: 140 }}
            iconStyle={{ height: 18, width: 18, marginTop: 2, fill: this.state.saveToken ? '#31a0f5' : 'rgba(0,0,0,.25)' }}
            labelStyle={{ fontSize: 14, color: '#85868c', marginLeft: -9 }}
            checked={this.state.saveToken}
            onCheck={() => this.handleSaveToken()}
          />
          <Checkbox
            label={i18n.__('Auto Login')}
            disableTouchRipple
            style={{ width: 140 }}
            iconStyle={{ height: 18, width: 18, marginTop: 2, fill: this.state.autoLogin ? '#31a0f5' : 'rgba(0,0,0,.25)' }}
            labelStyle={{ fontSize: 14, color: '#85868c', marginLeft: -9 }}
            checked={this.state.autoLogin}
            onCheck={() => this.handleAutologin()}
          />
        </div>
        <div style={{ height: 20 }} />
        <div style={{ width: 240, height: 40, margin: '0 auto' }}>
          <RRButton
            label={this.state.loading ? i18n.__('Logging') : i18n.__('Login')}
            onClick={() => (this.state.showFakePwd ? this.fakeLogin() : this.login())}
            disabled={!this.shouldFire()}
            loading={this.state.loading}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', height: 50, color: '#85868c' }}>
          <div style={{ width: '50%', textAlign: 'right' }}>
            <FLButton
              label={i18n.__('Sign Up')}
              onClick={() => shell.openExternal(phiSignupUrl)}
            />
          </div>
          <div style={{ width: 1, height: 10, backgroundColor: 'rgba(0,0,0,.38)' }} />
          <div style={{ width: '50%', textAlign: 'left' }}>
            <FLButton
              label={i18n.__('Forget Password')}
              onClick={() => shell.openExternal(phiResetPwdUrl)}
            />
          </div>
        </div>

        {/* Phi Login Failed */}
        <Dialog open={!!this.state.failed} onRequestClose={() => this.setState({ failed: false })} modal >
          { !!this.state.failed && this.renderFailed() }
        </Dialog>
      </div>
    )
  }
}

export default PhiLogin
