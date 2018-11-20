import i18n from 'i18n'
import React from 'react'

import WisnucLogin from './WisnucLogin'
import DeviceLogin from './DeviceLogin'

import WindowAction from '../common/WindowAction'

class Login extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      list: [],
      hello: true,
      loading: true,
      status: 'wisnucLogin'
    }

    this.enterLANLoginList = () => {
      this.props.wisnucLogin({ lan: true, name: i18n.__('Account Offline') })
      this.setState({ list: [], loading: true, type: 'LANTOLOGIN', status: 'deviceList' })
    }

    this.refreshStationList = () => {
      this.setState({ loading: true, type: 'BOUNDLIST' })
      this.props.phi.req('stationList', null, (e, r) => {
        if (e || !r.result || !Array.isArray(r.result.list) || r.error !== '0') {
          this.setState({ loading: false, list: [], status: 'listError', type: 'BOUNDLIST' })
        } else {
          const list = r.result.list.filter(l => l.type === 'owner' ||
            (l.accountStatus === '1' && ['pending', 'accept'].includes(l.inviteStatus)))
          const status = !list.length ? 'phiNoBound' : 'deviceList'
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
      this.setState({ selectedDevice: null, status: 'deviceList', type: 'BOUNDLIST' }, () => this.refresh())
    }

    this.wisnucLoginSuccess = ({ list, phonenumber, winasUserId, phi }) => {
      const status = !list.length ? 'phiNoBound' : 'deviceList'
      this.setState({ list, status, type: 'BOUNDLIST' })
      this.props.wisnucLogin({ phonenumber, winasUserId, phi, name: phonenumber })
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
    if (!nextProps.account && this.state.status !== 'wisnucLogin') this.setState({ status: 'wisnucLogin', selectedDevice: null })
  }

  render () {
    const beforeLogin = this.state.status === 'wisnucLogin'
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
            height: this.state.status === 'deviceList' ? 16 : 80,
            width: 'calc(100% - 8px)',
            WebkitAppRegion: 'drag'
          }}
        />

        <div style={{ width: '100%', zIndex: 100, height: '100%', position: 'relative', overflow: 'hidden' }} >
          <div
            style={{
              width: '100%',
              zIndex: 100,
              height: '100%',
              position: 'absolute',
              left: beforeLogin ? 0 : -2000,
              transition: 'all 450ms'
            }}
          >
            <WisnucLogin
              {...this.props}
              status={this.state.status}
              onSuccess={this.wisnucLoginSuccess}
              enterLANLoginList={this.enterLANLoginList}
              wisnucLogin={this.props.wisnucLogin}
            />
          </div>
          <div
            style={{
              width: '100%',
              zIndex: 100,
              height: '100%',
              position: 'absolute',
              left: beforeLogin ? 2000 : 0,
              transition: 'all 450ms'
            }}
          >
            {
              <DeviceLogin
                {...this.props}
                list={this.state.list}
                status={this.state.status}
                backToLogin={() => this.setState({ status: 'wisnucLogin' })}
              />
            }
          </div>
        </div>
        <WindowAction noResize />
      </div>
    )
  }
}

export default Login
