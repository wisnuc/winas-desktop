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

        {/* footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            boxSizing: 'border-box',
            fontSize: 12,
            width: '100%',
            height: 40,
            display: this.state.status === 'wisnucLogin' ? '' : 'none'
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
        <div style={{ width: 680, zIndex: 100, height: 510, position: 'relative', overflow: 'hidden' }} >
          <div
            style={{
              width: 680,
              zIndex: 100,
              height: 510,
              position: 'absolute',
              left: beforeLogin ? 0 : -680,
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
              width: 680,
              zIndex: 100,
              height: 510,
              position: 'absolute',
              left: beforeLogin ? 680 : 0,
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
