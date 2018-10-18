import i18n from 'i18n'
import React from 'react'

import reqMdns from '../common/mdns'
import SelectDevice from '../login/SelectDevice'
import ConfirmDialog from '../common/ConfirmDialog'

class ChangeDevice extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      list: [],
      loading: true
    }

    this.onMDNSError = (e) => {
      console.error('reqMdns error', e)
      this.setState({ loading: false, list: [] })
      this.props.openSnackBar(i18n.__('MDNS Search Error'))
    }

    this.refreshStationList = () => {
      this.setState({ loading: true })
      this.props.phi.req('stationList', null, (e, r) => {
        if (e || !r.result || !Array.isArray(r.result.list) || r.error !== '0') {
          this.setState({ loading: false, list: [], status: 'phiNoBound', error: true }) // TODO Error
        } else {
          const list = r.result.list
          const status = !list.length ? 'phiNoBound' : 'deviceSelect'
          this.setState({ list, loading: false, type: 'BOUNDLIST', status })
        }
      })
    }

    this.addBindDevice = () => {
      this.setState({ confirm: true })
    }

    this.manageDisk = (dev) => {
      this.setState({ loading: true })
      dev.refreshSystemState(() => {
        if (dev.systemStatus() === 'noBoundVolume') this.setState({ selectedDevice: dev, status: 'diskManage' })
        else this.setState({ type: 'BOUNDLIST' }, () => this.refresh())
      })
    }

    this.refreshList = () => {
      this.setState({ loading: true, list: [] })
      this.props.phi.req('stationList', null, (e, r) => {
        if (e || !r.result || !Array.isArray(r.result.list) || r.error !== '0') {
          this.setState({ loading: false, list: [], error: true }) // TODO Error
        } else {
          const list = r.result.list
          this.setState({ list, loading: false })
        }
      })
    }

    this.showLANToLogin = () => {
      this.setState({ list: [], loading: true, type: 'LANTOLOGIN', status: 'deviceSelect' })
      reqMdns()
        .then(mdns => this.setState({ loading: false, list: mdns }))
        .catch(this.onMDNSError)
    }

    this.onConfirmLANLogin = (dev) => {
      this.setState({ confirm: dev })
    }
  }

  componentDidMount () {
    if (this.props.account.lan) this.showLANToLogin()
    else this.refreshList()
  }

  render () {
    const lan = this.props.account && this.props.account.lan
    const title = lan ? i18n.__('Confirm Logout To LANLogin Title') : i18n.__('Confirm Logout To Bind Device Title')
    const text = lan ? i18n.__('Confirm Logout To LANLogin Text') : i18n.__('Confirm Logout To Bind Device Text')
    const onConfirm = () => (lan ? this.props.jumpToLANLogin(this.state.confirm) : this.props.jumpToBindDevice())
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <SelectDevice
          {...this.props}
          {...this.state}
          manageDisk={this.manageDisk}
          addBindDevice={this.addBindDevice}
          refreshStationList={this.refreshStationList}
          refresh={() => (this.props.account.lan ? this.showLANToLogin() : this.refreshList())}
          type={this.props.account.lan ? 'LANTOLOGIN' : 'CHANGEDEVICE'}
          openLANLogin={this.onConfirmLANLogin}
        />
        <ConfirmDialog
          open={!!this.state.confirm}
          onCancel={() => this.setState({ confirm: false })}
          onConfirm={onConfirm}
          title={title}
          text={text}
        />
      </div>
    )
  }
}

export default ChangeDevice
