import i18n from 'i18n'
import React from 'react'
import Promise from 'bluebird'

import Rebooting from './Rebooting'
import reqMdns from '../common/mdns'
import Dialog from '../common/PureDialog'
import { RRButton } from '../common/Buttons'
import ConfirmDialog from '../common/ConfirmDialog'

class Power extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      confirm: false,
      type: 'reboot',
      status: '' // busy, success, error
    }

    this.getStatus = async (lan) => {
      /* LAN mode */
      await Promise.delay(3000)
      if (lan) {
        const mdns = await reqMdns()
        if (!Array.isArray(mdns)) return ({ error: i18n.__('Get StationList Error') })
        const dev = mdns.find(d => d.host === this.props.selectedDevice.mdev.host)
        return ({ isOnline: !!dev })
      }

      /* Online mode */
      const res = await this.props.phi.reqAsync('stationList', null)
      if (!res || res.error !== '0' || !Array.isArray(res.result.list)) return ({ error: i18n.__('Get StationList Error') })
      const dev = res.result.list.find(d => d.deviceSN === this.deviceSN())
      if (!dev) return ({ error: i18n.__('Station Not Found') })
      return ({ isOnline: dev.onlineStatus === 'online' })
    }

    this.polling = async (lan) => {
      let finished = false
      const startTime = new Date().getTime()
      const maxTime = 180 * 1000
      await Promise.delay(5000)
      while (!finished && (new Date().getTime() - startTime < maxTime)) {
        const status = await this.getStatus(lan)
        const { error, isOnline } = status
        if (error) throw error
        else finished = !!isOnline
      }
      if (new Date().getTime() - startTime > maxTime) throw i18n.__('Reconnect Timeout')
      return true
    }

    this.fire = () => {
      this.setState({ status: 'busy' })
      this.props.apis.request('power', { state: this.state.type }, (err, res) => {
        if (err) {
          console.error('power fire error', err, res)
          this.setState({ status: 'error' })
        } else if (this.state.type === 'poweroff') {
          setTimeout(() => this.setState({ status: 'success' }), 5000)
        } else {
          this.polling(this.props.account.lan)
            .then(() => this.setState({ status: 'success' }))
            .catch(error => this.setState({ status: 'error', error }))
        }
      })
    }

    this.reboot = () => {
      this.setState({ confirm: false, type: 'reboot' })
      setTimeout(this.fire, 500)
    }

    this.powerOff = () => {
      this.setState({ confirm: false, type: 'poweroff' })
      setTimeout(this.fire, 500)
    }

    this.onSuccess = () => {
      this.props.deviceLogout()
    }

    this.onFailed = () => {
      this.props.deviceLogout()
    }

    this.showConfirm = op => this.setState({ confirm: op })
  }

  deviceSN () {
    return this.props.selectedDevice && this.props.selectedDevice.mdev.deviceSN
  }

  render () {
    const reboot = this.state.confirm === 'reboot'
    return (
      <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', paddingBottom: 60 }} className="flexCenter" >
        <div style={{ width: 320 }}>
          <div style={{ height: 180, width: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              style={{ width: 320, height: 180 }}
              src="./assets/images/pic_powermanage.png"
              alt=""
            />
          </div>
          <div style={{ height: 40 }} />
          <div style={{ width: 270, height: 40, margin: '0 auto', display: 'flex', alignItems: 'center' }}>
            <RRButton
              alt
              tooltip={i18n.__('Reboot Text')}
              label={i18n.__('Reboot Menu Name')}
              onClick={() => this.showConfirm('reboot')}
            />
            <div style={{ width: 18 }} />
            <RRButton
              tooltip={i18n.__('PowerOff Text')}
              label={i18n.__('PowerOff Menu Name')}
              onClick={() => this.showConfirm('powerOff')}
            />
          </div>
          <div style={{ height: 40 }} />
        </div>
        <ConfirmDialog
          open={this.state.confirm}
          onCancel={() => this.setState({ confirm: false })}
          onConfirm={() => (reboot ? this.reboot() : this.powerOff())}
          title={reboot ? i18n.__('Confirm Reboot Title') : i18n.__('Confirm PowerOff Title')}
          text={reboot ? i18n.__('Confirm Reboot Text') : i18n.__('Confirm PowerOff Text')}
        />

        <Dialog open={!!this.state.status} onRequestClose={() => this.setState({ status: false })} modal transparent >
          {
            !!this.state.status &&
            <Rebooting
              type={this.state.type}
              error={this.state.error}
              status={this.state.status}
              onSuccess={this.onSuccess}
              onFailed={this.onFailed}
              onRequestClose={() => this.setState({ status: false })}
            />
          }
        </Dialog>
      </div>
    )
  }
}

export default Power
