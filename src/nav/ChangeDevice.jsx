import i18n from 'i18n'
import React from 'react'
import Promise from 'bluebird'
import { AutoSizer } from 'react-virtualized'
import { MenuItem } from 'material-ui'
import Device from '../login/Device'
import ScrollBar from '../common/ScrollBar'
import { LIButton } from '../common/Buttons'
import { CloseIcon, RefreshIcon } from '../common/Svg'
import CircularLoading from '../common/CircularLoading'

class ChangeDevice extends React.Component {
  /**
   * @param {object} props
   * @param  {function} props.back - close dialog.
   * @param  {object} props.phi - cloud api.
   * @param  {function} props.phi.req - cloud requests.
   * @param  {object} props.selectedDevice - current logged device.
   *
   */
  constructor (props) {
    super(props)

    this.state = {
      loading: true,
      list: []
    }

    this.reqList = () => {
      this.setState({
        loading: true
      })

      this.props.phi.req('stationList', null, (err, res) => {
        console.log(err, res)

        const list = [...res.ownStations, ...res.sharedStations]
        this.setState({ list, loading: false })
      })
    }
  }

  async remoteLoginAsync (device) {
    const { account } = this.props
    const args = { deviceSN: device.sn }
    const { token, cookie } = this.props.phi
    const [boot, users, isLAN] = await Promise.all([
      this.props.phi.reqAsync('boot', args),
      this.props.phi.reqAsync('localUsers', args),
      this.props.phi.testLANAsync(),
      Promise.delay(2000)
    ])
    const user = Array.isArray(users) && users.find(u => u.winasUserId === account.winasUserId)

    if (!token || !user || !boot) throw Error('get LANToken or user error')
    if (boot.state !== 'STARTED') throw Error('station not started')
    Object.assign(user, { cookie })
    return ({ dev: device, user, token, boot, isCloud: !isLAN })
  }

  /**
   *  select device to login
   * @param {object} cdev device info from cloud
   */
  selectDevice (cdev) {
    console.log(cdev, this.props.phi)
    this.setState({ loggingDevice: cdev, list: [cdev] })
    this.remoteLoginAsync(cdev)
      .then(({ dev, user, token, boot, isCloud }) => {
        /* onSuccess: auto login */
        Object.assign(dev, {
          token: { isFulfilled: () => true, ctx: user, data: { token } },
          boot: { isFulfilled: () => true, ctx: user, data: boot },
          mdev: { deviceSN: dev.sn, address: dev.LANIP },
          on: () => {}
        })
        this.props.deviceLogin({
          dev,
          user,
          selectedDevice: dev,
          isCloud
        })
        this.props.phi.req('setLastSN', { sn: dev.sn })
      })
      .catch((error) => {
        console.error('this.getLANToken', error)
        this.setState({ loggingDevice: null, error: true })
      })
  }

  renderRow ({ style, key, device }) {
    const isCurrent = this.props.selectedDevice.mdev.deviceSN === device.sn
    return (
      <div style={style} key={key}>
        <div style={{ position: 'relative', opacity: isCurrent ? 0.7 : 1 }}>
          <MenuItem onClick={() => this.selectDevice(device)} disabled={isCurrent || this.state.loggingDevice} >
            <Device {...this.props} cdev={device} slDevice={this.slDevice} />
          </MenuItem>
          <div style={{ position: 'absolute', right: 32, top: 32 }}>
            {
              this.state.loggingDevice
                ? <CircularLoading />
                : isCurrent ? i18n.__('Current Logged Device') : ''}
          </div>
        </div>
      </div>
    )
  }

  renderList (list) {
    const rowCount = list.length
    const rowHeight = 80
    return (
      <div style={{ width: 450, height: 240 }}>
        <AutoSizer>
          {({ height, width }) => (
            <ScrollBar
              allHeight={rowHeight * rowCount}
              height={height}
              width={width}
              rowHeight={rowHeight}
              rowRenderer={({ style, key, index }) => this.renderRow({ style, key, device: list[index] })}
              rowCount={rowCount}
              overscanRowCount={3}
              style={{ outline: 'none' }}
            />
          )}
        </AutoSizer>
      </div>
    )
  }

  componentDidMount () {
    this.reqList()
  }

  render () {
    return (
      <div style={{ width: 450, height: 376, zIndex: 100, position: 'relative', backgroundColor: 'white' }} >
        <div style={{ height: 64, display: 'flex', alignItems: 'center' }}>
          <LIButton style={{ marginLeft: 12 }} onClick={() => this.props.back(this.state.dev)}>
            <CloseIcon />
          </LIButton>
          <div style={{ flex: 1 }} />
          <LIButton style={{ marginRight: 12 }} onClick={() => this.reqList()}>
            <RefreshIcon />
          </LIButton>
        </div>

        <div style={{ fontSize: 28, display: 'flex', alignItems: 'center', paddingLeft: 80, marginBottom: 36 }} >
          { this.state.loggingDevice ? i18n.__('Connecting to Device') : this.state.error ? i18n.__('ErrorText: Connect Failed')
            : i18n.__('Change Device') }
        </div>

        {
          this.state.loading
            ? (
              <div style={{ height: 128 }} className="flexCenter">
                <CircularLoading />
              </div>
            ) : this.renderList(this.state.list)
        }
      </div>
    )
  }
}

export default ChangeDevice
