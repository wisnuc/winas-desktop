import React from 'react'

import WisnucLogin from './WisnucLogin'
import DeviceLogin from './DeviceLogin'
import WeChatLogin from './WeChatLogin'

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

    this.wisnucLoginSuccess = ({ list, phonenumber, winasUserId, phi }) => {
      this.setState({ list, status: 'deviceList' })
      this.props.wisnucLogin({ phonenumber, winasUserId, phi, name: phonenumber })
    }
  }

  componentDidMount () {
    document.getElementById('start-bg').style.display = 'none'
    setTimeout(() => this.setState({ hello: false }), 300)
  }

  /* make sure log out phi account success */
  componentWillReceiveProps (nextProps) {
    if (!nextProps.account && this.state.status !== 'wisnucLogin') this.setState({ status: 'wisnucLogin', selectedDevice: null })
  }

  render () {
    const baseStyle = { width: '100%', zIndex: 100, height: '100%', position: 'absolute', transition: 'all 450ms' }
    let [wisnucL, deviceL, wechatL] = [0, 0, 0]
    switch (this.state.status) {
      case 'wisnucLogin':
        [wisnucL, deviceL, wechatL] = [0, 450, 450]
        break
      case 'deviceList':
        [wisnucL, deviceL, wechatL] = [-450, 0, -450]
        break
      case 'wechatLogin':
        [wisnucL, deviceL, wechatL] = [-450, 450, 0]
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
            height: 32,
            width: 'calc(100% - 8px)',
            WebkitAppRegion: 'drag'
          }}
        />

        <div style={{ width: '100%', zIndex: 100, height: '100%', position: 'relative', overflow: 'hidden' }} >
          <div style={Object.assign({ left: wisnucL }, baseStyle)} >
            <WisnucLogin
              {...this.props}
              status={this.state.status}
              onSuccess={this.wisnucLoginSuccess}
              wisnucLogin={this.props.wisnucLogin}
              openWeChat={() => this.setState({ status: 'wechatLogin' })}
            />
          </div>
          <div style={Object.assign({ left: deviceL }, baseStyle)} >
            {
              <DeviceLogin
                {...this.props}
                list={this.state.list}
                status={this.state.status}
                backToLogin={() => this.setState({ status: 'wisnucLogin' })}
              />
            }
          </div>
          <div style={Object.assign({ left: wechatL }, baseStyle)} >
            {
              this.state.status === 'wechatLogin' &&
                <WeChatLogin
                  {...this.props}
                  status={this.state.status}
                  onSuccess={this.wisnucLoginSuccess}
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
