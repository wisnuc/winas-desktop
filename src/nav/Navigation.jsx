import i18n from 'i18n'
import React from 'react'
import Promise from 'bluebird'
import { ipcRenderer } from 'electron'
import { FlatButton, Menu, Popover, IconButton } from 'material-ui'

import Tasks from './Tasks'
import Policy from './Policy'
import FileMenu from './FileMenu'
import SettingsMenu from './SettingMenu'
import RenderDevice from './RenderDevice'
import ChangeDevice from './ChangeDevice'

import Home from '../view/Home'
import Search from '../view/Search'
import Public from '../view/Public'
import Backup from '../view/Backup'
import Transfer from '../view/Transfer'

import Fruitmix from '../common/fruitmix'
import SearchButton from '../common/Search'
import prettySize from '../common/prettySize'
import WindowAction from '../common/WindowAction'
import DialogOverlay from '../common/PureDialog'
import UpdateFirmDialog from '../settings/UpdateFirmDialog'
import { BackIcon, WisnucLogo, DeviceIcon, ArrowDownIcon, CloseIcon, PDFIcon, WORDIcon, EXCELIcon, PPTIcon, PhotoIcon, VideoIcon, AudioIcon, ExitSearchIcon, MenuIcon } from '../common/Svg'

class NavViews extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      nav: null,
      types: [],
      snackBar: '',
      searchText: '',
      changeDevice: false
    }

    this.views = {}

    this.install([
      { name: 'home', View: Home },
      { name: 'public', View: Public },
      { name: 'backup', View: Backup },
      { name: 'search', View: Search },

      { name: 'transfer', View: Transfer }
    ])

    this.navTo = (nav, target) => {
      if ((nav !== this.state.nav) || (target && target.dirUUID)) {
        this.props.setPalette(this.views[nav].primaryColor(), this.views[nav].accentColor())
        this.setState({ nav, primaryColor: this.views[nav].primaryColor() })
        if (this.state.nav) this.views[this.state.nav].navLeave()
        this.views[nav].navEnter(target)
      } else if (nav === this.state.nav) {
        this.views[nav].navRoot()
      }
    }

    this.navToDrive = (driveUUID, dirUUID) => {
      const drives = this.props.apis.drives && this.props.apis.drives.data
      const drive = drives && drives.find(d => d.uuid === driveUUID)
      if (!drive) return
      if (typeof this.views[this.state.nav].clearSearch === 'function') this.views[this.state.nav].clearSearch()
      this.setState({ searchMode: false, searchText: '', types: [] })
      if (drive.tag === 'home') this.navTo('home', { driveUUID, dirUUID })
      else if (drive.tag === 'built-in') this.navTo('public', { driveUUID, dirUUID })
      else if (drive.type === 'backup') this.navTo('backup', { driveUUID, dirUUID })
    }

    this.navGroup = (group) => {
      if (!this.state.nav || this.views[this.state.nav].navGroup() !== group) {
        switch (group) {
          case 'file':
            this.navTo('home')
            break
          case 'transmission':
            this.navTo('downloading')
            break
          case 'settings':
            this.navTo('settings')
            break
          default:
            break
        }
      }

      if (group === 'settings' && this.state.nav !== 'settings' && this.views[this.state.nav].navGroup() === 'settings') {
        this.navTo('settings')
      }
      if (group === 'transmission') ipcRenderer.send('GET_TRANSMISSION')
    }

    this.showFirmUpdate = true

    this.checkFirmWareAsync = async () => {
      await Promise.delay(1000)
      const res = await this.props.apis.pureRequestAsync('firmwareReady')
      if (res && res.error === '0' && res.result && res.result.tag_name) {
        this.setState({ newRel: res.result })
      }
    }

    this.init = () => {
      this.navTo('home')
    }

    this.handleTask = (uuid, response, conflicts) => {
      conflicts.forEach((c, index) => {
        let policy
        switch (response[index]) {
          case 'rename':
            policy = ['rename', 'rename']
            break
          case 'replace':
            policy = ['replace', 'replace']
            break
          case 'skip':
            policy = ['skip', 'skip']
            break
          case 'merge':
            policy = ['keep', null]
            break
          case 'overwrite':
            policy = ['keep', null]
            break
          default:
            policy = [null, null]
        }
        this.props.apis.pureRequest('handleTask', { taskUUID: uuid, nodeUUID: c.nodeUUID, policy })
      })
    }

    this.jumpTo = (nav) => {
      if (nav === 'settings') this.navGroup('settings')
      else if (nav === 'home') this.navGroup('file')
    }

    this.openTasks = () => {
      this.setState({ showTask: true })
    }

    this.openMovePolicy = (data) => {
      this.setState({ conflicts: data })
    }

    this.handleCheck = (type) => {
      const t = this.state.types
      const index = t.indexOf(type)
      let types = []
      if (t === '*') types = [type]
      else if (index === -1) types = [...t, type]
      else types = [...t.slice(0, index), ...t.slice(index + 1)]
      this.setState({ types })

      clearTimeout(this.searchTimer)
      this.searchTimer = null
      this.views[this.state.nav].search(this.state.searchText, types)
    }

    this.openPop = (e) => {
      e.preventDefault()
      this.setState({ open: true, anchorEl: e.currentTarget })
    }

    this.openDevicePop = (e) => {
      e.preventDefault()
      this.setState({ openDevice: true, deviceAnchorEl: e.currentTarget })
    }

    this.enterSearchMode = () => {
      this.preNav = this.state.nav
      this.setState({ searchMode: true })
      this.navTo('search')
    }

    this.exitSearchMode = () => {
      this.views[this.state.nav].clearSearch()
      this.setState({ searchMode: false, searchText: '', types: [] })
      this.navTo(this.preNav)
    }

    this.searchTimer = null
    this.handleSearch = (searchText) => {
      clearTimeout(this.searchTimer)
      this.setState({ searchText })
      if (!searchText) {
        this.views[this.state.nav].clearSearch()
      } else {
        this.searchTimer = setTimeout(() => {
          this.searchTimer = null
          this.views[this.state.nav].search(searchText, this.state.types)
        }, 500)
      }
    }

    this.clearSearchText = () => {
      this.setState({ searchText: '' })
      if (this.textRef) this.textRef.focus()
      if (!this.state.types.length) this.views[this.state.nav].clearSearch()
      else this.views[this.state.nav].search('', this.state.types)
    }

    this.onChangeDevice = () => {
      this.setState({ openDevice: false, changeDevice: true })
    }
  }

  componentDidMount () {
    this.init()
    ipcRenderer.send('START_TRANSMISSION')
    ipcRenderer.on('snackbarMessage', (e, message) => this.props.openSnackBar(message.message))
    ipcRenderer.on('conflicts', (e, args) => this.setState({ conflicts: args }))
    ipcRenderer.on('JUMP_TO', (e, nav) => this.jumpTo(nav))
  }

  componentDidUpdate () {
    const { apis, isCloud } = this.props
    const isAdmin = apis && apis.account && apis.account.data && apis.account.data.isFirstUser
    const hasDevice = apis && apis.device && apis.device.data
    if (!isCloud && this.showFirmUpdate && isAdmin && hasDevice) {
      this.showFirmUpdate = false
      /* check FirmWare */
      // this.checkFirmWareAsync().catch(e => console.error('checkFirmWareAsync error', e))
    }
    this.views[this.state.nav].willReceiveProps(this.props)
  }

  componentWillReceiveProps (nextProps) {
    if (this.state.nav && nextProps.forceUpdate && (this.state.nav === 'public')) { // in Public Root should refresh users
      this.props.clearForceUpdate()
      this.views[this.state.nav].navEnter()
    }
  }

  componentWillUnmount () {
    ipcRenderer.removeAllListeners('snackbarMessage')
    ipcRenderer.removeAllListeners('conflicts')
    ipcRenderer.removeAllListeners('JUMP_TO')
  }

  install (navs) {
    navs.forEach(({ name, View }) => {
      this.views[name] = new View(this)
      this.views[name].on('updated', next => this.setState({ [name]: next }))
    })
  }

  renderView () {
    return this.views[this.state.nav].render({
      navTo: this.navTo,
      navToDrive: this.navToDrive,
      openSnackBar: this.props.openSnackBar,
      pin: this.state.pin || this.state.searchMode,
      primaryColor: this.state.primaryColor
    })
  }

  renderFileGroup () {
    const toolBarStyle = { height: 64, marginLeft: 32, width: 'calc(100% - 36px)', display: 'flex', alignItems: 'center' }
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          width: '100%',
          position: 'relative',
          backgroundColor: 'FFF'
        }}
      >
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
          {/* Toolbar */}
          { this.views[this.state.nav].renderToolBar({ style: toolBarStyle }) }

          {/* Title and BreadCrumbItem */}
          {/* this.views[this.state.nav].renderTitle({ style: titleStyle }) */}

          <div style={{ backgroundColor: '#e8eaed', height: 1, width: '100%', margin: '8px 0px 8px 32px' }} />

          {/* File Content */}
          <div style={{ height: 'calc(100% - 88px)', width: '100%' }} >
            { this.renderView() }
          </div>
        </div>

        {/* drag item */}
        { this.views[this.state.nav].renderDragItems() }

        {/* Tasks */}
        {
          this.state.showTasks &&
            <Tasks
              apis={this.props.apis}
              onRequestClose={() => this.setState({ showTasks: false }, () => this.views[this.state.nav].navEnter())}
              openMovePolicy={this.openMovePolicy}
            />
        }

        {/* upload policy: upload -> ipc || tasks -> handleTask */}
        <DialogOverlay open={!!this.state.conflicts} onRequestClose={() => this.setState({ conflicts: null })} modal >
          {
            this.state.conflicts &&
              <Policy
                primaryColor={this.state.primaryColor}
                data={this.state.conflicts}
                ipcRenderer={ipcRenderer}
                handleTask={this.handleTask}
                onRequestClose={() => this.setState({ conflicts: null })}
              />
          }
        </DialogOverlay>

        <DialogOverlay open={!!this.state.newRel} onRequestClose={() => this.setState({ newRel: null })} modal transparent >
          {
            this.state.newRel &&
              <UpdateFirmDialog
                {...this.props}
                rel={this.state.newRel}
                device={this.props.apis.device.data}
                onRequestClose={() => this.setState({ newRel: null })}
              />
          }
        </DialogOverlay>

      </div>
    )
  }

  renderTrans () {
    return (
      <div style={{ height: '100%', width: '100%', position: 'relative' }} >
        {/* Toolbar */}
        { this.renderView() }
      </div>
    )
  }

  renderSettings () {
    const isAdmin = this.props.apis.account && this.props.apis.account.data && this.props.apis.account.data.isFirstUser
    const isLAN = this.props.account && this.props.account.lan
    if (this.state.nav === 'settings') {
      return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
          <SettingsMenu
            isLAN={!!isLAN}
            isAdmin={isAdmin}
            isCloud={this.props.isCloud}
            views={this.views}
            nav={this.state.nav}
            navTo={this.navTo}
          />
        </div>
      )
    }
    const title = this.views[this.state.nav].menuName()
    return (
      <div style={{ height: '100%', width: '100%' }}>
        <div
          style={{ height: 60, minWidth: 210, display: 'flex', alignItems: 'center' }}
        >
          <FlatButton
            label={title}
            labelStyle={{
              height: 60,
              minWidth: 210,
              lineHeight: '60px',
              fontSize: 22,
              color: '#525a60',
              marginLeft: 8,
              textTransform: 'capitalize'
            }}
            hoverColor="rgba(0,0,0,.04)"
            rippleColor="rgba(0,0,0,.3)"
            icon={<BackIcon style={{ color: '#525a60' }} />}
            onClick={() => this.navTo('settings')}
            style={{ height: 60, minWidth: 210, borderRadius: '0 30px 30px 0' }}
          />
          <div style={{ flexGrow: 1 }} />
        </div>
        <div style={{ height: 'calc(100% - 50px)', width: '100%' }}>
          { this.renderView() }
        </div>
      </div>
    )
  }

  renderTypes () {
    const array = [
      { Icon: PDFIcon, name: 'PDFs', type: 'pdf', color: '#db4437' },
      { Icon: WORDIcon, name: 'Word', type: 'word', color: '#4285f4' },
      { Icon: EXCELIcon, name: 'Excel', type: 'excel', color: '#0f9d58' },
      { Icon: PPTIcon, name: 'PPT', type: 'ppt', color: '#db4437' },
      { Icon: PhotoIcon, name: i18n.__('Photo and Image'), type: 'image', color: '#db4437' },
      { Icon: VideoIcon, name: i18n.__('Video'), type: 'video', color: '#db4437' },
      { Icon: AudioIcon, name: i18n.__('Audio'), type: 'audio', color: '#00bcd4' }
    ]
    return (
      <div style={{ width: 192, marginLeft: 16, position: 'relative' }}>
        {
          array.map(({ Icon, name, type, color }) => {
            const isHover = this.state.hoverType === type
            const isSelected = this.state.types === '*' || this.state.types.includes(type)
            return (
              <div
                key={name}
                style={{
                  height: 40,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  borderRadius: 20,
                  margin: isHover ? '-1px 0px 7px -1px' : '0px 0px 8px 0px',
                  border: isHover ? '1px solid #e2e7ea' : '',
                  backgroundColor: isSelected ? 'rgba(226,231,234,.26)' : '#FFF'
                }}
                onClick={() => this.handleCheck(type)}
                onMouseMove={() => this.setState({ hoverType: type })}
                onMouseLeave={() => this.setState({ hoverType: '' })}
              >
                <Icon style={{ color, marginLeft: 16 }} />
                <div style={{ fontWeight: 500, marginLeft: 32, opacity: 0.87 }}>
                  { name }
                </div>
                <div style={{ flexGrow: 1 }} />
                { isSelected && <CloseIcon style={{ height: 18, width: 18 }} /> }
                <div style={{ width: 16 }} />
              </div>
            )
          })
        }
      </div>
    )
  }

  renderNavs () {
    const shrinked = ['pin', 'searchMode'].every(v => !this.state[v])
    const transition = 'width 225ms'
    let [total, used, percent] = ['--', '--', 0]
    try {
      const space = this.props.selectedDevice.space.data
      total = prettySize(space.total * 1024)
      used = prettySize(space.used * 1024)
      percent = space.used / space.total
    } catch (e) {
      // console.error('parse error')
    }
    const usage = `${used}/${total}`
    const info = this.props.selectedDevice && this.props.selectedDevice.info && this.props.selectedDevice.info.data
    const sn = info && info.device && info.device.sn && info.device.sn.slice(-4)
    const deviceName = sn ? `Winas-${sn}` : 'Winas'
    return (
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: shrinked ? 88 : 224,
          backgroundColor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 102,
          WebkitAppRegion: 'no-drag',
          overflow: 'hidden',
          transition,
          borderRight: '1px solid rgba(0,0,0,.06)'
        }}
      >
        {/** WebkitAppRegion */}
        <div style={{ height: 34, width: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ height: 34, width: 34, margin: 4, display: this.state.searchMode ? 'none' : undefined }} className="flexCenter">
            <IconButton
              onClick={() => this.setState({ pin: !this.state.pin })}
              iconStyle={{ color: 'rgba(0,0,0,.26)', width: 18, height: 18 }}
              tooltip={!this.state.pin ? i18n.__('Draw Menu') : i18n.__('Withdraw Menu')}
              tooltipPosition="bottom-right"
            >
              { !this.state.pin ? <MenuIcon /> : <MenuIcon /> }
            </IconButton>
          </div>
          <div style={{ height: 34, width: this.state.pin ? 180 : 0, WebkitAppRegion: 'drag', transition }} />
        </div>

        {/** title */}
        <div style={{ height: 64, width: 224, display: 'flex', alignItems: 'center' }}>
          <div style={{ height: 64, width: 88 }} className="flexCenter">
            {
              this.state.searchMode
                ? (
                  <ExitSearchIcon
                    style={{ width: 40, height: 40, cursor: 'pointer', marginTop: -8, color: '#00695c' }}
                    onClick={this.exitSearchMode}
                  />
                ) : <WisnucLogo style={{ width: 48, height: 48, color: '#00695c' }} />
            }
          </div>
          {
            !this.state.searchMode &&
              <div style={{ height: 72, fontSize: 24, fontWeight: 500, alignItems: 'center', display: 'flex' }} >
                WISNUC
              </div>
          }
        </div>
        {
          /** normal home view */
          !this.state.searchMode ? (
            <div
              style={{
                height: 'calc(100% - 106px)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div
                style={{ height: 56, width: '100%', padding: 16, boxSizing: 'border-box' }}
                onClick={this.enterSearchMode}
              >
                <SearchButton
                  fire={() => {}}
                  hint={i18n.__('Search')}
                  clear={() => {}}
                  shrinked={shrinked}
                />
              </div>
              <div style={{ height: 16 }} />
              <div style={{ width: 224 }}>
                <FileMenu
                  pin={this.state.pin}
                  views={this.views}
                  nav={this.state.nav}
                  navTo={this.navTo}
                  device={this.props.selectedDevice.mdev}
                  primaryColor={this.state.primaryColor}
                />
              </div>
              {
                ['home', 'public'].includes(this.state.nav) &&
                  this.views[this.state.nav].renderCreateNewButton({ shrinked, primaryColor: this.state.primaryColor })
              }
              <div style={{ flexGrow: 1 }} />
              <div
                onClick={this.openDevicePop}
                style={{ height: 72, width: 224, display: 'flex', alignItems: 'center', position: 'relative', cursor: 'pointer' }}
              >
                <div style={{ height: 72, width: 88 }} className="flexCenter">
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: this.state.openDevice ? 'rgba(0,0,0,.06)' : '#FFF'
                    }}
                    className="flexCenter"
                  >
                    <DeviceIcon style={{ width: 24, height: 24 }} />
                  </div>
                </div>
                <div style={{ height: 72, marginTop: 16 }}>
                  <div style={{ opacity: 0.87, fontWeight: 500 }}> { deviceName } </div>
                  <div style={{ height: 4, width: 92, backgroundColor: 'rgba(0,0,0,.08)', position: 'relative', margin: '8px 0px' }} >
                    <div
                      style={{
                        position: 'absolute',
                        height: 4,
                        width: 92 * percent,
                        backgroundColor: this.state.primaryColor,
                        borderRadius: 2
                      }}
                    />
                  </div>
                  <div style={{ opacity: 0.54, color: 'rgba(0,0,0,.54)', fontSize: 12, fontWeight: 500 }}> { usage } </div>
                </div>
                <div style={{ position: 'absolute', right: 12, top: 24, opacity: 0.38, height: 18, width: 18 }} >
                  <ArrowDownIcon />
                </div>
              </div>
              <Popover
                open={this.state.openDevice}
                anchorEl={this.state.deviceAnchorEl}
                anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
                targetOrigin={{ horizontal: 'left', vertical: 'top' }}
                onRequestClose={() => this.setState({ openDevice: false })}
                style={{
                  boxShadow: '0px 5px 6.6px 0.4px rgba(96,125,139,.24), 0px 2px 9.8px 0.2px rgba(96,125,139,.16)',
                  marginTop: -16,
                  marginLeft: 88
                }}
              >
                <Menu style={{ maxWidth: 260 }}>
                  <RenderDevice {...this.props} onChangeDevice={this.onChangeDevice} />
                </Menu>
              </Popover>
            </div>
          ) : (
            /** search mode */
            <div
              style={{
                position: 'relative',
                height: 'calc(100% - 106px)'
              }}
            >
              <div style={{ width: 192, marginLeft: 16, position: 'relative' }}>
                <div style={{ marginTop: 16, height: 40 }}>
                  <input
                    autoFocus
                    ref={ref => (this.textRef = ref)}
                    name="search"
                    style={{
                      height: 40,
                      width: 128,
                      borderRadius: 20,
                      backgroundColor: 'rgb(248,249,250)',
                      marginTop: 0,
                      padding: '0 32px',
                      fontSize: 14
                    }}
                    type="text"
                    value={this.state.searchText}
                    onChange={e => this.handleSearch(e.target.value)}
                    onKeyDown={this.onKeyDown}
                  />
                </div>
                <div
                  style={{ position: 'absolute', top: 12, right: 16, cursor: 'pointer', display: this.state.searchText ? '' : 'none' }}
                  onClick={this.clearSearchText}
                >
                  <CloseIcon style={{ width: 18, height: 18 }} />
                </div>
              </div>
              <div
                style={{
                  marginLeft: 32,
                  height: 40,
                  fontSize: 12,
                  color: 'rgba(0,0,0,.54)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                { i18n.__('File Types') }
              </div>
              { this.renderTypes() }
            </div>
          )
        }
      </div>
    )
  }

  render () {
    if (!this.state.nav) return null
    let view = null
    switch (this.views[this.state.nav].navGroup()) {
      case 'file':
        view = this.renderFileGroup()
        break
      case 'transmission':
        view = this.renderTrans()
        break
      case 'settings':
        view = this.renderSettings()
        break
      default:
        break
    }
    const shrinked = ['pin', 'searchMode'].every(v => !this.state[v])
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }} >
        {/* Navs */}
        { this.renderNavs() }
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: shrinked ? 88 : 224,
            backgroundColor: '#000000',
            opacity: !shrinked ? 0 : 0.02,
            zIndex: 103,
            pointerEvents: 'none'
          }}
        />

        {
          this.state.searchMode && !this.state.searchText && !this.state.types.length && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: '100%',
                backgroundColor: 'transparent',
                zIndex: 100
              }}
            />
          )
        }
        {/* Views */}
        <div
          style={{
            height: '100%',
            width: `calc(100% - ${this.state.pin || this.state.searchMode ? 224 : 88}px)`,
            marginLeft: this.state.pin || this.state.searchMode ? 224 : 88,
            transition: 'margin 225ms'
          }}
          id="content-container"
        >
          <div style={{ height: 34, backgroundColor: '#FFF', WebkitAppRegion: 'drag' }} />
          <div style={{ height: 'calc(100% - 38px)', width: '100%', position: 'relative' }} >
            { view }
          </div>
        </div>
        {/** change device dialog */}
        <DialogOverlay open={!!this.state.changeDevice} onRequestClose={() => this.setState({ changeDevice: false })} modal transparent >
          {
            this.state.changeDevice &&
            <ChangeDevice
              {...this.props}
              back={() => this.setState({ changeDevice: false })}
            />
          }
        </DialogOverlay>
        <WindowAction />
      </div>
    )
  }
}

/**
  this wrapper is necessary because apis update should be routed to each individual view
  if both apis and views are put into the same component, it is hard to inform view model
  to process states like componentWillReceiveProps does. React props is essentially an
  event routing.
  */

class Navigation extends React.Component {
  constructor (props) {
    super(props)

    /* init apis */
    const { isCloud, selectedDevice } = props
    const { mdev, token } = selectedDevice
    if (!token.isFulfilled()) throw new Error('token not fulfilled')

    const { uuid, cookie } = token.ctx // userUUID, cookie for cloud
    const { address, deviceSN } = mdev
    this.fruitmix = new Fruitmix(address, uuid, token.data.token, isCloud, deviceSN, cookie)
    this.fruitmix.on('updated', (prev, next) => this.setState({ apis: next }))

    this.state = { apis: null }
  }

  componentDidMount () {
    this.fruitmix.start()
  }

  render () {
    return <NavViews apis={this.state.apis} {...this.props} />
  }
}

export default Navigation
