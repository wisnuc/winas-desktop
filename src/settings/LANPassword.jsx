import i18n from 'i18n'
import React from 'react'
import { validatePassword } from '../common/validate'
import { EyeOpenIcon, EyeOffIcon } from '../common/Svg'
import { RRButton, TFButton, TextField } from '../common/Buttons'

class LANPassword extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      pwd: '',
      pwdError: '',
      newPwd: '',
      newPwdError: '',
      error: '',
      loading: false,
      showPwd: false
    }

    this.toggle = op => this.setState({ [op]: !this.state[op] })

    this.onPwd = (pwd) => {
      this.setState({ pwd, pwdError: '' })
    }

    this.onNewPwd = (pwd) => {
      this.setState({ newPwd: pwd }, () => {
        if (this.state.newPwd.length === 0) {
          this.setState({ newPwdError: i18n.__('Empty Password Error') })
        } else if (!validatePassword(pwd)) {
          this.setState({ newPwdError: i18n.__('Invalid Password Error') })
        } else if (this.state.newPwd.length > 64) {
          this.setState({ newPwdError: i18n.__('Password Too Long Error') })
        } else {
          this.setState({ newPwdError: '' })
        }
      })
    }

    this.save = () => {
      if (this.state.newPwd.length < 8) {
        this.setState({ newPwdError: i18n.__('Password Too Short Error') })
      } else {
        this.setState({ loading: true })

        const cb = (err, res) => {
          if (err) {
            console.error('Set LAN Password Error', err)
            if (err && err.message === 'Unauthorized') this.setState({ pwdError: i18n.__('Previous Password Wrong') })
            this.props.openSnackBar(i18n.__('Set LAN Password Error'))
          } else this.props.openSnackBar(i18n.__('Set LAN Password Success'))
          this.setState({ loading: false })
        }

        if (this.props.isLAN) this.props.apis.pureRequest('setLANPassword', { prePwd: this.state.pwd, newPwd: this.state.newPwd }, cb)
        else {
          const userUUID = this.props.apis.account && this.props.apis.account.data && this.props.apis.account.data.uuid
          const deviceSN = this.props.selectedDevice && this.props.selectedDevice.mdev.deviceSN
          this.props.phi.req('setLANPassword', { userUUID, password: this.state.newPwd, deviceSN }, cb)
        }
      }
    }

    this.togglePwd = () => this.setState({ showPwd: !this.state.showPwd })

    this.onKeyDown = (e) => {
      if (e.which === 13 && this.shouldFire()) this.save()
    }
  }

  shouldFire () {
    return this.props.isLAN
      ? (this.state.pwd && !this.state.pwdError && !this.state.loading && this.state.newPwd && !this.state.newPwdError)
      : (!this.state.loading && this.state.newPwd && !this.state.newPwdError)
  }

  render () {
    const { isLAN } = this.props
    return (
      <div style={{ width: '100%', height: '100%' }} className="flexCenter" >
        <div style={{ width: 480, paddingRight: 160, paddingBottom: 60 }}>
          <div style={{ height: 180, width: 320, paddingLeft: 160 }} className="flexCenter">
            <img
              style={{ width: 320, height: 180 }}
              src="./assets/images/pic_offlinepassword.png"
              alt=""
            />
          </div>

          <div style={{ width: 320, color: '#888a8c', paddingLeft: 160, height: 60, display: 'flex', alignItems: 'center' }} >
            { isLAN ? i18n.__('LAN Password Description') : i18n.__('Reset Password Description') }
          </div>

          {/* prePassword */}
          { isLAN && <div style={{ height: 30 }} /> }
          {
            isLAN &&
              <div style={{ height: 40, width: '100%', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 130, textAlign: 'right', color: '#525a60' }}>
                  { i18n.__('Pre Password') }
                </div>
                <div style={{ width: 30 }} />
                <div style={{ width: 320, marginTop: -30, position: 'relative' }}>
                  <TextField
                    hintText={i18n.__('Pre LAN Password Hint')}
                    type={this.state.showPwd ? 'text' : 'password'}
                    errorText={this.state.pwdError}
                    value={this.state.pwd}
                    onChange={e => this.onPwd(e.target.value)}
                    disabled={this.state.loading}
                  />
                  <div style={{ position: 'absolute', right: 0, top: 35 }}>
                    <TFButton icon={this.state.showPwd ? EyeOpenIcon : EyeOffIcon} onClick={() => this.toggle('showPwd')} />
                  </div>
                </div>
              </div>
          }

          {/* new Password */}
          <div style={{ height: 30 }} />
          <div style={{ height: 40, width: '100%', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 130, textAlign: 'right', color: '#525a60' }}>
              { i18n.__('New Password') }
            </div>
            <div style={{ width: 30 }} />
            <div style={{ width: 320, marginTop: -30, position: 'relative' }}>
              <TextField
                hintText={i18n.__('New LAN Password Hint')}
                type={this.state.showNewPwd ? 'text' : 'password'}
                errorText={this.state.newPwdError}
                value={this.state.newPwd}
                onChange={e => this.onNewPwd(e.target.value)}
                disabled={this.state.loading}
                onKeyDown={this.onKeyDown}
              />
              {/* clear password */}
              <div style={{ position: 'absolute', right: 0, top: 35 }}>
                <TFButton icon={this.state.showNewPwd ? EyeOpenIcon : EyeOffIcon} onClick={() => this.toggle('showNewPwd')} />
              </div>
            </div>
          </div>

          <div style={{ height: 40 }} />
          <div style={{ width: 240, height: 40, margin: '0 auto', paddingLeft: 160 }}>
            <RRButton
              label={this.state.loading ? i18n.__('Saving') : i18n.__('Save')}
              onClick={this.save}
              disabled={!this.shouldFire()}
              loading={this.state.loading}
            />
          </div>
        </div>
      </div>
    )
  }
}

export default LANPassword
