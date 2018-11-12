import i18n from 'i18n'
import React from 'react'

import WisnucLogin from './WisnucLogin'
import SelectDevice from './SelectDevice'
import DeviceLogin from './DeviceLogin'

import WindowAction from '../common/WindowAction'

class Login extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      list: [],
      hello: true,
      loading: true,
      status: 'phiLogin'
    }

    this.enterLANLoginList = () => {
      this.props.phiLogin({ lan: true, name: i18n.__('Account Offline') })
      this.setState({ list: [], loading: true, type: 'LANTOLOGIN', status: 'deviceSelect' })
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

    this.refresh = () => {
      switch (this.state.type) {
        case 'LANTOLOGIN':
          this.enterLANLoginList()
          break

        case 'BOUNDLIST':
          this.refreshStationList()
          break

        default:
          break
      }
    }

    this.backToList = () => {
      this.setState({ selectedDevice: null, status: 'deviceSelect', type: 'BOUNDLIST' }, () => this.refresh())
    }

    this.phiLoginSuccess = ({ list, phonenumber, winasUserId, phi }) => {
      const status = !list.length ? 'phiNoBound' : 'deviceSelect'
      this.setState({ list, status, type: 'BOUNDLIST' })
      this.props.phiLogin({ phonenumber, winasUserId, phi, name: phonenumber })
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

      case 'deviceSelect':
        view = (
          <DeviceLogin
            {...this.props}
            list={this.state.list}
            backToLogin={() => this.setState({ status: 'phiLogin' })}
          />
        )
        break

      case 'diskError':
        view = this.renderDiskError()
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
