import i18n from 'i18n'
import React from 'react'
import { Divider } from 'material-ui'
import { AutoSizer } from 'react-virtualized'

import Device from './Device'
import Dialog from '../common/PureDialog'
import ScrollBar from '../common/ScrollBar'
import ConfirmDialog from '../common/ConfirmDialog'
import { RSButton, LIButton } from '../common/Buttons'
import { RefreshIcon, HelpIcon, AddDeviceIcon, BackIcon } from '../common/Svg'
import CircularLoading from '../common/CircularLoading'

class DeviceSelect extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      dev: null,
      list: null,
      confirm: false,
      invitation: false,
      selectedDevice: null
    }

    this.bindVolume = (dev, selectedDevice) => { // dev === selectedDevice.state
      this.setState({ confirm: false, dev })
      this.props.manageDisk(selectedDevice)
    }

    this.slDevice = (dev, selectedDevice) => {
      clearTimeout(this.timer)
      if (this.props.type === 'BOUNDLIST' && ['ready', 'offline'].includes(dev.systemStatus())) {
        const { inviteStatus, accountStatus, type } = dev.mdev
        if (type === 'owner' || (type === 'service' && inviteStatus === 'accept' && accountStatus === '1')) {
          this.setState({ dev, cloudLogin: dev, selectedDevice }) // cloud login: remote or LAN
        } else if (inviteStatus === 'pending' && accountStatus === '1') {
          this.setState({ dev, invitation: dev, selectedDevice }) // invitee confirm invitation
        }
      } else if (this.props.type === 'BOUNDLIST' && dev.systemStatus() === 'noBoundVolume') {
        this.bindVolume(dev, selectedDevice)
      } else if (this.props.type === 'LANTOLOGIN') {
        this.props.openLANLogin(selectedDevice)
      } else if (this.props.type === 'LANTOBIND') {
        this.setState({ dev, confirm: true, selectedDevice })
      } else if (this.props.type === 'CHANGEDEVICE') {
        const { inviteStatus, accountStatus, type } = dev.mdev
        if (type === 'owner' || (type === 'service' && inviteStatus === 'accept' && accountStatus === '1')) {
          this.setState({ dev, changeDeviceConfirm: true, selectedDevice })
        } else if (inviteStatus === 'pending' && accountStatus === '1') {
          this.setState({ dev, invitation: dev, selectedDevice })
        }
      }
    }

    this.changeDevice = () => {
      this.setState({ changeDeviceConfirm: false })
      this.timer = setTimeout(() => this.setState({ cloudLogin: this.state.dev }), 200)
    }
  }

  renderDev (dev, index) {
    return (
      <Device
        {...this.props}
        slDevice={this.slDevice}
        key={index.toString()}
        mdev={!['BOUNDLIST', 'CHANGEDEVICE'].includes(this.props.type) ? dev : null}
        cdev={['BOUNDLIST', 'CHANGEDEVICE'].includes(this.props.type) ? dev : null}
      />
    )
  }

  renderDevs (arr) {
    return (
      <AutoSizer>
        {({ height, width }) => {
          const count = Math.floor((width - 1100) / 264) + 4
          const rowCount = Math.ceil(arr.length / count)
          if (rowCount === 1) {
            return (
              <div className="flexCenter" style={{ width, height, marginTop: -15 }}>
                { arr.map((dev, i) => this.renderDev(dev, i)) }
              </div>
            )
          }

          const rowRenderer = ({ key, index, style, isScrolling }) => {
            const currArr = arr.slice(index * count, index * count + count)
            return (
              <div key={key} style={style} >
                <div
                  style={{
                    minWidth: 'min-content',
                    display: 'flex',
                    justifyContent: 'center',
                    marginTop: index > 0 ? -40 * index : 0
                  }}
                >
                  {
                    Array.from({ length: count }).map((v, i) => {
                      const dev = currArr[i]
                      if (dev) return this.renderDev(dev, i)
                      return <div style={{ width: 250, margin: '30px 7px 0 7px', opacity: 0 }} key={i.toString()} />
                    })
                  }
                </div>
              </div>
            )
          }

          const rowHeight = 440
          const allHeight = rowHeight * rowCount
          return (
            <ScrollBar
              allHeight={allHeight}
              height={height}
              width={width}
              estimatedRowSize={rowHeight}
              rowHeight={rowHeight}
              rowRenderer={rowRenderer}
              rowCount={rowCount}
              style={{ outline: 'none' }}
            />
          )
        }}
      </AutoSizer>
    )
  }

  renderNoDev () {
    return (
      <div style={{ height: '100%', width: '100%' }} className="flexCenter">
        <div>
          <img
            width={320}
            height={180}
            src="./assets/images/pic_nodevice.png"
            alt=""
          />
          <div
            style={{ width: '100%', textAlign: 'center', color: '#31a0f5', marginTop: 20, cursor: 'pointer' }}
            onClick={() => this.setState({ showHelp: true })}
          >
            { i18n.__('Not Found Any Device ?') }
          </div>
        </div>
      </div>
    )
  }

  renderUserMaint () {
    return (
      <div style={{ width: 320, zIndex: 200, position: 'relative' }} className="paper" >
        <div
          style={{ height: 59, display: 'flex', alignItems: 'center', paddingLeft: 19 }}
          className="title"
        >
          { i18n.__('User Maint Title') }
        </div>
        <Divider style={{ marginLeft: 20, width: 280 }} className="divider" />
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            style={{ width: 207, height: 117 }}
            src="./assets/images/pic-diskchange.png"
            alt=""
          />
        </div>
        <div style={{ width: '100%', textAlign: 'center', color: '#fa5353' }}>
          { i18n.__('User Maint Text')}
        </div>
        <div style={{ height: 70, width: 'calc(100% - 40px)', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
          <div style={{ flexGrow: 1 }} />
          <RSButton label={i18n.__('Got It')} onClick={() => this.setState({ UserMaint: false })} />
        </div>
      </div>
    )
  }

  renderListError () {
    return (
      <div style={{ width: '100%', height: '100%' }} className="flexCenter">
        <div>
          <img src="./assets/images/pic_network_failed.png" alt="" width={320} height={180} />
          <div style={{ marginTop: 30, height: 30, fontSize: 14, color: '#31a0f5' }} className="flexCenter" >
            { i18n.__('Error in Base Text') }
          </div>
          <div style={{ height: 70 }} />
        </div>
      </div>
    )
  }

  renderLoading () {
    return (
      <div style={{ width: '100%', height: '100%' }} className="flexCenter">
        <CircularLoading />
      </div>
    )
  }

  render () {
    let arr = [...this.props.list]
    /* hide reject or inactive invitation */
    if (['BOUNDLIST', 'CHANGEDEVICE'].includes(this.props.type)) {
      arr = arr.filter(l => l.type === 'owner' ||
        (l.accountStatus === '1' && ['pending', 'accept'].includes(l.inviteStatus)))
    }

    const currentSN = this.props.selectedDevice && this.props.selectedDevice.mdev && this.props.selectedDevice.mdev.deviceSN

    /* sort list: current > online > offline */
    arr = arr.sort((a, b) => {
      if (currentSN && (a.deviceSN === currentSN)) return -1
      if (currentSN && (b.deviceSN === currentSN)) return 1
      if (a.onlineStatus === 'offline') return 1
      if (b.onlineStatus === 'offline') return -1
      return 0
    })

    const title = this.props.type === 'LANTOBIND' ? i18n.__('Select Device To Bind')
      : this.props.type === 'LANTOLOGIN' ? i18n.__('Select LAN Device To Login') : i18n.__('Select Device To Login')

    return (
      <div style={{ width: '100%', height: '100%', backgroundColor: '#fcfcfc' }}>
        <div style={{ height: 49, width: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ marginLeft: 30, display: 'flex', alignItems: 'center' }} className="title">
            {
              this.props.type === 'LANTOBIND' &&
                <LIButton onClick={this.props.refreshStationList} tooltip={i18n.__('Return')}>
                  <BackIcon />
                </LIButton>
            }
            { title }
          </div>
          <div style={{ flexGrow: 1 }} />
          {
            ['BOUNDLIST', 'CHANGEDEVICE'].includes(this.props.type) &&
              <LIButton onClick={this.props.addBindDevice} tooltip={i18n.__('Add Device')}> <AddDeviceIcon /> </LIButton>
          }
          <LIButton onClick={this.props.refresh} tooltip={i18n.__('Refresh')}> <RefreshIcon /> </LIButton>
          <LIButton onClick={() => this.setState({ showHelp: true })} tooltip={i18n.__('Help')}> <HelpIcon /> </LIButton>
          <div style={{ width: 32 }} />
        </div>
        <Divider style={{ marginLeft: 30, width: 'calc(100% - 60px)', backgroundColor: '#f5f5f5' }} />

        <div style={{ width: '100%', height: 'calc(100% - 50px)' }} >
          { this.props.loading ? this.renderLoading()
            : this.props.status === 'listError' ? this.renderListError()
              : arr.length ? this.renderDevs(arr) : this.renderNoDev() }
        </div>

        {/* Device boot failed, due to disk changed */}
        <Dialog open={!!this.state.UserMaint} onRequestClose={() => this.setState({ UserMaint: null })} modal >
          { !!this.state.UserMaint && this.renderUserMaint() }
        </Dialog>

        {/* confirm to change device */}
        <ConfirmDialog
          open={!!this.state.changeDeviceConfirm}
          onCancel={() => this.setState({ dev: null, changeDeviceConfirm: false })}
          onConfirm={this.changeDevice}
          title={i18n.__('Confirm Change Device Title')}
          text={i18n.__('Confirm Change Device Text')}
        />
      </div>
    )
  }
}

export default DeviceSelect
