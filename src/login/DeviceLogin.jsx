import i18n from 'i18n'
import React from 'react'
import Promise from 'bluebird'
import { AutoSizer } from 'react-virtualized'
import { MenuItem } from 'material-ui'
import FlatButton from '../common/FlatButton'
import Device from '../login/Device'
import ScrollBar from '../common/ScrollBar'
import { LIButton } from '../common/Buttons'
import { RefreshIcon } from '../common/Svg'
import CircularLoading from '../common/CircularLoading'

class ChangeDevice extends React.Component {
  /**
   * @param {object} props
   * @param  {function} props.backToLogin - log out and back to login.
   * @param  {function} props.deviceLogin - login to device.
   * @param  {object} props.account - user info.
   * @param  {string} props.account.winasUserId - user id.
   * @param  {object} props.phi - cloud api.
   * @param  {function} props.phi.req - cloud requests.
   * @param  {array} props.list - station list.
   * @param  {object} props.cdev - default device, last logged device.
   * @param  {string} props.status - connectDev.
   */
  constructor (props) {
    super(props)

    this.state = {
      loading: true,
      list: []
    }

    this.reqList = () => {
      this.setState({
        loading: true,
        error: false,
        loggingDevice: null
      })

      this.props.phi.req('stationList', null, (err, res) => {
        console.log(err, res)
        if (err) {
          this.setState({ list: [], loading: false, error: true })
        } else {
          const list = [...res.ownStations, ...res.sharedStations]
          this.setState({ list, loading: false })
        }
      })
    }
  }

  async remoteLoginAsync (device) {
    const { account } = this.props
    console.log('this.props', this.props)
    const args = { deviceSN: device.sn }
    const { token, cookie } = this.props.phi
    const [tokenRes, boot, users, space, isLAN] = await Promise.all([
      this.props.phi.reqAsync('LANToken', args),
      this.props.phi.reqAsync('boot', args),
      this.props.phi.reqAsync('localUsers', args),
      this.props.phi.reqAsync('space', args),
      this.props.phi.testLANAsync(device.LANIP),
      Promise.delay(2000)
    ])

    const LANToken = tokenRes.token
    const user = Array.isArray(users) && users.find(u => u.winasUserId === account.winasUserId)

    if (!LANToken || !user || !boot) throw Error('get LANToken or user error')
    if (boot.state !== 'STARTED') throw Error('station not started')
    Object.assign(user, { cookie })
    return ({ dev: device, user, token: isLAN ? LANToken : token, boot, space, isCloud: !isLAN })
  }

  remoteLogin (device) {
    this.remoteLoginAsync(device)
      .then(({ dev, user, token, boot, space, isCloud }) => {
      /* onSuccess: auto login */
        Object.assign(dev, {
          token: { isFulfilled: () => true, ctx: user, data: { token } },
          boot: { isFulfilled: () => true, ctx: user, data: boot },
          space,
          mdev: { deviceSN: dev.sn, address: dev.LANIP },
          // add fake listeners, TODO: remove this
          on: () => {},
          removeAllListeners: () => {}
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
  /**
   *  select device to login
   * @param {object} cdev device info from cloud
   * @param {array} list device list
   */
  selectDevice (cdev, list) {
    this.setState({ list, loggingDevice: cdev, error: false, loading: false })
    this.remoteLogin(cdev)
  }

  componentDidUpdate (prevProps, prevState) {
    if (this.props.cdev && prevProps && prevProps.status !== 'connectDev' &&
     this.props && this.props.status === 'connectDev') {
      this.selectDevice(this.props.cdev, this.props.list)
    }
  }

  renderRow ({ style, key, device }) {
    return (
      <div style={style} key={key}>
        <div style={{ position: 'relative' }}>
          <MenuItem
            onClick={() => this.selectDevice(device, this.state.list)}
            disabled={!!this.state.loggingDevice}
          >
            <Device {...this.props} cdev={device} slDevice={this.slDevice} />
          </MenuItem>
          <div style={{ position: 'absolute', right: 48, top: 32 }}>
            { this.state.loggingDevice ? <CircularLoading /> : '' }
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

  render () {
    const isFailed = !!this.state.error
    const isLogging = !!this.state.loggingDevice
    const isNoDevice = this.state.status === 'noDevice'
    return (
      <div style={{ width: '100%', zIndex: 100, height: '100%', position: 'relative' }} >
        {/* header */}
        <div style={{ marginTop: 46, height: 24, display: 'flex', alignItems: 'center' }}>
          {
            !isLogging &&
            <div style={{ marginLeft: 32 }}>
              <FlatButton
                primary
                label={i18n.__('Log Out')}
                onClick={this.props.backToLogin}
              />
            </div>
          }
          <div style={{ flex: 1 }} />
          {
            !isLogging &&
            <LIButton style={{ marginRight: 12 }} onClick={() => this.reqList()} >
              <RefreshIcon />
            </LIButton>
          }
        </div>

        {/* title */}
        <div style={{ fontSize: 28, display: 'flex', alignItems: 'center', paddingLeft: 80, marginTop: 52 }} >
          {
            isFailed ? i18n.__('Connection Failed')
              : isNoDevice
                ? i18n.__('No Bind Device Title')
                : isLogging ? i18n.__('Connecting to Device') : i18n.__('Select Device to Login')
          }
        </div>

        <div style={{ height: 36 }} />

        {/* device list or loading */}
        {
          this.state.loading
            ? (
              <div style={{ height: 128 }} className="flexCenter">
                <CircularLoading />
              </div>
            )
            : this.renderList(isLogging ? [this.state.loggingDevice] : this.state.list)

        }
      </div>
    )
  }
}

export default ChangeDevice
