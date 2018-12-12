import i18n from 'i18n'
import React from 'react'
import { ipcRenderer } from 'electron'
import { Menu, MenuItem, Toggle, Popover, Checkbox, Dialog, CircularProgress } from 'material-ui'

import { AllFileIcon, PCIcon, MobileIcon, SettingsIcon, FailedIcon, ChevronRightIcon, BackwardIcon } from '../common/Svg'
import FlatButton from '../common/FlatButton'
import { LIButton } from '../common/Buttons'
import SimpleScrollBar from '../common/SimpleScrollBar'

class BackupCard extends React.PureComponent {
  constructor (props) {
    super(props)
    this.hasDrive = !!this.props.drive && this.props.drive.uuid !== 'fake-uuid'

    this.state = {
      topDirs: [],
      status: 'Idle',
      loading: this.hasDrive
    }

    this.openSettings = (e, drive) => {
      e.stopPropagation()
      e.preventDefault()
      console.log('this.openSettings', drive)
    }

    this.handleClickAdd = (e, drive) => {
      e.stopPropagation()
      e.preventDefault()
      this.props.addBackupDir()
    }

    this.openSettings = (e) => {
      e.stopPropagation()
      e.preventDefault()
      this.setState({ openBS: true, anchorSetting: e.currentTarget })
    }

    this.openDirDetail = (e, dir) => {
      e.stopPropagation()
      e.preventDefault()
      this.setState({ dirDetail: dir, anchorDir: e.currentTarget })
    }

    this.openPolicy = (e) => {
      e.stopPropagation()
      e.preventDefault()
      this.setState({ selectPolicy: true, anchorPolicy: e.currentTarget })
    }

    this.delDir = (dir) => {
      console.log('this.delDir', dir)
      const { uuid } = this.state.drive || this.props.drive
      this.props.apis.pureRequest('delBackupFileOrDir', { name: dir.uuid, driveUUID: uuid, dirUUID: uuid }, (err, res) => {
        console.log('delBackupFileOrDir', err, res)
        this.setState({ confirmDelDir: false, dirDetail: null })
        this.refresh()
      })
    }

    this.refresh = () => {
      console.log('refrsh', this.props)
      const driveUUID = this.props.drive.uuid
      this.props.apis.pureRequest('listNavDir', { driveUUID, dirUUID: driveUUID }, (err, res) => {
        if (err || !Array.isArray(res && res.entries)) console.error('refresh error', err, res)
        else {
          this.setState({ topDirs: res.entries.filter(v => !v.deleted), loading: false })
        }
      })
    }

    this.updateDrive = (error, drive) => {
      const { apis, openSnackBar } = this.props
      if (error) {
        this.setState({ toggleEnableLoading: false })
        openSnackBar(i18n.__('Operation Failed'))
      } else {
        const { client } = drive
        Object.assign(client, { disabled: !client.disabled })
        apis.pureRequest('updateDrive', { driveUUID: drive.uuid, attr: { client, op: 'backup' } }, (e, d) => {
          if (e) openSnackBar(i18n.__('Operation Failed'))
          else this.setState({ drive: d })
          this.setState({ toggleEnableLoading: false })
        })
      }
    }

    this.onToggleEnableBackup = () => {
      if (this.state.toggleEnableLoading) return
      this.setState(Object.assign(this.state, { toggleEnableLoading: true }))
      const drive = this.state.drive || this.props.drive
      const { apis, openSnackBar } = this.props
      if (drive.uuid !== 'fake-uuid') apis.pureRequest('drive', { driveUUID: drive.uuid }, this.updateDrive)
      else {
        const { hostname, machineId, platform } = window.config
        const args = {
          label: hostname,
          machineId: machineId.slice(-8),
          type: platform === 'drawin' ? 'Mac-PC' : platform === 'win32' ? 'Win-PC' : 'Linux-PC'
        }
        apis.pureRequest('createBackupDrive', args, (err, d) => {
          if (err) openSnackBar(i18n.__('Operation Failed'))
          else this.setState({ drive: d })
          this.setState({ toggleEnableLoading: false })
        })
      }
    }

    this.onMsg = (event, data) => {
      console.log('this.onMsg', data)
      const { status, size, completeSize, count, finishCount, restTime } = data
      this.setState({ status, size, completeSize, count, finishCount, restTime })
    }
  }

