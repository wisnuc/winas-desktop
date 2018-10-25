import i18n from 'i18n'
import React from 'react'
import { ipcRenderer } from 'electron'
import { Snackbar } from 'material-ui'
import getMuiTheme from 'material-ui/styles/getMuiTheme'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'

import Login from './login/Login'
import Users from './control/Users'
import PhiAPI from './common/PhiAPI'
import Account from './common/Account'
import Clipboard from './control/clipboard'
import Navigation from './nav/Navigation'

const defaultTheme = getMuiTheme({
  fontFamily: 'Microsoft YaHei, PingFang SC, sans-serif',
  color: '#50529',
  fontSize: 14,
  palette: { primary1Color: '#31a0f5', accent1Color: '#fa5353' }
})

class Fruitmix extends React.Component {
  constructor () {
    super()

    this.state = {
      ipcRenderer,
      snackBar: '',
      view: 'login',
      jump: null,
      account: null,
      showUsers: false,
      phi: new PhiAPI(),
      forceUpdate: false,
      clipboard: new Clipboard(),
      phiLogin: this.phiLogin.bind(this),
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

    const nodrag = { position: 'fixed', top: 0, WebkitAppRegion: 'no-drag' }
    return (
      <MuiThemeProvider muiTheme={defaultTheme}>
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#FFF' }}>
          {/* login or device */}
          { view }

          {/* Account */}
          {/*
            this.state.account &&
              <div style={{ position: 'fixed', top: 12, right: 147, height: 36, WebkitAppRegion: 'no-drag' }}>
                <Account

                  user={this.state.account}
                  logout={() => this.logout()}
                  device={this.state.selectedDevice}
                  showUsers={() => this.setState({ showUsers: true })}
                />
              </div>
          */}

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

          {/* No WebkitAppRegion */}
          <div style={Object.assign({ left: 0, height: 5, width: '100%' }, nodrag)} />
          <div style={Object.assign({ left: 0, height: 110, width: 5 }, nodrag)} />
          <div style={Object.assign({ right: 0, height: 110, width: 5 }, nodrag)} />
        </div>
      </MuiThemeProvider>
    )
  }
}

export default Fruitmix
