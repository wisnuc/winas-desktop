import i18n from 'i18n'
import React from 'react'
import { Divider } from 'material-ui'

import WisnucLogin from './WisnucLogin'
import LANLogin from './LANLogin'
import SetLANPwd from './SetLANPwd'
import ConfirmPT from './ConfirmPT'
import ManageDisk from './ManageDisk'
import SelectDevice from './SelectDevice'
import DeviceLogin from './DeviceLogin'

import reqMdns from '../common/mdns'
import { BackIcon } from '../common/Svg'
import WindowAction from '../common/WindowAction'
import { RRButton, LIButton } from '../common/Buttons'

class Login extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      list: [],
      hello: true,
      loading: true,
      status: 'phiLogin'
    }

    this.onMDNSError = (e) => {
      console.error('reqMdns error', e)
      this.setState({ loading: false, list: [] })
      this.props.openSnackBar(i18n.__('MDNS Search Error'))
    }

    this.showDeviceToBind = () => {
      this.setState({ list: [], loading: true, type: 'LANTOBIND', status: 'deviceSelect' })
      reqMdns()
        .then(mdns => this.setState({ loading: false, list: mdns }))
        .catch(this.onMDNSError)
    }

    this.enterLANLoginList = () => {
      this.props.phiLogin({ lan: true, name: i18n.__('Account Offline') })
      this.setState({ list: [], loading: true, type: 'LANTOLOGIN', status: 'deviceSelect' })
      /*
      reqMdns()
        .then(mdns => this.setState({ loading: false, list: mdns }))
        .catch(this.onMDNSError)
      */
    }

    this.openLANLogin = (dev) => {
      this.setState({ selectedDevice: dev, status: 'LANLogin' })
    }

    this.backToLANList = () => {
      this.setState({ selectedDevice: null, status: 'deviceSelect', type: 'LANTOLOGIN' }, () => this.refresh())
    }

    this.refreshStationList = () => {
      this.setState({ loading: true, type: 'BOUNDLIST' })
      this.props.phi.req('stationList', null, (e, r) => {
        if (e || !r.result || !Array.isArray(r.result.list) || r.error !== '0') {
          this.setState({ loading: false, list: [], status: 'listError', type: 'BOUNDLIST' })
        } else {
          const list = r.result.list.filter(l => l.type === 'owner' ||
            (l.accountStatus === '1' && ['pending', 'accept'].includes(l.inviteStatus)))
          const status = !list.length ? 'phiNoBound' : 'deviceSelect'
          this.setState({ list, loading: false, type: 'BOUNDLIST', status })
        }
      })
    }

    this.addBindDevice = () => {
      this.showDeviceToBind()
    }

    this.refresh = () => {
      switch (this.state.type) {
        case 'LANTOLOGIN':
          this.enterLANLoginList()
          break

        case 'LANTOBIND':
          this.showDeviceToBind()
          break

        case 'BOUNDLIST':
          this.refreshStationList()
          break

        default:
          break
      }
    }

    this.manageDisk = (dev) => {
      this.setState({ loading: true })
      if (!dev || !dev.mdev) {
        this.setState({ type: 'BOUNDLIST' }, () => this.refresh())
        return
      }
      /* bind device and jump to manageDisk: should regard as admin */
      if (dev.mdev.domain === 'local') Object.assign(dev.mdev, { type: 'owner' })
      const isAdmin = dev.mdev.type === 'owner'
      dev.refreshSystemState(() => {
        if (dev.systemStatus() === 'noBoundVolume' && isAdmin) this.setState({ selectedDevice: dev, status: 'diskManage' })
        else if (dev.systemStatus() === 'noBoundVolume' && !isAdmin) this.setState({ status: 'diskError' })
        else this.setState({ type: 'BOUNDLIST' }, () => this.refresh())
      })
    }

    this.backToList = () => {
      this.setState({ selectedDevice: null, status: 'deviceSelect', type: 'BOUNDLIST' }, () => this.refresh())
    }

    this.jumpToSetLANPwd = (dev) => {
      this.setState({ status: 'LANPwd', selectedDevice: dev })
    }

    this.onSetLANPwdSuccess = (loginData) => {
      this.setState({ status: 'PT', loginData, selectedDevice: loginData.selectedDevice })
    }

    this.phiLoginSuccess = ({ list, phonenumber, token, phicommUserId, phi }) => {
      const status = !list.length ? 'phiNoBound' : 'deviceSelect'
      this.setState({ list, status, type: 'BOUNDLIST' })
      this.props.phiLogin({ phonenumber, token, phicommUserId, phi, name: phonenumber })
    }
  }

  componentDidMount () {
    document.getElementById('start-bg').style.display = 'none'
    setTimeout(() => this.setState({ hello: false }), 300)
    /* jump to some status */
    if (this.props.jump) this.setState(this.props.jump, () => this.refresh())
  }

  /* make sure log out phi account success */
  componentWillReceiveProps (nextProps) {
    if (!nextProps.account && this.state.status !== 'phiLogin') this.setState({ status: 'phiLogin', selectedDevice: null })
  }

  renderDeviceSelect (props) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 110,
          width: '100%',
          height: 'calc(100% - 150px)',
          zIndex: 200,
          overflow: 'hidden'
        }}
      >
        <SelectDevice
          {...props}
          {...this.state}
          refresh={this.refresh}
          manageDisk={this.manageDisk}
          addBindDevice={this.addBindDevice}
          refreshStationList={this.refreshStationList}
          jumpToSetLANPwd={this.jumpToSetLANPwd}
          jumpToSetPT={this.onSetLANPwdSuccess}
          openLANLogin={this.openLANLogin}
        />
      </div>
    )
  }

  renderDiskManage () {
    return (
      <ManageDisk
        {...this.props}
        selectedDevice={this.state.selectedDevice.state}
        backToList={this.backToList}
        onFormatSuccess={() => this.jumpToSetLANPwd(this.state.selectedDevice)}
      />
    )
  }

  renderLANPwd () {
    return (
      <SetLANPwd
        {...this.props}
        {...this.state}
        onSuccess={this.onSetLANPwdSuccess}
        dev={this.state.selectedDevice.state}
        selectedDevice={this.state.selectedDevice}
      />
    )
  }

  renderPT () {
    return (
      <ConfirmPT
        {...this.props}
        {...this.state}
        loginData={this.state.loginData}
        selectedDevice={this.state.selectedDevice}
      />
    )
  }

  renderLANLogin () {
    return (
      <LANLogin
        {...this.props}
        dev={this.state.selectedDevice.state}
        selectedDevice={this.state.selectedDevice}
        onRequestClose={this.backToLANList}
      />
    )
  }

  renderNoBound () {
    return (
      <div style={{ width: 320, height: 310, overflow: 'hidden', zIndex: 200, position: 'relative' }}
        className="paper"
      >
        <div
          style={{ height: 59, display: 'flex', alignItems: 'center', paddingLeft: 19 }}
          className="title"
        >
          { i18n.__('Add Device') }
        </div>
        <Divider style={{ marginLeft: 20, width: 280 }} className="divider" />
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            style={{ width: 220, height: 116 }}
            src="./assets/images/pic-login.png"
            alt=""
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RRButton
            label={i18n.__('Add Device')}
            onClick={this.showDeviceToBind}
          />
        </div>
      </div>
    )
  }

  renderDiskError () {
    return (
      <div
        className="paper"
        style={{ width: 320, overflow: 'hidden', zIndex: 200, position: 'relative' }}
      >
        <div style={{ height: 60, display: 'flex', alignItems: 'center', paddingLeft: 5 }} className="title">
          <LIButton onClick={this.backToList} >
            <BackIcon />
          </LIButton>
          { i18n.__('Disk Changed Title') }
        </div>
        <Divider style={{ marginLeft: 20, width: 280 }} className="divider" />
        <div style={{ height: 150, width: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            style={{ width: 280, height: 150 }}
            src="./assets/images/pic-diskchange.png"
            alt=""
          />
        </div>
        <div style={{ color: '#fa5353', height: 40, margin: '20px 0 30px 0' }} className="flexCenter">
          { i18n.__('Disk Error for Normal User') }
        </div>
      </div>
    )
  }

  render () {
    const props = this.props
    let view = null

    switch (this.state.status) {
      case 'phiLogin':
        view = (<WisnucLogin {...props} onSuccess={this.phiLoginSuccess} enterLANLoginList={this.enterLANLoginList} phiLogin={this.props.phiLogin} />)
        break

      case 'phiNoBound':
        view = this.renderNoBound()
        break

      case 'listError':
        view = this.renderDeviceSelect(props)
        break

      case 'deviceSelect':
        view = (
          <DeviceLogin
            {...this.props}
            list={this.state.list}
            backToLogin={() => this.setState({ status: 'phiLogin' })}
          />
        )
        break

      case 'diskManage':
        view = this.renderDiskManage()
        break

      case 'LANPwd':
        view = this.renderLANPwd()
        break

      case 'diskError':
        view = this.renderDiskError()
        break

      case 'LANLogin':
        view = this.renderLANLogin()
        break

      case 'PT':
        view = this.renderPT()
        break

      default:
        break
    }

    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFF',
          overflow: 'hidden'
        }}
      >
        {/* WebkitAppRegion */}
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            height: this.state.status === 'deviceSelect' ? 16 : 80,
            width: 'calc(100% - 8px)',
            WebkitAppRegion: 'drag'
          }}
        />

        {/* footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            boxSizing: 'border-box',
            fontSize: 12,
            width: '100%',
            height: 40,
            display: this.state.status === 'phiLogin' ? '' : 'none'
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
        { view }
        <WindowAction noResize />
      </div>
    )
  }
}

export default Login
