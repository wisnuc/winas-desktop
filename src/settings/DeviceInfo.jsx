import i18n from 'i18n'
import React from 'react'
import prettysize from 'prettysize'
import { ipcRenderer } from 'electron'
import { TextField, Divider, IconButton } from 'material-ui'
import DoneIcon from 'material-ui/svg-icons/action/done'
import ModeEdit from 'material-ui/svg-icons/editor/mode-edit'
import CircularLoading from '../common/CircularLoading'

const cpuUsage = (cpu) => {
  if (!cpu || !cpu.times) return 0
  const { idle, irq, nice, sys, user } = cpu.times
  return (100 - ~~(idle / (idle + irq + nice + sys + user) * 100)) / 100 // eslint-disable-line
}

const parseData = value => prettysize(parseInt(value, 10) * 1024)

class DeviceInfo extends React.PureComponent {
  constructor (props) {
    super(props)
    this.state = {
    }

    this.updateLabel = (value) => {
      this.setState({ label: value, errorText: '', changed: true })
    }

    this.newName = ''

    this.changeDeviceName = () => {
      const deviceSN = this.props.selectedDevice && this.props.selectedDevice.mdev.deviceSN
      this.setState({ progress: true }, () => {
        this.props.phi.req('renameStation', { deviceSN, newName: this.state.label }, (err) => {
          if (err) {
            this.props.openSnackBar(i18n.__('Modify Device Name Failed'))
            this.setState({ modify: false, progress: false, label: '' })
          } else {
            this.newName = this.state.label

            Object.assign(this.props.selectedDevice.mdev, { bindingName: this.newName, stationName: this.newName })
            ipcRenderer.send('UPDATE_DEVICE', this.props.selectedDevice)
            this.props.openSnackBar(i18n.__('Modify Device Name Success'))
            this.setState({ modify: false, progress: false, label: '' })
          }
        })
      })
    }

    this.onKeyDown = (e) => {
      if (e.which === 13 && !this.state.errorText && this.state.label && this.state.label.length) this.changeDeviceName()
    }
  }

  componentWillUnmount () {
    this.props.clearRefresh()
  }

  renderSector (color, percent) {
    const stroke = 40
    const normalizedRadius = 20
    const radius = normalizedRadius + 2 * stroke
    const circumference = normalizedRadius * 2 * Math.PI

    return (
      <div style={{ position: 'relative', width: 80, height: 80 }} className="flexCenter">
        <div style={{ position: 'absolute', top: -60, left: -60, width: radius * 2, height: radius * 2 }} >
          <svg
            height={radius * 2}
            width={radius * 2}
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle
              stroke="#e7e7e7"
              opacity="0.5"
              strokeWidth={stroke}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            <circle
              stroke={color}
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={`${circumference} ${circumference}`}
              style={{ strokeDashoffset: circumference - percent * circumference }}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
          </svg>
        </div>
      </div>
    )
  }

  renderCard ({ title, model, usage, color }, index) {
    return (
      <div
        style={{
          position: 'relative',
          width: 320,
          height: 140,
          marginRight: index === 2 ? 0 : 20,
          boxSizing: 'border-box',
          border: 'solid 1px #eaeaea',
          padding: 20
        }}
        key={index.toString()}
      >
        <div style={{ fontSize: 20, color: '#525a60' }}>
          { title }
        </div>
        <div style={{ width: 180, fontSize: 12, color: '#85868c', marginTop: 10, height: 32 }}>
          { model }
        </div>
        <div style={{ fontSize: 16, color: '#85868c', marginTop: 10 }}>
          { `${(usage * 100).toFixed(1)}%` }
        </div>
        <div style={{ position: 'absolute', top: 30, right: 20, width: 80, height: 80 }}>
          { this.renderSector(color, usage) }
        </div>
      </div>
    )
  }

