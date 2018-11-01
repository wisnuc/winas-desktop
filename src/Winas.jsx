import i18n from 'i18n'
import React from 'react'
import { ipcRenderer } from 'electron'
import { Snackbar } from 'material-ui'
import getMuiTheme from 'material-ui/styles/getMuiTheme'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'

import Login from './login/Login'
import Account from './common/Account'
import PhiAPI from './common/PhiAPI'
import Clipboard from './control/clipboard'
import Navigation from './nav/Navigation'

const defaultTheme = getMuiTheme({
  fontFamily: 'Roboto, Noto Sans SC, Microsoft YaHei, PingFang SC, sans-serif',
  color: 'rgba(0,0,0,.87)',
  fontSize: 14,
  palette: { primary1Color: '#009688', accent1Color: '#ff4081' }
})

class Winas extends React.Component {
  constructor () {
    super()

    this.state = {
      ipcRenderer,
      snackBar: '',
      theme: defaultTheme,
      view: 'login',
      jump: null,
      account: null,
      showUsers: false,
      phi: new PhiAPI(),
      forceUpdate: false,
      clipboard: new Clipboard(),
      phiLogin: this.phiLogin.bind(this),
      setPalette: this.setPalette.bind(this),
      deviceLogin: this.deviceLogin.bind(this),
      deviceLogout: this.deviceLogout.bind(this),
      openSnackBar: this.openSnackBar.bind(this),
      jumpToLANLogin: this.jumpToLANLogin.bind(this),
      jumpToSetLANPwd: this.jumpToSetLANPwd.bind(this),
      jumpToBindDevice: this.jumpToBindDevice.bind(this),
      clearForceUpdate: this.clearForceUpdate.bind(this)
    }

    this.onCloseUsers = () => {
      this.setState({ showUsers: false, forceUpdate: true })
    }
  }

  setPalette (primary1Color, accent1Color) {
    this.setState({
      theme: getMuiTheme({
        fontFamily: 'Roboto, Noto Sans SC, Microsoft YaHei, PingFang SC, sans-serif',
        color: 'rgba(0,0,0,.87)',
        fontSize: 14,
        palette: { primary1Color, accent1Color }
      })
    })
  }

  clearForceUpdate () {
    this.setState({ forceUpdate: false })
  }

  phiLogin (user) {
    this.setState({ account: user })
    /* save phi login data */
    if (user && user.phi) ipcRenderer.send('SETCONFIG', { phi: user.phi })
  }

  deviceLogin ({ dev, user, selectedDevice, isCloud }) {
    if (this.state.selectedDevice) {
      ipcRenderer.send('LOGOUT')
      this.setState({ view: '', selectedDevice: null, jump: null }, () => this.deviceLogin({ dev, user, selectedDevice, isCloud }))
    } else {
      ipcRenderer.send('LOGIN', { device: dev, user, isCloud })
      this.selectedDevice = selectedDevice
      this.selectedDevice.on('updated', (prev, next) => this.setState({ selectedDevice: next }))
      this.setState({ view: 'device', selectedDevice: dev, jump: null, isCloud })
    }
  }

  deviceLogout () {
    ipcRenderer.send('LOGOUT')
    if (this.selectedDevice) {
      this.selectedDevice.removeAllListeners('updated')
      this.selectedDevice = null
    }
    this.setState({
      view: 'login',
      selectedDevice: null,
      account: this.state.account && this.state.account.lan ? { lan: true, name: i18n.__('Account Offline') } : this.state.account,
      jump: { status: 'deviceSelect', type: this.state.account && this.state.account.lan ? 'LANTOLOGIN' : 'BOUNDLIST' }
    })
  }

  logout () {
    ipcRenderer.send('LOGOUT')
    if (this.selectedDevice) {
      this.selectedDevice.removeAllListeners('updated')
      this.selectedDevice = null
    }
    this.setState({ account: null, view: 'login', phi: new PhiAPI(), jump: null, selectedDevice: null })
  }

  jumpToBindDevice () {
    this.setState({ view: 'login', selectedDevice: null, jump: { status: 'deviceSelect', type: 'LANTOBIND' } })
  }

  jumpToLANLogin (dev) {
    this.setState({
      view: 'login',
      selectedDevice: null,
      jump: { selectedDevice: dev, status: 'LANLogin' },
      account: { lan: true, name: i18n.__('Account Offline') }
    })
  }

  jumpToSetLANPwd (dev) {
    this.setState({ view: 'login', selectedDevice: null, jump: { status: 'LANPwd', selectedDevice: dev } })
  }

  openSnackBar (message) {
    this.setState({ snackBar: message })
  }

  renderSnackBar () {
    return (
      <Snackbar
        bodyStyle={{
          marginBottom: 20,
          height: 40,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent'
        }}
        contentStyle={{
          padding: '0 30px',
          borderRadius: 4,
          fontSize: 12,
          letterSpacing: 1.2,
          color: '#FFF',
          backgroundColor: 'rgba(0,0,0,.8)',
          boxShadow: '0px 4px 8px 0 rgba(23,99,207,.1)'
        }}
        open={!!this.state.snackBar}
        message={this.state.snackBar}
        autoHideDuration={4000}
        onRequestClose={() => this.setState({ snackBar: '' })}
      />
    )
  }

  render () {
    const view = this.state.view === 'login' ? <Login {...this.state} />
      : this.state.view === 'device' ? <Navigation {...this.state} /> : <div />

    const nodrag = { position: 'absolute', top: 0, WebkitAppRegion: 'no-drag' }
    const isSmall = this.state.view === 'login'
    return (
      <MuiThemeProvider muiTheme={this.state.theme}>
        <div
          className="flexCenter"
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'transparent' }}
        >
          {/* login or device */}
          <div
            style={{
              position: 'relative',
              width: isSmall ? 680 : '100%',
              height: isSmall ? 510 : '100%',
              overflow: 'hidden',
              backgroundColor: '#FFF',
              transition: 'all 225ms',
              boxShadow: '0px 9px 13.2px 0.8px rgba(0, 105, 92, 0.24), 0px 4px 18.6px 0.4px rgba(0, 105, 92, 0.16)'
            }}
          >
            { view }
            {/* No WebkitAppRegion */}
            <div style={Object.assign({ left: 0, height: 5, width: '100%' }, nodrag)} />
            <div style={Object.assign({ left: 0, height: 110, width: 5 }, nodrag)} />
            <div style={Object.assign({ right: 0, height: 110, width: 5 }, nodrag)} />
            {/* Account */}
            {
              this.state.account &&
                <div style={{ position: 'absolute', top: 12, right: 147, height: 36, WebkitAppRegion: 'no-drag' }}>
                  <Account
                    user={this.state.account}
                    logout={() => this.logout()}
                    device={this.state.selectedDevice}
                    showUsers={() => this.setState({ showUsers: true })}
                  />
                </div>
            }

          </div>

          {/*
            !!this.state.showUsers &&
              <Users
                phi={this.state.phi}
                open={this.state.showUsers}
                device={this.state.selectedDevice}
                onCancel={this.onCloseUsers}
                openSnackBar={msg => this.openSnackBar(msg)}
              />
          */}

          {/* snackBar */}
          { this.renderSnackBar() }

        </div>
      </MuiThemeProvider>
    )
  }
}

export default Winas
