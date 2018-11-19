import React from 'react'
import i18n from 'i18n'
import { Checkbox, MenuItem } from 'material-ui'
import { AutoSizer } from 'react-virtualized'
import ScrollBar from '../common/ScrollBar'
import AccountIcon from '../common/AccountIcon'
import WeChatLogin from './WeChatLogin'
import RetrievePwd from './RetrievePwd'
import Dialog from '../common/PureDialog'
import FlatButton from '../common/FlatButton'
import { isPhoneNumber } from '../common/validate'
import { RRButton, TFButton, LoginTF } from '../common/Buttons'
import { EyeOpenIcon, EyeOffIcon, WinCloseIcon, CheckBoxOutlineIcon, ArrowDownIcon, WeChatIcon } from '../common/Svg'

let firstLogin = true

class WisnucLogin extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      accounts: [],
      pn: '',
      pwd: '',
      pnError: '',
      pwdError: '',
      error: '',
      showPwd: false,
      autoLogin: false,
      status: 'phone'
    }

    this.onPhoneNumber = (pn) => {
      this.setState({
        pn,
        pnError: pn && !isPhoneNumber(pn) ? i18n.__('Invalid Phone Number') : ''
      })
    }

    this.onPassword = (pwd) => {
      this.setState({ pwd, pwdError: '' })
    }

    this.handleAutologin = () => {
      this.setState({ autoLogin: !this.state.autoLogin })
    }

    this.clearPn = () => this.setState({ pn: '', pnError: '' })

    this.togglePwd = () => this.setState({ showPwd: !this.state.showPwd })

    this.checkPhone = () => {
      this.setState({ loading: true })
      this.props.phi.req('checkUser', { phone: this.state.pn }, (err, res) => {
        console.log(err, res)
        if (err || !res || !res.userExist) this.setState({ pnError: i18n.__('User Not Exist'), loading: false })
        else {
          const accounts = [...this.state.accounts]
          if (this.state.accounts.every(user => user.pn !== this.state.pn)) {
            accounts.push(Object.assign({ pn: this.state.pn }, res))
          }
          this.setState({ status: 'password', loading: false, accounts, avatarUrl: res.avatarUrl })
          const newUserInfo = Object.assign({}, this.phi || {}, { accounts })
          this.props.ipcRenderer.send('SETCONFIG', { phi: newUserInfo })
        }
      })
    }

    this.delUser = (user) => {
      const accounts = this.state.accounts.filter(u => u.pn !== user.pn)
      this.setState({ accounts, confirmDelUser: false })
      const newUserInfo = Object.assign({}, this.phi || {}, { accounts })
      this.props.ipcRenderer.send('SETCONFIG', { phi: newUserInfo })
    }

    this.login = () => {
      this.setState({ loading: true })
      const clientId = window.config && window.config.machineId && window.config.machineId.slice(0, 8)
      this.props.phi.req(
        'token',
        { phonenumber: this.state.pn, password: this.state.pwd, clientId },
        (err, res) => {
          if (err || !res) {
            const code = res && res.code
            const msg = res && res.message
            console.log(res)
            if (code === 400) this.setState({ pwdError: i18n.__('Wrong Password'), loading: false })
            else if (code === 60008) this.setState({ pwdError: i18n.__('Wrong Password'), loading: false })
            else if (msg) this.setState({ pwdError: msg, loading: false })
            else this.setState({ failed: true, loading: false, pwdError: i18n.__('Login Failed') })
          } else {
            this.props.phi.req('stationList', null, (e, r) => {
              console.log('stationList e r', e, r)
              if (e || !r) {
                this.setState({ failed: true, loading: false })
              } else {
                const phi = Object.assign({}, res, {
                  pn: this.state.pn,
                  winasUserId: res.id,
                  accounts: this.state.accounts,
                  autoLogin: !!this.state.autoLogin,
                  token: this.state.autoLogin ? res.token : null
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
          if (r && r.error === '5') this.setState({ pwdError: i18n.__('Token Expired'), loading: false })
          else this.setState({ failed: true, loading: false })
        } else {
          this.setState({ loading: false })
          const list = r.ownStations
          this.props.onSuccess({ list, phonenumber: this.state.pn, winasUserId: this.phi.winasUserId, phi: this.phi })
        }
      })
    }
  }

  componentDidMount () {
    this.phi = window.config && window.config.global && window.config.global.phi
    if (this.phi) {
      const { autoLogin, pn, token, accounts, avatarUrl } = this.phi
      /* no accounts, last login account, another account */
      if (!accounts || !accounts.length || !pn) this.setState({ status: 'phone', pn: '', accounts: [], autoLogin: false })
      else if (accounts.find(u => u.pn !== pn)) this.setState({ status: 'password', pn: accounts[0].pn, autoLogin: false })
      else this.setState({ avatarUrl, pn, autoLogin: !!token, accounts, status: 'password' })

      if (firstLogin && autoLogin) this.fakeLogin()
    }
    firstLogin = false
  }

  renderConfirmDelUser () {
    return (
      <div style={{ width: 280, height: 240, zIndex: 100 }} className="paper" >
        <div
          style={{
            height: 72,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 24,
            color: '#f44336',
            fontSize: 18,
            fontWeight: 500
          }}
        >
          { i18n.__('Remove Cached Account Title') }
        </div>
        <div style={{ padding: 24, width: 232, height: 68 }}>
          { i18n.__('Remove Cached Account Text', this.state.confirmDelUser.pn) }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', padding: 8, marginRight: -8 }}>
          <div style={{ flexGrow: 1 }} />
          <FlatButton label={i18n.__('Cancel')} onClick={() => this.setState({ confirmDelUser: false })} primary />
          <FlatButton label={i18n.__('OK')} onClick={() => this.delUser(this.state.confirmDelUser)} primary />
        </div>
      </div>
    )
  }

  renderRow ({ style, key, user }) {
    const { avatarUrl, nickName, type, pn } = user
    const isDelUser = this.state.switchAccount === 'delete'
    return (
      <div style={style} key={key}>
        <MenuItem
          onClick={() => (isDelUser ? this.setState({ confirmDelUser: user }) : type === 'add'
            ? this.setState({ status: 'phone', pn: '', switchAccount: false })
            : this.setState({ pn, avatarUrl, switchAccount: false }))}
        >
          <div style={{ height: 72, display: 'flex', alignItems: 'center', paddingLeft: 24, cursor: 'pointer' }}>
            <AccountIcon size={32} avatarUrl={avatarUrl} />
            <div style={{ marginLeft: 24, lineHeight: 'normal', fontSize: 14 }}>
              <div>
                { type === 'add' ? i18n.__('Login Another Account') : (nickName || i18n.__('Default User Name')) }
              </div>
              <div style={{ fontWeight: 500, display: type === 'add' ? 'none' : '' }}>
                { this.state.pn }
              </div>
            </div>
          </div>
        </MenuItem>
      </div>
    )
  }

  renderUsers (users) {
    const rowCount = users.length
    const rowHeight = 72
    return (
      <div style={{ width: 450, height: 240 }}>
        <AutoSizer>
          {({ height, width }) => (
            <ScrollBar
              allHeight={rowHeight * rowCount}
              height={height}
              width={width}
              rowHeight={rowHeight}
              rowRenderer={({ style, key, index }) => this.renderRow({ style, key, user: users[index] })}
              rowCount={rowCount}
              overscanRowCount={3}
              style={{ outline: 'none' }}
            />
          )}
        </AutoSizer>
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
        disabled = !pn || pn.length !== 11 || pnError
        break
      case 'password':
        next = this.login
        disabled = !pwd || pwdError
        break
      default:
        break
    }

    const isDelUser = this.state.switchAccount === 'delete'
    const users = isDelUser ? this.state.accounts : [...this.state.accounts, { type: 'add' }]

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
                onClick={() => this.setState({ switchAccount: true })}
              >
                <AccountIcon size={18} avatarUrl={this.state.avatarUrl} />
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
              autoFoucus
              floatingLabelText={i18n.__('Phone Number')}
              type="text"
              errorText={this.state.pnError}
              value={this.state.pn}
              maxLength={11}
              onChange={e => this.onPhoneNumber(e.target.value)}
              onKeyDown={e => e.which === 13 && !disabled && next()}
            />
          }
          {
            status === 'password' &&
              <LoginTF
                autoFoucus
                type={this.state.showPwd ? 'text' : 'password'}
                floatingLabelText={i18n.__('Password')}
                errorText={this.state.pwdError}
                value={this.state.pwd}
                onChange={e => this.onPassword(e.target.value)}
                onKeyDown={e => e.which === 13 && !disabled && next()}
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
                style={{ display: this.state.status === 'password' ? '' : 'none' }}
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
                : <WeChatIcon style={{ width: 32, height: 32 }} />
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

        {/* switch account */}
        {
          this.state.switchAccount &&
            (
              <div style={{ width: 450, height: 380, position: 'absolute', top: 0, left: 0, backgroundColor: '#FFF', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', height: 32, paddingLeft: 80, marginBottom: 32 }}>
                  <div style={{ fontSize: 28, display: 'flex', alignItems: 'center' }} >
                    { i18n.__('Switch Account') }
                  </div>
                  {
                    isDelUser &&
                      <div style={{ height: 28, display: 'flex', alignItems: 'center', marginLeft: 8 }} >
                        { i18n.__('Clean Saved Account') }
                      </div>
                  }
                </div>

                {/* user list */}
                { this.renderUsers(users) }

                <div style={{ height: 1, width: 290, backgroundColor: 'rgba(0,0,0,.12)', margin: '0 auto' }} />
                <div style={{ marginLeft: 80 }}>
                  <FlatButton
                    primary
                    label={isDelUser ? i18n.__('Finish') : i18n.__('Remove Account')}
                    onClick={() => (
                      isDelUser ? (this.state.accounts.length ? this.setState({ switchAccount: true })
                        : this.setState({ switchAccount: false, status: 'phone', pn: '' })
                      ) : this.setState({ switchAccount: 'delete' })
                    )}
                  />
                </div>
              </div>
            )
        }

        {/* Phi Login Failed */}
        <Dialog open={!!this.state.confirmDelUser} onRequestClose={() => this.setState({ confirmDelUser: false })} modal >
          { !!this.state.confirmDelUser && this.renderConfirmDelUser() }
        </Dialog>
      </div>
    )
  }
}

export default WisnucLogin
