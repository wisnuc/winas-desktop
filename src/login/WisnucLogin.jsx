import React from 'react'
import i18n from 'i18n'
import { Divider, Checkbox } from 'material-ui'
import WeChatLogin from './WeChatLogin'
import RetrievePwd from './RetrievePwd'
import Dialog from '../common/PureDialog'
import FlatButton from '../common/FlatButton'
import { isPhoneNumber } from '../common/validate'
import { RRButton, FLButton, RSButton, TFButton, LoginTF } from '../common/Buttons'
import { EyeOpenIcon, EyeOffIcon, WinCloseIcon, CheckBoxOutlineIcon, WisnucLogo, AccountIcon, ArrowDownIcon } from '../common/Svg'

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
      status: 'phone'
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

    this.checkPhone = () => {
      this.setState({ loading: true })
      this.props.phi.req('checkUser', { phone: this.state.pn }, (err, res) => {
        if (err) this.setState({ pnError: i18n.__('User Not Exist'), loading: false })
        else this.setState({ status: 'password', loading: false })
      })
    }

    this.login = () => {
      this.setState({ loading: true })
      const clientId = window.config && window.config.machineId && window.config.machineId.slice(0, 8)
      this.props.phi.req(
        'token',
        { phonenumber: this.state.pn, password: this.state.pwd, clientId },
        (err, res) => {
          if (err || !res) {
            if (res && res.error === '7') this.setState({ pnError: i18n.__('User Not Exist'), loading: false })
            else if (res && res.error === '8') this.setState({ pwdError: i18n.__('Wrong Password'), loading: false })
            else if (res && res.error === '34') this.setState({ pnError: i18n.__('Invalid Phone Number'), loading: false })
            else if (res && res.error === '15') this.setState({ pwdError: i18n.__('Password Not Set'), loading: false })
            else if (res && res.error && res.message) this.setState({ pwdError: res.message, loading: false })
            else this.setState({ failed: true, loading: false })
          } else {
            this.props.phi.req('stationList', null, (e, r) => {
              console.log('stationList e r', e, r)
              if (e || !r) {
                this.setState({ failed: true, loading: false })
              } else {
                const phi = Object.assign({}, res, {
                  pn: this.state.pn,
                  winasUserId: res.id,
                  autoLogin: !!this.state.autoLogin,
                  token: this.state.saveToken ? res.token : null
                })
                this.setState({ loading: false })
                const list = r.ownStations
                this.props.onSuccess({ list, phonenumber: this.state.pn, winasUserId: res.id, phi })
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
        if (e || !r) {
          if (r && r.error === '5') this.setState({ showFakePwd: false, pwdError: i18n.__('Token Expired'), loading: false })
          else this.setState({ failed: true, loading: false })
        } else {
          const phi = Object.assign({}, this.phi, {
            pn: this.state.pn,
            winasUserId: this.phi.winasUserId,
            autoLogin: !!this.state.autoLogin,
            token: this.state.saveToken ? this.phi.token : null
          })
          this.setState({ loading: false })
          const list = r.ownStations
          this.props.onSuccess({ list, phonenumber: this.state.pn, winasUserId: this.phi.winasUserId, phi })
        }
      })
    }

    this.reset = () => {
      this.setState({ failed: false, pnError: '', pwdError: '' })
    }

    this.enterLAN = () => {
      this.setState({ failed: false })
      this.props.enterLANLoginList()
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
    this.setState({ status: 'phone' })
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
          <RSButton label={i18n.__('OK')} onClick={this.enterLAN} />
        </div>
      </div>
    )
  }

  tmp () {
    return (
      <div>
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
          <div style={{ flexGrow: 1 }} />
          <div style={{ marginRight: -8 }}>
            <FLButton
              labelStyle={{ fontSize: 12 }}
              label={i18n.__('Forget Password')}
              onClick={() => this.setState({ status: 'retrievePwd' })}
            />
          </div>
        </div>
        <LoginTF
          floatingLabelText={i18n.__('Password')}
          type="password"
          value="**********"
          onClick={() => this.setState({ showFakePwd: false })}
          errorText={this.state.pwdError}
        />
      </div>
    )
  }

  render () {
    const { status, pn, pnError, pwd, pwdError } = this.state

    let next = () => {}
    let disabled = false
    switch (status) {
      case 'phone':
        next = this.checkPhone
        disabled = !pn || pnError
        break
      case 'password':
        next = this.login
        disabled = !pwd || pwdError
        break
      default:
        break
    }

    return (
      <div style={{ width: 450, zIndex: 100, height: 380, position: 'relative' }} >
        <div style={{ display: 'flex', alignItems: 'center', height: 32, marginTop: 120, paddingLeft: 80 }}>
          <div style={{ fontSize: 28, display: 'flex', alignItems: 'center' }} >
            { i18n.__('Account Login') }
          </div>
          {
            status === 'password' &&
              <div
                style={{
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 14,
                  padding: '0px 8px',
                  marginLeft: 16,
                  cursor: 'pointer',
                  border: 'solid 1px rgba(0,0,0,.12)'
                }}
              >
                <AccountIcon style={{ width: 18, height: 18 }} />
                <div style={{ fontWeight: 500, marginLeft: 4 }}>
                  { this.state.pn }
                </div>
                <ArrowDownIcon />
              </div>
          }
        </div>
        <div style={{ width: 290, margin: '36px auto', position: 'relative', height: 72 }}>
          {
            status === 'phone' &&
            <LoginTF
              floatingLabelText={i18n.__('Phone Number')}
              type="text"
              errorText={this.state.pnError}
              value={this.state.pn}
              maxLength={11}
              onChange={e => this.onPhoneNumber(e.target.value)}
            />
          }
          {
            status === 'password' &&
              <LoginTF
                type={this.state.showPwd ? 'text' : 'password'}
                floatingLabelText={i18n.__('Password')}
                errorText={this.state.pwdError}
                value={this.state.pwd}
                onChange={e => this.onPassword(e.target.value)}
                onKeyDown={this.onKeyDown}
              />
          }
          {/* clear password */}
          {
            !!this.state.pn && status === 'phone' && (
              <div style={{ position: 'absolute', right: 0, top: 36 }}>
                <TFButton icon={WinCloseIcon} onClick={this.clearPn} />
              </div>
            )
          }
          {/* password visibility */}
          {
            status === 'password' && (
              <div style={{ position: 'absolute', right: 0, top: 36 }}>
                <TFButton icon={this.state.showPwd ? EyeOpenIcon : EyeOffIcon} onClick={this.togglePwd} />
              </div>
            )
          }
          {
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 68,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end'
              }}
            >
              <Checkbox
                label={i18n.__('Auto Login')}
                checkedIcon={<CheckBoxOutlineIcon style={{ color: '#009688' }} />}
                disableTouchRipple
                iconStyle={{ height: 18, width: 18, marginTop: 1, fill: this.state.autoLogin ? '#009688' : 'rgba(0,0,0,.25)' }}
                labelStyle={{ fontSize: 12, color: 'rgba(0,0,0,.76)', marginLeft: -9, width: '' }}
                checked={this.state.autoLogin}
                onCheck={() => this.handleAutologin()}
              />
            </div>
          }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', width: 290, margin: '64px auto' }}>
          <div style={{ width: 200, height: 32 }}>
            {
              status === 'password'
                ? <FlatButton label={i18n.__('Forget Password')} primary labelStyle={{ fontSize: 14 }} />
                : <WisnucLogo style={{ width: 32, height: 32 }} />
            }
          </div>
          <div style={{ flexGrow: 1 }} />
          <div style={{ width: 80, height: 32 }}>
            <RRButton
              style={{ width: 80, height: 32 }}
              label={i18n.__('Next Step')}
              onClick={next}
              disabled={disabled}
              loading={this.state.loading}
            />
          </div>
        </div>
        {/* footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            height: 40,
            width: '100%',
            fontSize: 12,
            color: 'rgba(0,0,0,.38)',
            boxSizing: 'border-box'
          }}
          className="flexCenter"
        >
          <div>
            { `©${new Date().getFullYear()}${i18n.__('Copyright Info')}` }
          </div>
          <div style={{ marginLeft: 20 }}>
            { i18n.__('Client Version %s', global.config && global.config.appVersion) }
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

export default WisnucLogin
