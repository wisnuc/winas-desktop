import i18n from 'i18n'
import React from 'react'
import { isPhoneNumber } from '../common/validate'
import { CheckOutlineIcon, CheckedIcon } from '../common/Svg'
import { RRButton, PwdTF, FLButton } from '../common/Buttons'

class RetrievePwd extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      status: 'retrievePwd',
      pn: '',
      pnError: '',
      code: '',
      codeError: '',
      error: '',
      newPwd: '',
      newPwdAgain: '',
      time: 0
    }

    this.onPhoneNumber = (pn) => {
      if (isPhoneNumber(pn)) this.setState({ pn, pnError: '' })
      else this.setState({ pnError: i18n.__('Invalid Phone Number'), pn })
    }

    this.onVerificationCode = (code) => {
      this.setState({ code })
    }

    this.onNewPwd = (newPwd) => {
      this.setState({ newPwd })
    }

    this.onNewPwdAgain = (newPwdAgain) => {
      this.setState({ newPwdAgain })
    }

    this.sendCode = () => {
      this.setState({ time: 60 })
      this.timer = setInterval(() => this.state.time > 0 && this.setState({ time: this.state.time - 1 }), 1000)
    }

    this.checkCode = () => {
      this.setState({ status: 'setPwd' })
    }

    this.updatePwd = () => {
      this.setState({ status: 'success' })
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

  shouldCheckCode () {
    return !this.state.loading && !this.state.pnError && this.state.pn && !this.state.codeError && this.state.code &&
      this.state.pn.length === 11 && this.state.code.length === 4
  }

  shouldUpdatePwd () {
    return !this.state.loading && !this.state.pnError && this.state.pn && !this.state.codeError && this.state.code &&
      this.state.pn.length === 11 && this.state.code.length === 4
  }

  render () {
    const headerStyle = {
      width: 328,
      height: 32,
      fontSize: 28,
      display: 'flex',
      alignItems: 'center',
      marginTop: 72,
      paddingLeft: 176
    }
    const rp = this.state.status === 'retrievePwd'
    return (
      <div>
        <div style={headerStyle}>
          <div style={{ opacity: 0.8 }}>
            { rp ? i18n.__('Retrieve Password') : i18n.__('Set Password') }
          </div>
          <div style={{ flexGrow: 1 }} />
          {
            this.state.status !== 'success' &&
              <FLButton
                labelStyle={{ fontSize: 14, fontWeight: 500, color: 'rgba(0,150,136,.76)', marginRight: -8 }}
                label={i18n.__('Login')}
                onClick={this.props.backToLogin}
              />
          }
        </div>
        {
          this.state.status === 'success' ? this.renderSuccess()
            : rp ? (
              <div style={{ width: '100%', height: 400, overflow: 'hidden' }}>
                <div style={{ width: 328, margin: '0 auto', position: 'relative' }}>
                  <div style={{ height: 40 }} />
                  <PwdTF
                    hintText={i18n.__('Phone Number')}
                    type="text"
                    errorText={this.state.pnError}
                    value={this.state.pn}
                    maxLength={11}
                    onChange={e => this.onPhoneNumber(e.target.value)}
                  />
                  <div style={{ height: 16 }} />
                  <PwdTF
                    hintText={i18n.__('Verification Code Hint')}
                    type="text"
                    errorText={this.state.codeError}
                    value={this.state.code}
                    maxLength={4}
                    onChange={e => this.onVerificationCode(e.target.value)}
                  />
                  <div style={{ height: 24 }} />
                  <div style={{ width: 328, height: 40, margin: '0 auto' }}>
                    <RRButton
                      label={i18n.__('Next Step to Set Password')}
                      onClick={this.checkCode}
                      disabled={!this.shouldCheckCode()}
                      loading={this.state.loading}
                    />
                  </div>
                  { rp && this.renderSendCode() }
                </div>
              </div>
            )
              : (
                <div style={{ width: '100%', height: 400, overflow: 'hidden' }}>
                  <div style={{ width: 328, margin: '0 auto', position: 'relative' }}>
                    <div style={{ height: 40 }} />
                    <PwdTF
                      hintText={i18n.__('New Password Hint')}
                      type="password"
                      errorText={this.state.newPwdError}
                      value={this.state.newPwd}
                      onChange={e => this.onNewPwd(e.target.value)}
                    />
                    <div style={{ height: 16 }} />
                    <PwdTF
                      hintText={i18n.__('New Password Again Hint')}
                      type="password"
                      errorText={this.state.newPwdAgainError}
                      value={this.state.newPwdAgain}
                      onChange={e => this.onNewPwdAgain(e.target.value)}
                    />
                    <div style={{ height: 24 }} />
                    <div style={{ width: 328, height: 40, margin: '0 auto' }}>
                      <RRButton
                        label={i18n.__('OK')}
                        onClick={this.updatePwd}
                        disabled={!this.shouldUpdatePwd()}
                        loading={this.state.loading}
                      />
                    </div>
                  </div>
                </div>
              )
        }
      </div>
    )
  }
}

export default RetrievePwd
