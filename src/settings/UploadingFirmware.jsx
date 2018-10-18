import i18n from 'i18n'
import UUID from 'uuid'
import React from 'react'
import Promise from 'bluebird'
import { ipcRenderer } from 'electron'
import CheckIcon from 'material-ui/svg-icons/navigation/check'
import reqMdns from '../common/mdns'
import { RSButton } from '../common/Buttons'
import CircularLoading from '../common/CircularLoading'

class UploadingFirmware extends React.PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      status: 'busy',
      progress: '0%'
    }

    this.fire = () => {
      this.session = UUID.v4()
      ipcRenderer.send('UPLOAD_FIRM', { session: this.session, absPath: this.props.absPath })
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

    this.upgrade = () => {
      this.setState({ progress: '100%', isRebooting: false })
      this.props.apis.pureRequest('firmwareUpgrade', null, (err, res) => {
        if (!err && res && res.error === '0') {
          this.setState({ status: 'upgrading' })
          this.polling(this.props.account.lan)
            .then(() => this.setState({ status: 'success' }))
            .catch(error => this.setState({ status: 'error', error, isRebooting: true }))
        } else this.setState({ status: 'error', error: '' })
      })
    }

    this.onSuccess = () => {
      this.componentWillUnmount()
      this.props.deviceLogout()
    }

    this.onFailed = () => {
      if (this.state.isRebooting) {
        this.componentWillUnmount()
        this.props.deviceLogout()
      } else this.props.onRequestClose()
    }

    this.onFirmRes = (event, data) => {
      const { success, reason, session } = data
      if (session !== this.session) return
      if (!success) {
        console.error('upload firm error', reason)
        this.setState({ status: 'error', error: i18n.__('Upload Firmware Error Text') })
      } else if (reason && reason.desc === 'Check firmware failed!') {
        console.error('upload firm error', reason)
        this.setState({ status: 'error', error: i18n.__('Check Firmware Failed Text') })
      } else {
        this.upgrade()
      }
    }

    this.onProcess = (event, data) => {
      const { progress, session } = data
      if (session !== this.session) return
      this.setState({ progress: `${progress.toFixed(0)}%` })
    }
  }

  componentDidMount () {
    if (this.props.jumpToUpgrade) {
      this.upgrade()
    } else {
      ipcRenderer.on('UPLOAD_FIRM_RESULT', this.onFirmRes)
      ipcRenderer.on('FIRM_PROCESS', this.onProcess)
      this.fire()
    }
  }

  componentWillUnmount () {
    ipcRenderer.removeListener('UPLOAD_FIRM_RESULT', this.onFirmRes)
    ipcRenderer.removeListener('FIRM_PROCESS', this.onProcess)
  }

  deviceSN () {
    return this.props.selectedDevice && this.props.selectedDevice.mdev.deviceSN
  }

  render () {
    const { status } = this.state

    let [text, img, label, color, func] = ['', '', '', '#31a0f5', null]
    switch (status) {
      case 'busy':
        img = <CircularLoading />
        text = this.state.progress !== '100%' ? i18n.__('Uploading Firmware Text %s', this.state.progress)
          : i18n.__('Checking Firmware')
        color = '#31a0f5'
        break
      case 'upgrading':
        img = <CircularLoading />
        text = i18n.__('Upgrading Firmware')
        color = '#31a0f5'
        break
      case 'success':
        img = <CheckIcon color="#31a0f5" style={{ width: 52, height: 52 }} />
        text = i18n.__('Upgrade Firmware Success Text')
        color = '#31a0f5'
        label = i18n.__('OK')
        func = () => this.onSuccess()
        break
      case 'error':
        img = <img src="./assets/images/pic-loadingfailed.png" width={52} height={52} />
        text = this.state.error || i18n.__('Upload Firmware Error Text')
        color = '#fa5353'
        label = i18n.__('OK')
        func = () => this.onFailed()
        break
      default:
        break
    }
    return (
      <div style={{ width: 240, height: 214, backgroundColor: 'transparent', paddingTop: 54 }}>
        <div style={{ height: func ? 214 : 160, backgroundColor: '#FFF', transition: 'height 175ms' }}>
          <div style={{ height: 40 }} />
          <div style={{ width: '100%', height: 60 }} className="flexCenter">
            { img }
          </div>
          <div style={{ fontSize: 14, color, height: 20 }} className="flexCenter">
            { text }
          </div>
          <div style={{ height: 40 }} />
          <div style={{ height: 34, opacity: func ? 1 : 0, transition: 'opacity 175ms 175ms' }} className="flexCenter" >
            <RSButton
              label={label}
              onClick={func}
              style={{ width: 152, height: 34 }}
            />
          </div>
          <div style={{ height: 20 }} />
        </div>
      </div>
    )
  }
}
export default UploadingFirmware
