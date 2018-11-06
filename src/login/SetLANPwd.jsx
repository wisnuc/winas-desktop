import i18n from 'i18n'
import React from 'react'
import { Divider } from 'material-ui'
import { validatePassword } from '../common/validate'
import { EyeOpenIcon, EyeOffIcon } from '../common/Svg'
import { RRButton, TFButton, TextField } from '../common/Buttons'

class SetLANPwd extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      pwd: '',
      pwdError: '',
      error: '',
      loading: false,
      showPwd: false
    }

    this.onPassword = (pwd) => {
      this.setState({ pwd }, () => {
        if (this.state.pwd.length === 0) {
          this.setState({ pwdError: i18n.__('Empty Password Error') })
        } else if (!validatePassword(pwd)) {
          this.setState({ pwdError: i18n.__('Invalid Password Error') })
        } else if (this.state.pwd.length > 64) {
          this.setState({ pwdError: i18n.__('Password Too Long Error') })
        } else {
          this.setState({ pwdError: '' })
        }
      })
    }

    this.togglePwd = () => this.setState({ showPwd: !this.state.showPwd })

    this.fireAsync = async () => {
      const { dev, account } = this.props
      const deviceSN = dev.mdev.deviceSN || (dev.info && dev.info.data && dev.info.data.deviceSN)
      const args = { deviceSN }
      const userUUID = account.winasUserId
      const newUser = (await this.props.phi.reqAsync('setLANPassword', { deviceSN, password: this.state.pwd, userUUID }))

      /* set samba pwd */
      await this.props.phi.reqAsync('sambaPwd', { pwd: this.state.pwd, userUUID, deviceSN })

      const token = (await this.props.phi.reqAsync('LANToken', args)).token
      if (!newUser || !newUser.uuid || !token) throw Error('fireAsync Error: no user or token')
      return ({ dev, user: newUser, token })
    }

    this.fire = () => {
      if (this.state.pwd.length < 8) {
        this.setState({ pwdError: i18n.__('Password Too Short Error') })
      } else {
        this.setState({ loading: true })
        this.fireAsync()
          .then(({ dev, user, token }) => {
            Object.assign(dev, { token: { isFulfilled: () => true, ctx: user, data: { token } } })
            this.setState({ loading: false })
            const { selectedDevice } = this.props
            if (user.isFirstUser) {
              this.props.onSuccess({ dev, user, selectedDevice, isCloud: false })
            } else {
              this.props.deviceLogin({ dev, user, selectedDevice, isCloud: false })
            }
          })
          .catch((error) => {
            console.error('this.getLANToken', error)
            this.setState({ status: 'error', error, loading: false, pwdError: '设置失败' }) // TODO
          })
      }
    }

    this.onKeyDown = (e) => {
      if (e.which === 13 && this.state.pwd && !this.state.loading && !this.state.pwdError) this.fire()
    }
  }

  render () {
    return (
      <div style={{ width: 320, zIndex: 200, position: 'relative' }} className="paper" >
        <div
          style={{ height: 59, display: 'flex', alignItems: 'center', paddingLeft: 19 }}
          className="title"
        >
          { i18n.__('Set LAN Pwd') }
        </div>
        <Divider style={{ marginLeft: 20, width: 280 }} className="divider" />
        <div style={{ height: 150, paddingBottom: 30 }} className="flexCenter">
          <img
            style={{ width: 280, height: 150 }}
            src="./assets/images/pic-offlinepassword.png"
            alt=""
          />
        </div>
        <div style={{ width: 280, margin: '-10px auto 0px auto', position: 'relative' }}>
          <TextField
            hintText={i18n.__('LAN Password Hint')}
            type={this.state.showPwd ? 'text' : 'password'}
            errorText={this.state.pwdError}
            value={this.state.pwd}
            onChange={e => this.onPassword(e.target.value)}
            onKeyDown={this.onKeyDown}
          />
          {/* clear password */}
          <div style={{ position: 'absolute', right: 0, top: 35 }}>
            <TFButton icon={this.state.showPwd ? EyeOpenIcon : EyeOffIcon} onClick={this.togglePwd} />
          </div>
        </div>
        <div style={{ height: 20 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RRButton
            label={this.state.loading ? i18n.__('Saving') : i18n.__('Save')}
            onClick={this.fire}
            disabled={!this.state.pwd || this.state.loading}
            loading={this.state.loading}
          />
        </div>
        <div style={{ height: 30 }} />
      </div>
    )
  }
}

export default SetLANPwd
