import i18n from 'i18n'
import React from 'react'
import { Divider } from 'material-ui'
import { RSButton } from '../common/Buttons'

class ConfirmBind extends React.PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      status: 'WIP'
    }

    this.getBindState = (deviceSN) => {
      this.props.phi.req('getBindState', { deviceSN }, (err, res) => {
        if (err) { // Error
          console.error('getBindState error', err)
          this.setState({ error: 'bind error', status: 'failed' })
        } else if (res && res.result && res.result.status === 'binded') { // Success
          this.setState({ status: 'success' })
        } else if (res && (
          (res.error && res.error !== '0') ||
          ['error-timeout', 'error-station_offline', 'error-station_error'].includes(res.result && res.result.status)
        )) { /* res.result.status: 'binded', 'binding-*', 'error-*' */
          this.setState({ error: 'bind error', status: 'failed' })
        } else setTimeout(() => this.getBindState(deviceSN), 1000) // Pending
      })
    }

    this.bindDevice = () => {
      const deviceSN = this.props.dev.info.data.deviceSN
      if (!deviceSN) this.setState({ status: 'failed' })
      else {
        this.props.phi.req('bindDevice', { deviceSN }, (err, res) => {
          if (err || (res && res.error && res.error !== '0')) {
            this.setState({ error: 'bind error', status: 'failed' })
            console.error('bindDevice, error', err, res)
          } else {
            setTimeout(() => this.getBindState(deviceSN), 1000)
          }
        })
      }
    }
  }

  componentDidMount () {
    this.bindDevice()
  }

  render () {
    let [text, img, label, func] = ['', '', '', () => {}]
    switch (this.state.status) {
      case 'WIP':
        img = 'pic-confirm.png'
        text = i18n.__('Bind Device WIP Text')
        label = i18n.__('Bind Device WIP Label')
        func = () => {}
        break
      case 'success':
        img = 'pic-confirmed.png'
        text = i18n.__('Bind Device Success Text')
        label = i18n.__('Bind Device Success Label')
        func = () => this.props.onSuccess()
        break
      case 'failed':
        img = 'pic-confirmfailed.png'
        text = i18n.__('Bind Device Failed Text')
        label = i18n.__('Bind Device Failed Label')
        func = () => this.props.onFailed()
        break
      default:
        break
    }
    return (
      <div className="paper" style={{ width: 320, zIndex: 100 }} >
        <div style={{ height: 59, display: 'flex', alignItems: 'center', paddingLeft: 20 }} className="title">
          { i18n.__('Bind Device') }
        </div>
        <Divider style={{ marginLeft: 20, width: 280 }} className="divider" />
        <div style={{ height: 176, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            style={{ width: this.state.status === 'WIP' ? 49 : 59, height: 100 }}
            src={`./assets/images/${img}`}
            alt={img}
          />
        </div>
        <div
          style={{
            height: 40,
            width: 280,
            padding: '0 20px',
            color: 'var(--grey-text)'
          }}
          className="flexCenter"
        >
          { text }
        </div>
        <div style={{ height: 34, width: 280, padding: 20, alignItems: 'center', justifyContent: 'center' }}>
          <RSButton label={label} onClick={func} disabled={this.state.status === 'WIP'} style={{ width: 232 }} />
        </div>
      </div>
    )
  }
}

export default ConfirmBind
