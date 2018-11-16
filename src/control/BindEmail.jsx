import i18n from 'i18n'
import React from 'react'
import validator from 'validator'
import { TextField } from 'material-ui'

import { CloseIcon, CheckedIcon, FailedIcon } from '../common/Svg'
import { LIButton, PwdTF, RSButton } from '../common/Buttons'

class BindEmail extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      status: 'email',
      confirmed: false,
      code1: '',
      code2: '',
      code3: '',
      code4: '',
      email: ''
    }

    this.fire = () => {
      if (this.state.fired) return
      this.setState({ confirmed: true })
    }

    this.onEmail = (email) => {
      this.setState({ email, emailError: '' })
    }

    this.onKeyDown = (pos, key) => {
      if (key === 'Backspace' && pos > 1 && !this.state[`code${pos}`]) {
        this[`ref${pos - 1}`].focus()
        this[`ref${pos - 1}`].select()
      }
    }

    this.onCode = (pos, code) => {
      setTimeout(() => this.setState({ [`code${pos}`]: code }, () => {
        if (code && pos < 4) {
          this[`ref${pos + 1}`].focus()
          this[`ref${pos + 1}`].select()
        }
      }), 10)
    }

    this.checkEmail = () => {
      if (!validator.isEmail(this.state.email)) this.setState({ emailError: i18n.__('Not Email') })
      else {
        this.props.phi.req('emailCode', { email: this.state.email }, (err, res) => {
          if (err) this.setState({ emailError: i18n.__('Send Code To Email Error') })
          else this.setState({ status: 'code' })
        })
      }
    }

    this.checkCode = () => {
      const code = [1, 2, 3, 4].map(v => this.state[`code${v}`]).join('')
      this.props.phi.req('bindEmail', { email: this.state.email, code }, (err, res) => {
        if (err) this.setState({ status: 'failed' })
        else this.setState({ status: 'success' })
      })
    }
  }

  renderEmailInput () {
    return (
      <div style={{ height: 40, width: 300, margin: '56px auto 0 auto' }}>
        <PwdTF
          hintText={i18n.__('Email')}
          type="text"
          errorText={this.state.emailError}
          value={this.state.email}
          onChange={e => this.onEmail(e.target.value)}
        />
      </div>
    )
  }

  renderCodeInput () {
    const style = { width: 48, height: 48, borderBottom: 'solid 2px rgba(0,0,0,.38)', marginLeft: 16 }
    const inputStyle = { fontSize: 48, textAlign: 'center' }
    return (
      <div style={{ height: 40, width: 272, margin: '56px auto 0 auto' }}>
        {
          [1, 2, 3, 4].map(i => (
            <TextField
              key={i.toString()}
              name={`code${i}`}
              ref={ref => (this[`ref${i}`] = ref)}
              value={this.state[`code${i}`]}
              maxLength={1}
              onChange={e => this.onCode(i, e.target.value.toUpperCase())}
              onKeyDown={e => this.onKeyDown(i, e.key)}
              underlineShow={false}
              inputStyle={inputStyle}
              style={style}
            />
          ))
        }
      </div>
    )
  }

  renderBindResult (success) {
    return (
      <div style={{ marginTop: 49 }}>
        <div style={{ margin: '0 auto', maxWidth: 'fit-content' }}>
          {
            success ? <CheckedIcon style={{ color: '#4caf50', height: 72, width: 72 }} />
              : <FailedIcon style={{ color: '#f44336', height: 72, width: 72 }} />
          }
        </div>
        <div style={{ fontWeight: 500, color: 'rgba(0,0,0,.76)', margin: '3px auto 0 auto', maxWidth: 'fit-content' }}>
          { success ? i18n.__('Bind Email Success') : i18n.__('Bind Email Failed') }
        </div>
      </div>
    )
  }

  render () {
    let [title, hint, view, button] = ['', '', null, null]
    switch (this.state.status) {
      case 'email':
        title = i18n.__('Bind Email')
        hint = i18n.__('Bind Email Hint')
        view = this.renderEmailInput()
        button = (
          <RSButton
            alt
            label={i18n.__('Next Step')}
            disabled={!this.state.email || this.state.emailError}
            onClick={this.checkEmail}
          />
        )
        break
      case 'code':
        title = i18n.__('Input Code')
        hint = i18n.__('Input Code Hint', this.state.email)
        view = this.renderCodeInput()
        button = (
          <RSButton
            alt
            label={i18n.__('Confirm')}
            disabled={[1, 2, 3, 4].some(v => !this.state[`code${v}`])}
            onClick={this.checkCode}
          />
        )
        break
      case 'success':
        title = i18n.__('Bind Email')
        hint = i18n.__('Bind Email Success')
        view = this.renderBindResult(true)
        break
      case 'failed':
        title = i18n.__('Bind Email')
        hint = i18n.__('Bind Email Failed')
        view = this.renderBindResult(false)
        break
      default:
        break
    }
    return (
      <div
        style={{
          width: 440,
          height: 296,
          borderRadius: 2,
          backgroundColor: '#FFF',
          boxShadow: '0px 5px 6.6px 0.4px rgba(96,125,139,.24), 0px 2px 9.8px 0.2px rgba(96,125,139,.16)'
        }}
      >
        <div style={{ height: 56, position: 'relative', paddingLeft: 24, paddingTop: 16 }} >
          <div style={{ height: 24, fontSize: 16, fontWeight: 500 }}>
            { title }
          </div>
          <div style={{ height: 22, fontSize: 14, color: 'rgba(0,0,0,.54)' }}>
            { hint }
          </div>
          <div style={{ position: 'absolute', top: 12, right: 4 }}>
            <LIButton iconStyle={{ width: 18, height: 18 }} onClick={this.props.onRequestClose}>
              <CloseIcon />
            </LIButton>
          </div>
        </div>
        { view }
        <div
          style={{
            height: 72,
            marginTop: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 24
          }}
        >
          { button }
        </div>
      </div>
    )
  }
}

export default BindEmail
