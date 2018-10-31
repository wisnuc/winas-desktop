import i18n from 'i18n'
import React from 'react'
import Promise from 'bluebird'
import { ipcRenderer } from 'electron'
import { FlatButton, DropDownMenu, MenuItem } from 'material-ui'

import Tasks from './Tasks'
import Policy from './Policy'
import FileMenu from './FileMenu'
import TransMenu from './TransMenu'
import TransCount from './TransCount'
import SettingsMenu from './SettingMenu'
import ChangeDevice from './ChangeDevice'

import Home from '../view/Home'
import Photo from '../view/Photo'
import Music from '../view/Music'
import Docs from '../view/Docs'
import Video from '../view/Video'
import Public from '../view/Public'
import USB from '../view/USB'
import Backup from '../view/Backup'

import Downloading from '../view/Downloading'
import Uploading from '../view/Uploading'
import Transfer from '../view/Transfer'
import Finished from '../view/Finished'

import Settings from '../view/Settings'
import CacheClean from '../view/CacheClean'
import Device from '../view/Device'
import DiskInfo from '../view/DiskInfo'
import PT from '../view/PT'
import Sleep from '../view/Sleep'
import ClientUpdate from '../view/ClientUpdate'
import FirmwareUpdate from '../view/FirmwareUpdate'
import LANPassword from '../view/LANPassword'
import Power from '../view/Power'
import Samba from '../view/Samba'
import DLNA from '../view/DLNA'
import ResetDevice from '../view/ResetDevice'
import UpdateFirmDialog from '../settings/UpdateFirmDialog'
import Search from '../common/Search'

import Fruitmix from '../common/fruitmix'
import WindowAction from '../common/WindowAction'
import DialogOverlay from '../common/PureDialog'
import { LIButton, TextField, Checkbox } from '../common/Buttons'
import { TopLogo, FileManage, DeviceChangeIcon, FuncIcon, BackIcon, HelpIcon, WisnucLogo, MenuIcon, SearchIcon, FolderIcon, TransIcon, ShareIcon, BackupIcon, DeviceIcon, ArrowDownIcon, AccountIcon, CloseIcon, PDFIcon, WORDIcon, EXCELIcon, PPTIcon, PhotoIcon, VideoIcon, AudioIcon, ExitIcon } from '../common/Svg'

const HEADER_HEIGHT = 110