  renderDeviceName () {
    const editable = !this.props.account.lan
    const mac = this.props.selectedDevice.mdev.mac || ''
    const defaultName = mac ? `N2-${mac.slice(-2)}` : 'N2'
    const name = this.newName || this.props.selectedDevice.mdev.bindingName || defaultName
    return (
      <div>
        <div style={{ height: 24, fontSize: 14, color: '#85868c', display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
          { i18n.__('Device Name') }
        </div>
        <div
          style={{ height: 48, fontSize: 16, color: 'rgba(0, 0, 0, 0.87)', marginTop: -12 }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ height: 16 }} />
          {
            this.state.modify && editable
              ? (
                <div style={{ marginTop: -8, display: 'flex' }}>
                  <TextField
                    name="deviceName"
                    inputStyle={{ marginLeft: 10, color: '#525a60' }}
                    onChange={e => this.updateLabel(e.target.value)}
                    maxLength={20}
                    value={this.state.modify ? this.state.label : name}
                    errorText={this.state.errorText}
                    ref={(input) => { if (input && this.state.modify) { input.focus() } }}
                    onKeyDown={this.onKeyDown}
                  />
                  {
                    this.state.progress
                      ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginLeft: 8 }}>
                          <CircularLoading style={{ transform: 'scale(0.46)' }} />
                        </div>
                      )
                      : (
                        <IconButton
                          onClick={() => this.state.changed && this.changeDeviceName()}
                          disabled={!!this.state.errorText || !this.state.label || !this.state.label.length}
                        >
                          <DoneIcon color="#31a0f5" />
                        </IconButton>
                      )
                  }
                </div>
              )
              : (
                <div
                  style={{ display: 'flex', alignItems: 'center', height: 32, marginLeft: 10, color: '#525a60' }}
                  onClick={() => this.setState({ modify: true })}
                >
                  { this.state.label ? this.state.label : name }
                  <div style={{ flexGrow: 1 }} />
                  <ModeEdit color={editable ? '#31a0f5' : '#85868c'} style={{ marginRight: 24 }} />
                </div>
              )
          }
          {
            <Divider
              color="#85868c"
              style={{ opacity: !editable || !this.state.modify ? 1 : 0, width: 267 }}
            />
          }
        </div>
      </div>
    )
  }

  renderList (data, index) {
    const { title, value } = data
    return (
      <div style={{ width: 320, height: 60 }} key={index.toString()}>
        <div style={{ height: 24, fontSize: 14, color: '#85868c', display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
          { title }
        </div>
        <div style={{ height: 36, fontSize: 16, color: '#525a60', display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
          { value }
        </div>
        <div style={{ height: 1, width: 267, backgroundColor: '#eaeaea', opacity: 0.98 }} />
      </div>
    )
  }

  renderLoading () {
    return (
      <div style={{ width: '100%', height: 'calc(100% - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} >
        <CircularLoading />
      </div>
    )
  }

  render () {
    console.log('device props', this.props)
    const { device, network, cpus, memory, address } = this.props

    if (!device || !network || !cpus || !memory || !address) return this.renderLoading()

    const { model, swVersion, hwVersion } = device

    const memUsage = (memory && (1 - parseInt(memory.memAvailable, 10) / parseInt(memory.memTotal, 10))) || 0

    const NIC = network.find(card => card && card.ipAddresses && card.ipAddresses.length > 0) || {}
    const mac = NIC.address

    const graphData = [
      { title: 'CPU1', model: cpus[0] && cpus[0].model, usage: cpuUsage(cpus[0]), color: '#31a0f5' },
      { title: 'CPU2', model: cpus[1] && cpus[1].model, usage: cpuUsage(cpus[1]), color: '#5fc315' },
      { title: i18n.__('Memory'), model: parseData(memory && memory.memTotal), usage: memUsage, color: '#ffb400' }
    ]

    const listData = [
      { title: i18n.__('Device Model'), value: model },
      { title: i18n.__('Current IP'), value: address },
      { title: i18n.__('Mac Address'), value: mac },
      { title: i18n.__('Hardware Version'), value: hwVersion },
      { title: i18n.__('Firmware Version'), value: swVersion }
    ]

    return (
      <div
        className="flexCenter"
        style={{ width: '100%', height: 'calc(100% - 60px)' }}
        onClick={() => !this.state.progress && this.setState({ modify: false, label: '' })}
      >
        <div style={{ position: 'relative', width: '100%', height: 420 }} >
          <div style={{ width: 1000, height: 140, margin: '20px auto', display: 'flex', alignItems: 'center' }}>
            { graphData.map((data, index) => this.renderCard(data, index)) }
          </div>
          <div style={{ height: 20 }} />
          <div
            style={{
              width: 1000,
              height: 240,
              margin: '0 auto',
              display: 'grid',
              gridGap: 20,
              gridTemplateColumns: '1fr 1fr 1fr'
            }}
          >
            { this.renderDeviceName() }
            { listData.map((data, index) => this.renderList(data, index))}
          </div>
        </div>
      </div>
    )
  }
}

export default DeviceInfo
