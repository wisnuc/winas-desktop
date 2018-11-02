import React from 'react'
import i18n from 'i18n'
import { FailedIcon, CheckOutlineIcon } from '../common/Svg'
import { RRButton, PwdTF, FLButton } from '../common/Buttons'

class RetrievePwd extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      error: '',
      time: 0
    }

    this.onPhoneNumber = (pn) => {
      this.setState({ pn })
    }

    this.onVerificationCode = (code) => {
      this.setState({ code })
    }

    this.sendCode = () => {
      this.setState({ time: 60 })
      this.timer = setInterval(() => this.state.time > 0 && this.setState({ time: this.state.time - 1 }), 1000)
    }

    this.fire = () => {
    }
  }

  renderSuccess () {
    const text = i18n.__('Not Registered User')
    return (
      <div style={{ width: 380, height: 360, backgroundColor: '#FFF', zIndex: 100, margin: '0 auto' }}>
        {/* content */}
        <div style={{ height: 104, paddingTop: 32 }} className="flexCenter">
          <FailedIcon style={{ color: '#f44336', height: 72, width: 72 }} />
        </div>

        <div style={{ fontSize: 14, color: '#f44336' }} className="flexCenter">
          { text }
        </div>

        <div style={{ height: 32 }} />
        {/* button */}
        <div style={{ width: 328, height: 40, margin: '0 auto' }}>
          <RRButton
            label={i18n.__('Return')}
            onClick={this.resetWCL}
          />
        </div>
      </div>
    )
  }

  renderSendCode () {
    const isCodeSent = this.state.time > 0
    return (
      <div>
        <div style={{ position: 'absolute', top: 44, right: 8 }}>
          <FLButton
            label={isCodeSent ? i18n.__('%s Later to Send Verification Code', this.state.time) : i18n.__('Send Verification Code')}
            style={{ color: 'rgba(0,0,0,.26)', fontSize: 12 }}
            disabled={isCodeSent}
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

  shouldFire () {
    return true
  }

  render () {
    return (
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
              onClick={this.fire}
              disabled={!this.shouldFire()}
              loading={this.state.loading}
            />
          </div>
          { this.renderSendCode() }
        </div>
      </div>
    )
  }
}

export default RetrievePwd