class NavViews extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      nav: null,
      types: [],
      snackBar: ''
    }

    this.views = {}

    this.install([
      { name: 'home', View: Home },
      { name: 'music', View: Music },
      { name: 'docs', View: Docs },
      { name: 'video', View: Video },
      { name: 'public', View: Public },
      { name: 'usb', View: USB },
      { name: 'photo', View: Photo },
      { name: 'backup', View: Backup },

      { name: 'downloading', View: Downloading },
      { name: 'uploading', View: Uploading },
      { name: 'transfer', View: Transfer },
      { name: 'finished', View: Finished },

      { name: 'settings', View: Settings },
      { name: 'device', View: Device },
      { name: 'diskInfo', View: DiskInfo },
      { name: 'sleep', View: Sleep },
      { name: 'cacheClean', View: CacheClean },
      { name: 'samba', View: Samba },
      { name: 'dlna', View: DLNA },
      { name: 'clientUpdate', View: ClientUpdate },
      { name: 'firmwareUpdate', View: FirmwareUpdate },
      { name: 'lanPassword', View: LANPassword },
      { name: 'pt', View: PT },
      { name: 'power', View: Power },
      { name: 'resetDevice', View: ResetDevice }
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
      if (drive.tag === 'home') this.navTo('home', { driveUUID, dirUUID })
      else if (drive.type === 'public') this.navTo('public', { driveUUID, dirUUID })
    }

    this.navGroup = (group) => {
      if (this.state.changeDevice) this.setState({ changeDevice: false })
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
      this.timer = setInterval(() => process.env.NODE_ENV !== 'dev' && (this.views[this.state.nav].navGroup() === 'file') &&
        this.props.apis.request('phyDrives'), 3000)
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

    this.showBoundList = () => {
      this.setState({ changeDevice: true })
    }

    this.jumpTo = (nav) => {
      if (nav === 'changeDevice') this.showBoundList()
      else if (nav === 'settings') this.navGroup('settings')
      else if (nav === 'home') this.navGroup('file')
    }

    this.openTasks = () => {
      this.setState({ showTask: true })
    }

    this.openMovePolicy = (data) => {
      this.setState({ conflicts: data })
    }

    this.openHelp = () => {
      this.setState({ onHelp: true })
    }

    this.handleCheck = (type) => {
      const t = this.state.types
      const index = t.indexOf(type)
      if (t === '*') this.setState({ types: [type] })
      else if (index === -1) this.setState({ types: [...t, type] })
      else this.setState({ types: [...t.slice(0, index), ...t.slice(index + 1)] })
    }

    this.onHover = () => {
      this.setState({ hoverNav: true })
    }

    this.offHover = () => {
      this.setState({ hoverNav: false })
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
      this.checkFirmWareAsync().catch(e => console.error('checkFirmWareAsync error', e))
    }
    this.views[this.state.nav].willReceiveProps(this.props)
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.apis && nextProps.apis.phyDrives && Array.isArray(nextProps.apis.phyDrives.data)) {
      this.hasUSB = nextProps.apis.phyDrives.data.filter(d => d.isUSB).length > 0
    }

    if (this.state.nav && nextProps.forceUpdate && (this.state.nav === 'public')) { // in Public Root should refresh users
      this.props.clearForceUpdate()
      this.views[this.state.nav].navEnter()
    }
  }

  componentWillUnmount () {
    clearInterval(this.timer)
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

  renderChangeDevice () {
    return (
      <ChangeDevice {...this.props} />
    )
  }

  renderHeader () {
    const navs = [
      {
        selected: !this.state.changeDevice && this.views[this.state.nav].navGroup() === 'file',
        Icon: FileManage,
        text: i18n.__('Files Menu Name'),
        fn: () => this.navGroup('file')
      },
      {
        selected: !this.state.changeDevice && this.views[this.state.nav].navGroup() === 'transmission',
        Icon: TransIcon,
        text: i18n.__('Transmission Menu Name'),
        fn: () => this.navGroup('transmission')
      },
      {
        selected: !!this.state.changeDevice,
        Icon: DeviceChangeIcon,
        text: i18n.__('Change Device'),
        fn: () => this.showBoundList()
      },
      {
        selected: !this.state.changeDevice && this.views[this.state.nav].navGroup() === 'settings',
        Icon: FuncIcon,
        text: i18n.__('Settings Menu Name'),
        fn: () => this.navGroup('settings')
      }
    ]
    return (
      <div
        style={{
          WebkitAppRegion: 'drag',
          display: 'flex',
          alignItems: 'center',
          height: HEADER_HEIGHT,
          width: '100%',
          position: 'relative',
          backgroundColor: '#f3f8ff',
          background: 'linear-gradient(to right, #4a95f2, #6363ff)'
        }}
      >
        <div style={{ width: 220, height: 110, overflow: 'hidden' }}>
          <TopLogo style={{ height: 160, width: 427, margin: '-25px 0 0 -105px' }} />
        </div>
        {
          navs.map(({ Icon, text, fn, selected }) => (
            <div
              key={text}
              style={{
                width: 130,
                height: 110,
                color: '#FFF',
                cursor: 'pointer',
                letterSpacing: '1.4px',
                backgroundColor: selected ? 'rgba(83, 104, 183, 0.17)' : ''
              }}
              onClick={fn}
            >
              <div
                style={{
                  marginTop: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  WebkitAppRegion: 'no-drag'
                }}
              >
                <Icon style={{ width: 40, height: 40, color: '#FFF', opacity: selected ? 1 : 0.7 }} />
                <div style={{ height: 8 }} />
                <div style={{ transform: 'scale(1,.9)', opacity: selected ? 1 : 0.7 }}>
                  { text }
                </div>
              </div>
            </div>
          ))
        }
        {/* Trans Count */}
        <div style={{ position: 'absolute', top: 20, left: 420, width: 30, height: 30 }} > <TransCount /> </div>
      </div>
    )
  }

  renderView () {
    return this.views[this.state.nav].render({
      navTo: this.navTo,
      navToDrive: this.navToDrive,
      openSnackBar: this.props.openSnackBar,
      pin: this.state.pin,
      primaryColor: this.state.primaryColor
    })
  }

  renderHelp () {
    const isAdmin = this.props.apis.account && this.props.apis.account.data && this.props.apis.account.data.isFirstUser
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: this.state.onHelp ? 0 : '100%',
          width: '100%',
          height: '100%',
          zIndex: 100,
          transition: 'left 175ms'
        }}
        onMouseDown={() => this.setState({ onHelp: false })}
      >
        <div
          style={{
            position: 'absolute',
            zIndex: 100,
            top: 46,
            right: 0,
            width: 320,
            height: 'calc(100% - 46px)',
            backgroundColor: '#FFF',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          {
            this.state.onHelp && this.views[this.state.nav].renderHelp({
              nav: this.state.nav, isAdmin, onClose: () => this.setState({ onHelp: false })
            })
          }
        </div>
      </div>
    )
  }

  renderFileGroup () {
    const toolBarStyle = { height: 40, marginLeft: 48, width: 'calc(100% -36px)', display: 'flex', alignItems: 'center', borderBottom: '1px solid #e8eaed' }
    const titleStyle = { height: 52, display: 'flex', alignItems: 'center' }

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          width: '100%',
          position: 'relative',
          backgroundColor: '#f8f8f8'
        }}
      >
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
          {/* Toolbar */}
          <div style={{ height: 4 }} />
          { this.views[this.state.nav].renderToolBar({ style: toolBarStyle, openHelp: this.openHelp }) }
          <div style={{ height: 4 }} />

          {/* Title and BreadCrumbItem */}
          { this.views[this.state.nav].renderTitle({ style: titleStyle }) }

          {/* File Content */}
          <div style={{ height: 'calc(100% - 120px)', width: '100%' }} id="content-container">
            { this.renderView() }
          </div>
        </div>

        {/* help frame */}
        { this.renderHelp() }

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
      <div style={{ height: '100%', width: '100%', position: 'relative' }}>
        <div style={{ height: 50, width: '100%', display: 'flex', alignItems: 'center' }}>
          <TransMenu
            views={this.views}
            nav={this.state.nav}
            navTo={this.navTo}
            openHelp={this.openHelp}
          />
        </div>

        <div style={{ height: 'calc(100% - 50px)', width: '100%' }} id="content-container">
          { this.renderView() }
        </div>

        {/* help frame */}
        { this.renderHelp() }
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
          <div style={{ marginRight: 20 }}>
            <LIButton onClick={this.openHelp} tooltip={i18n.__('Help')}> <HelpIcon /> </LIButton>
          </div>
        </div>
        <div style={{ height: 'calc(100% - 50px)', width: '100%' }}>
          { this.renderView() }
        </div>
        { this.renderHelp() }
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
      <div style={{ width: 192, marginLeft: 16 }}>
        {
          array.map(({ Icon, name, type, color }) => (
            <div style={{ height: 40, width: '100%', display: 'flex', alignItems: 'center' }} key={name}>
              <Icon style={{ color, marginLeft: 16 }} />
              <div style={{ fontWeight: 500, marginLeft: 32, opacity: 0.87 }}>
                { name }
              </div>
              <div style={{ flexGrow: 1 }} />
              <div style={{ width: 24 }}>
                <Checkbox
                  alt
                  primaryColor={this.state.primaryColor}
                  checked={this.state.types === '*' || this.state.types.includes(type)}
                  onCheck={() => this.handleCheck(type)}
                />
              </div>
            </div>
          ))
        }
      </div>
    )
  }

  renderNavs () {
    const shrinked = !(this.state.pin || this.state.hoverNav || this.state.searchMode)
    const transition = 'width 225ms'
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
          transition
        }}
        onMouseMove={() => this.setState({ hoverNav: true })}
        onMouseLeave={() => this.setState({ hoverNav: false })}
        onMouseEnter={() => this.setState({ hoverNav: true })}
      >
        <div style={{ height: 34, width: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ height: 34, width: 34, margin: 4 }} className="flexCenter">
            <MenuIcon style={{ height: 18, width: 18, cursor: 'pointer' }} onClick={() => this.setState({ pin: !this.state.pin })} />
          </div>
          <div style={{ height: 34, width: this.state.pin ? 180 : 0, WebkitAppRegion: 'drag', transition }} />
        </div>
        <div style={{ height: 72, width: 224, display: 'flex', alignItems: 'center' }}>
          <div style={{ height: 72, width: 88 }} className="flexCenter">
            <WisnucLogo style={{ width: 48, height: 48, color: this.state.primaryColor }} />
          </div>
          <div
            style={{
              height: 72,
              fontSize: 24,
              fontWeight: 500,
              color: 'rgba(0,0,0,0.87)',
              alignItems: 'center',
              opacity: 0.87,
              display: 'flex'
            }}
          >
            WISNUC
          </div>
        </div>
        {
          !this.state.searchMode ? (
            <div
              style={{
                height: 'calc(100% - 106px)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div
                style={{ height: 72, width: '100%', padding: 16, boxSizing: 'border-box' }}
                onClick={() => this.setState({ searchMode: true })}
              >
                <Search
                  fire={name => this.views[this.state.nav].search(name)}
                  hint={i18n.__('Search')}
                  clear={() => this.views[this.state.nav].clearSearch()}
                  shrinked={shrinked}
                />
              </div>
              <div style={{ width: 224 }}>
                <FileMenu
                  views={this.views}
                  nav={this.state.nav}
                  navTo={this.navTo}
                  hasUSB={!!this.hasUSB}
                  device={this.props.selectedDevice.mdev}
                  primaryColor={this.state.primaryColor}
                />
              </div>
              {
                ['home', 'public'].includes(this.state.nav) &&
                  this.views[this.state.nav].renderCreateNewButton({
                    shrinked, primaryColor: this.state.primaryColor, onHover: this.onHover, offHover: this.offHover
                  })
              }
              <div style={{ flexGrow: 1 }} />
              <div style={{ height: 72, width: 224, display: 'flex', alignItems: 'center', position: 'relative' }}>
                <div style={{ height: 72, width: 88 }} className="flexCenter">
                  <DeviceIcon style={{ width: 24, height: 24 }} />
                </div>
                <div style={{ height: 72, marginTop: 16 }}>
                  <div style={{ opacity: 0.87, fontWeight: 500 }}> winsun office </div>
                  <div style={{ height: 4, width: 92, backgroundColor: 'rgba(0,0,0,.08)', position: 'relative', margin: '8px 0px' }} >
                    <div
                      style={{
                        position: 'absolute',
                        height: 4,
                        width: 31,
                        backgroundColor: this.state.primaryColor,
                        borderRadius: 2
                      }}
                    />
                  </div>
                  <div style={{ opacity: 0.54, color: 'rgba(0,0,0,.54)', fontSize: 12, fontWeight: 500 }}> 125.45GB / 4TB </div>
                </div>
                <div style={{ position: 'absolute', right: 12, top: 24, opacity: 0.38, height: 18, width: 18 }}>
                  <ArrowDownIcon />
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                position: 'relative',
                height: 'calc(100% - 106px)'
              }}
            >
              <div style={{ width: 192, marginLeft: 16, position: 'relative' }}>
                <div style={{ marginTop: -16, height: 72 }}>
                  <TextField
                    type="text"
                    hintText={i18n.__('Search')}
                    value={this.state.searchText}
                    onChange={e => this.setState({ searchText: e.target.value })}
                    onKeyDown={this.onKeyDown}
                  />
                </div>
                <div
                  style={{ position: 'absolute', top: 40, right: 0, cursor: 'pointer' }}
                  onClick={() => this.setState({ searchText: '' })}
                >
                  <CloseIcon />
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
                { i18n.__('Specific Type') }
              </div>
              { this.renderTypes() }
              <div style={{ height: 8 }} />
              <div style={{ width: 192, height: 1, backgroundColor: 'rgba(0,0,0,.08)', marginLeft: 16 }} />
              <div
                style={{
                  marginTop: 12,
                  marginLeft: 32,
                  height: 40,
                  fontSize: 12,
                  color: 'rgba(0,0,0,.54)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                { i18n.__('Search Range') }
              </div>
              <DropDownMenu
                value={this.state.scopeValue || 1}
                onChange={(event, index, value) => this.setState({ scopeValue: value })}
                style={{ width: 192, marginLeft: 16 }}
                autoWidth={false}
              >
                <MenuItem value={1} primaryText={i18n.__('Global')} />
                <MenuItem value={2} primaryText={i18n.__('Current Folder')} />
              </DropDownMenu>
              <div
                style={{
                  height: 40,
                  bottom: 12,
                  left: 32,
                  width: 192,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onClick={() => this.setState({ searchMode: false })}
              >
                <div style={{ transform: 'rotate(180deg)', marginTop: -4 }}> <ExitIcon /> </div>
                <div style={{ opacity: 0.87, marginLeft: 32, cursor: 'pointer' }}>
                  { i18n.__('Exit Search Mode') }
                </div>
              </div>
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
    if (this.state.changeDevice) view = this.renderChangeDevice()
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }} >
        {/* Navs */}
        { this.renderNavs() }

        {/* Views */}
        <div
          style={{
            height: '100%',
            width: `calc(100% - ${this.state.pin || this.state.searchMode ? 224 : 88}px)`,
            marginLeft: this.state.pin || this.state.searchMode ? 224 : 88
          }}
        >
          <div
            style={{
              height: 72,
              padding: '34px 0 0 32px',
              width: 'calc(100% - 32px)',
              backgroundColor: '#f8f8f8',
              display: 'flex',
              alignItems: 'center',
              WebkitAppRegion: this.state.hoverNav && !this.state.pin ? 'no-drag' : 'drag'
            }}
          >
            <div style={{ fontSize: 21, fontWeight: 50, marginLeft: 24 }}> { this.views[this.state.nav].menuName() } </div>
            <div style={{ flexGrow: 1 }} />
            <AccountIcon style={{ width: 32, height: 32, marginRight: 24 }} />
          </div>
          <div style={{ height: 'calc(100% - 110px)', width: '100%', position: 'relative' }}>
            { view }
          </div>
        </div>
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

    const userUUID = token.ctx.uuid
    const { address, deviceSN } = mdev
    this.fruitmix = new Fruitmix(address, userUUID, token.data.token, isCloud, deviceSN)
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