  componentDidMount () {
    if (!this.props.index) {
      ipcRenderer.on('BACKUP_MSG', this.onMsg)
      if (this.hasDrive) this.refresh()
    }
  }

  componentWillUnmount () {
    ipcRenderer.removeAllListeners('BACKUP_MSG')
  }

  calcTime (time) {
    if (!time) return ''
    const date = new Date(time)
    return `${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', { hour12: false })}`
  }

  renderLoading () {
    return (
      <div style={{ height: '100%', width: '100%' }} className="flexCenter">
        <CircularProgress size={64} thickness={3} />
      </div>
    )
  }

  renderSettings (showDirs, transition) {
    const { topDirs } = this.state
    const drive = this.state.drive || this.props.drive
    const enabled = drive && drive.uuid !== 'fake-uuid' && !drive.client.disabled && !this.state.toggleEnableLoading
    const color = enabled ? 'rgba(0,0,0,.76)' : 'rgba(0,0,0,.38)'
    return (
      <div style={{ position: 'absolute', height: '100%', width: '100%', left: showDirs ? '-100%' : 0, top: 0, transition }}>
        <div style={{ height: 56, display: 'flex', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
          <div style={{ marginLeft: 24 }}> { i18n.__('Current Device Backup') } </div>
          <div style={{ flexGrow: 1 }} />
          <Toggle
            toggled={enabled}
            onToggle={this.onToggleEnableBackup}
            labelStyle={{ maxWidth: 'fit-content' }}
            style={{ marginRight: 16, maxWidth: 'fit-content' }}
          />
        </div>
        <div style={{ height: 8 }} />
        <div
          style={{
            height: 40,
            display: 'flex',
            alignItems: 'center',
            marginLeft: 24,
            color: 'rgba(0,0,0,.54)',
            fontSize: 12
          }}
        >
          { i18n.__('Settings') }
        </div>

        <MenuItem primaryText="." disabled={!enabled} style={{ color: '#FFF' }} onClick={() => this.setState({ showDirs: true })} />
        <div
          style={{
            position: 'absolute',
            width: 'calc(100% - 40px)',
            left: 24,
            top: 120,
            color,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none'
          }}
        >
          { i18n.__('Manage Backup Dir') }
          <div style={{ flexGrow: 1 }} />
          <div style={{ color: 'rgba(0,0,0,.38)', marginRight: 16 }}>
            { i18n.__('%s Items', topDirs.length) }
          </div>
          <ChevronRightIcon style={{ color: 'rgba(0,0,0,.38)', height: 16, width: 16 }} />
        </div>

        <MenuItem disabled={!enabled} primaryText="." style={{ color: '#FFF' }} onClick={this.openPolicy} />
        <div
          style={{
            position: 'absolute',
            width: 'calc(100% - 40px)',
            left: 24,
            top: 168,
            color,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none'
          }}
        >
          { i18n.__('Backup Policy') }
          <div style={{ flexGrow: 1 }} />
          <div style={{ color: 'rgba(0,0,0,.38)', marginRight: 16 }}>
            { i18n.__('Starting Once Dir Changed') }
          </div>
          <div>
            <ChevronRightIcon style={{ color: 'rgba(0,0,0,.38)', height: 16, width: 16 }} />
          </div>
        </div>

        <div style={{ height: 48, display: 'flex', alignItems: 'center', marginBottom: 8, borderBottom: '1px solid #e8eaed' }}>
          <div style={{ marginLeft: 24, color }}> { i18n.__('Running Backup On Startup') } </div>
          <div style={{ flexGrow: 1 }} />
          <Toggle
            defaultToggled
            disabled={!enabled}
            labelStyle={{ maxWidth: 'fit-content' }}
            style={{ marginRight: 16, maxWidth: 'fit-content' }}
          />
        </div>
        <div style={{ height: 8 }} />
        <div
          style={{
            height: 40,
            display: 'flex',
            alignItems: 'center',
            marginLeft: 24,
            color: 'rgba(0,0,0,.54)',
            fontSize: 12
          }}
        >
          { i18n.__('Notification') }
        </div>
        <div style={{ height: 48, display: 'flex', alignItems: 'center' }}>
          <div style={{ marginLeft: 24, color }}> { i18n.__('Enable Remove Backup Warnings') } </div>
          <div style={{ flexGrow: 1 }} />
          <Checkbox
            defaultChecked
            disabled={!enabled}
            style={{ maxWidth: 'fit-content' }}
          />
        </div>
      </div>
    )
  }

  renderBackupDirs (showDirs, transition) {
    if (!this.state.topDirs) return <div />
    return (
      <div style={{ position: 'absolute', height: '100%', width: '100%', left: showDirs ? 0 : '100%', top: 0, transition }}>
        <div style={{ height: 56, display: 'flex', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
          <LIButton
            style={{ marginLeft: 10, zIndex: 10000 }}
            onClick={() => this.setState({ showDirs: false })}
          >
            <BackwardIcon />
          </LIButton>
          <div style={{ marginLeft: 8 }}> { i18n.__('Manage Backup Dir') } </div>
          <div style={{ flexGrow: 1 }} />
          <div style={{ marginRight: 24 }}> { i18n.__('%s Items', this.state.topDirs.length) } </div>
        </div>
        <div style={{ height: 8 }} />
        <SimpleScrollBar height={300} width={306} >
          {
            this.state.topDirs.map(v => (
              <MenuItem
                key={v.uuid}
                onClick={e => this.openDirDetail(e, {
                  name: v.bname,
                  uuid: v.name,
                  disabled: v.metadata.disabled,
                  localPath: v.metadata.localPath
                })}
                style={{ height: 44, fontSize: 14 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                  <AllFileIcon style={{ width: 24, height: 24, color: '#ffa93e', marginRight: 24 }} />
                  <div style={{ width: 140 }} className="text">
                    { v.bname }
                  </div>
                  <div style={{ position: 'absolute', right: 24, top: 2 }}>
                    <ChevronRightIcon style={{ color: 'rgba(0,0,0,.38)', height: 16, width: 16 }} />
                  </div>
                </div>
              </MenuItem>
            ))
          }
        </SimpleScrollBar>
      </div>
    )
  }

  renderRestTime (restTime) {
    if (!(restTime > 0)) return i18n.__('Calculating Rest Time')
    const hour = Math.floor(restTime / 3600)
    const minute = Math.ceil((restTime - hour * 3600) / 60)
    if (!hour) return i18n.__('Rest Time By Minute %s', minute)
    return i18n.__('Rest Time By Hour And Minute %s, %s', hour, minute)
  }

  renderCurrentBackup (drive) {
    const { label, client } = drive
    const { lastBackupTime } = client
    const disabled = drive.uuid === 'fake-uuid' || client.disabled
    const { showDirs } = this.state
    const transition = 'left 450ms'
    return (
      <div
        style={{
          backgroundColor: '#009688',
          height: '100%',
          width: '100%',
          boxSizing: 'border-box',
          padding: 16,
          position: 'relative'
        }}
      >
        <div style={{ height: 32, width: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ color: '#FFF' }}>
            <div style={{ fontSize: 16, fontWeight: 500 }}>
              { label }
            </div>
            <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', height: 16 }}>
              { this.state.status === 'Idle' ? i18n.__('Current Device') : i18n.__('Backuping') }
            </div>
          </div>
          <div style={{ flexGrow: 1 }} />
          <div
            style={{ width: 24, height: 24, cursor: 'pointer' }}
            onClick={this.openSettings}
            onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault() }}
          >
            <SettingsIcon style={{ color: '#FFF' }} onClick={e => this.openSettings(e, drive)} />
          </div>
          <Popover
            open={this.state.openBS}
            anchorEl={this.state.anchorSetting}
            anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            targetOrigin={{ horizontal: 'left', vertical: 'top' }}
            onRequestClose={() => this.setState({ openBS: false, showDirs: false })}
          >
            <Menu style={{ maxWidth: 306, fontSize: 14, marginTop: -8 }} >
              <div style={{ position: 'relative', height: 354, width: 306, backgroundColor: '#FFF', overflow: 'hidden' }}>
                { this.state.loading ? this.renderLoading() : this.renderSettings(showDirs, transition) }
                { this.renderBackupDirs(showDirs, transition) }
              </div>
            </Menu>
          </Popover>
          <Popover
            open={!!this.state.dirDetail}
            anchorEl={this.state.anchorDir}
            anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
            targetOrigin={{ horizontal: 'left', vertical: 'top' }}
            onRequestClose={() => this.setState({ dirDetail: null })}
          >
            {
              !!this.state.dirDetail &&
                <Menu style={{ maxWidth: 280, fontSize: 14, marginTop: -8, width: 280 }} >
                  <div style={{ height: 56, display: 'flex', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: 24 }}>
                      <AllFileIcon style={{ width: 24, height: 24, color: '#ffa93e', marginRight: 16 }} />
                      <div style={{ width: 146 }} className="text">
                        { this.state.dirDetail.name }
                      </div>
                    </div>
                    <div style={{ flexGrow: 1 }} />
                    <Toggle
                      toggled={!this.state.dirDetail.disabled}
                      labelStyle={{ maxWidth: 'fit-content' }}
                      style={{ marginRight: 16, maxWidth: 'fit-content' }}
                    />
                  </div>
                  <div style={{ margin: '8px 24px 32px 24px' }}>
                    <div style={{ height: 32, display: 'flex', alignItems: 'center', color: 'rgba(0,0,0,.54)' }} >
                      { i18n.__('Local Path') }
                    </div>
                    <div style={{ fontSize: 12, wordBreak: 'break-all' }} >
                      { this.state.dirDetail.localPath }
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ flexGrow: 1 }} />
                    <FlatButton
                      primary
                      onClick={() => this.setState({ confirmDelDir: this.state.dirDetail })}
                      label={i18n.__('Remove Dir And Backup Data')}
                    />
                  </div>
                </Menu>
            }
            <Dialog
              modal
              style={{ zIndex: 4000 }}
              contentStyle={{ width: 326 }}
              open={!!this.state.confirmDelDir}
              onRequestClose={() => this.setState({ confirmDelDir: null })}
              actions={[
                <FlatButton primary label={i18n.__('Cancel')} onClick={() => this.setState({ confirmDelDir: null })} />,
                <FlatButton primary label={i18n.__('Confirm')} onClick={() => this.delDir(this.state.confirmDelDir)} />
              ]}
            >
              {
                !!this.state.confirmDelDir && (
                  <div>
                    <div style={{ height: 48, display: 'flex', alignItems: 'center' }} className="title">
                      {i18n.__('Confirm Delete Backup Dir Title %s', this.state.confirmDelDir && this.state.confirmDelDir.name)}
                    </div>
                    <div style={{ height: 24 }} />
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        lineHeight: '30px'
                      }}
                    >
                      {i18n.__('Confirm Delete Backup Dir Text')}
                    </div>
                  </div>
                )
              }
            </Dialog>
          </Popover>
          <Popover
            open={!!this.state.selectPolicy}
            anchorEl={this.state.anchorPolicy}
            anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
            targetOrigin={{ horizontal: 'left', vertical: 'top' }}
            onRequestClose={() => this.setState({ selectPolicy: null })}
          >
            <Menu style={{ maxWidth: 'fix-content' }}>
              <MenuItem primaryText={i18n.__('Starting Once Dir Changed')} />
              <MenuItem primaryText={i18n.__('Starting When Computer Is Free')} />
            </Menu>
          </Popover>
        </div>
        {
          this.state.status === 'Idle' ? (
            <div style={{ fontSize: 12, fontWeight: 500, color: '#FFF' }} key="Idle">
              <div style={{ marginTop: 16, height: 16, display: 'flex', alignItems: 'center' }}>
                { !disabled && !!lastBackupTime && this.calcTime(lastBackupTime) }
              </div>
              <div style={{ height: 16, display: 'flex', alignItems: 'center' }}>
                { !disabled && (lastBackupTime ? i18n.__('Backup Success') : i18n.__('Backup Not Finished')) }
              </div>
              <div style={{ width: '100%', marginTop: 56 }} className="flexCenter">
                { disabled && i18n.__('Backup Disabled Text') }
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, fontWeight: 500, color: '#FFF' }} key="Running">
              <div style={{ marginTop: 16, height: 16, display: 'flex', alignItems: 'center' }} >
                { this.renderRestTime(this.state.restTime) }
              </div>
              <div style={{ height: 16, display: 'flex', alignItems: 'center' }}>
                { !!this.state.finishCount && !!this.state.count && `${this.state.finishCount}/${this.state.count}` }
              </div>
            </div>
          )
        }
        {
          !disabled &&
            <div
              style={{
                height: 40,
                position: 'absolute',
                left: 16,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer'
              }}
              onClick={e => this.handleClickAdd(e, drive)}
              onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault() }}
            >
              <div style={{ transform: 'rotate(45deg)' }}>
                <FailedIcon style={{ color: '#FFF', height: 24, width: 24 }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#FFF', marginLeft: 16 }}>
                { i18n.__('Add Backup Directroy') }
              </div>
            </div>
        }
        {
          this.state.status !== 'Idle' && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(0,0,0,.26)'
              }}
            >
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#ffc107',
                  width: `${Math.round(this.state.finishCount / this.state.count * 100) || 0}%`
                }}
              />
            </div>
          )
        }
      </div>
    )
  }

  render () {
    const { index } = this.props
    const drive = this.state.drive || this.props.drive
    if (!index) return this.renderCurrentBackup(drive)
    const { client, label } = drive
    const { type, lastBackupTime } = client
    let backgroundColor = '#039be5'
    let Icon = PCIcon
    switch (type) {
      case 'Win-PC':
        backgroundColor = '#039be5'
        Icon = PCIcon
        break
      case 'Mac-PC':
        backgroundColor = '#000000'
        Icon = PCIcon
        break
      case 'Android-Mobile':
        backgroundColor = '#43a047'
        Icon = MobileIcon
        break
      case 'iOS-Mobile':
        backgroundColor = '#000000'
        Icon = MobileIcon
        break
      case 'Linux-PC':
        backgroundColor = '#039be5'
        Icon = PCIcon
        break
      default:
        break
    }
    return (
      <div style={{ height: 108, width: 'calc(100% - 64px)' }} >
        <div
          className="flexCenter"
          style={{ height: 40, width: 40, marginBottom: 16, backgroundColor, borderRadius: 20, overflow: 'hidden' }}
        >
          <Icon style={{ color: '#FFF' }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>
          { label }
        </div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(0,0,0,.54)', margin: '16px 0 0 0' }}>
          { this.calcTime(lastBackupTime) }
        </div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(0,0,0,.54)' }}>
          { lastBackupTime ? i18n.__('Backup Success') : i18n.__('Backup Not Finished') }
        </div>
      </div>
    )
  }
}

export default BackupCard
