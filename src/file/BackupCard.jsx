import i18n from 'i18n'
import React from 'react'
import { ipcRenderer } from 'electron'
import { Menu, MenuItem, Toggle, Popover, Dialog, CircularProgress, RaisedButton, LinearProgress } from 'material-ui'

import prettySize from '../common/prettySize'
import { ipcReq } from '../common/ipcReq'
import FlatButton from '../common/FlatButton'
import { LIButton } from '../common/Buttons'
import SimpleScrollBar from '../common/SimpleScrollBar'
import { AllFileIcon, PCIcon, MobileIcon, SettingsIcon, AddCircleIcon, ChevronRightIcon, BackwardIcon } from '../common/Svg'

class BackupCard extends React.PureComponent {
  constructor (props) {
    super(props)
    this.hasDrive = !!this.props.drive && this.props.drive.uuid !== 'fake-uuid'

    this.state = {
      topDirs: [],
      status: 'Idle',
      loading: this.hasDrive,
      speed: -1
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
      const { uuid } = this.state.drive || this.props.drive
      this.setState({ deleteLoading: true })
      this.props.apis.pureRequest(
        'delBackupFileOrDir',
        { name: dir.uuid, driveUUID: uuid, dirUUID: uuid },
        (err, res) => {
          console.log('delBackupFileOrDir', err, res)
          this.setState({ confirmDelDir: false, dirDetail: null, deleteLoading: false })
          this.refresh({ updateDirs: true })
        }
      )
    }

    this.refresh = (op) => {
      const driveUUID = this.props.drive.uuid
      if (!op || !op.noloading) this.setState({ loading: true })
      this.props.apis.pureRequest('listNavDir', { driveUUID, dirUUID: driveUUID }, (err, res) => {
        if (err || !Array.isArray(res && res.entries)) console.error('refresh error', err, res)
        else {
          const topDirs = res.entries.filter(e => !e.deleted)
          topDirs.sort((a, b) => a.bname.localeCompare(b.bname))
          if (op && op.updateDirs) ipcRenderer.send('BACKUP_DIR', { dirs: topDirs, drive: this.props.drive })
          this.setState({ topDirs, loading: false })
        }
      })
    }

    this.updateDrive = (error, drive) => {
      console.log('this.updateDrive', error, drive)
      const { openSnackBar } = this.props
      if (error) openSnackBar(i18n.__('Operation Failed'))
      else {
        Object.assign(this.props.drive, drive)
        this.setState({ drive })
      }
      this.setState({ toggleEnableLoading: false })
    }

    this.onToggleEnableBackup = () => {
      if (this.state.toggleEnableLoading) return
      this.setState(Object.assign(this.state, { toggleEnableLoading: true }))
      const drive = this.state.drive || this.props.drive
      if (drive.uuid !== 'fake-uuid') {
        ipcReq('updateBackupDrive', { drive, attr: { disabled: !drive.client.disabled } }, this.updateDrive)
      } else {
        ipcReq('createBackupDrive', null, this.updateDrive)
      }
    }

    this.onToggleDir = (dirDetail) => {
      if (this.state.toggleDirLoading) return
      this.setState(Object.assign(this.state, { toggleDirLoading: true }))
      const drive = this.state.drive || this.props.drive
      const attr = {
        archived: false,
        op: 'updateAttr',
        metadata: {
          status: 'Working',
          disabled: !dirDetail.disabled,
          localPath: dirDetail.localPath
        }
      }
      const [driveUUID, dirUUID] = [drive.uuid, drive.uuid]
      this.props.apis.pureRequest('updateTopDir', { attr, name: dirDetail.uuid, driveUUID, dirUUID }, (err, res) => {
        const { openSnackBar } = this.props
        if (err || !res) {
          console.error('updateTopDir Failed', err || res)
          openSnackBar(i18n.__('Operation Failed'))
          this.setState({ toggleDirLoading: false })
        } else {
          const v = res[0]
          const newDetail = {
            name: dirDetail.name,
            uuid: v.name,
            disabled: v.metadata.disabled,
            localPath: v.metadata.localPath
          }
          this.setState({ toggleDirLoading: false, dirDetail: newDetail })
          this.refresh({ updateDirs: true })
        }
      })
    }

    this.onMsg = (event, data) => {
      const { speed, status, size, completeSize, count, finishCount, restTime, drive, bProgress } = data
      this.setState({ speed, status, size, completeSize, count, finishCount, restTime, bProgress })
      if (drive && drive.client) {
        this.setState({ drive })
      }
    }

    ipcRenderer.on('updateBackupRoot', () => {
      if (!this.props.index) this.refresh({ noloading: true })
    })
  }

  componentDidMount () {
    if (!this.props.index) {
      ipcRenderer.on('BACKUP_MSG', this.onMsg)
      if (this.hasDrive) this.refresh()
    }
  }

  componentWillUnmount () {
    ipcRenderer.removeAllListeners('BACKUP_MSG')
    ipcRenderer.removeAllListeners('updateBackupRoot')
  }

  calcTime (time) {
    if (!time) return ''
    const date = new Date(time)
    return `${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', { hour12: false })}`
  }

  renderLoading () {
    return (
      <div style={{ height: 320, width: '100%' }} className="flexCenter">
        <CircularProgress size={24} thickness={2} />
      </div>
    )
  }

  renderActionLoading (top) {
    return (
      <div style={{ position: 'absolute', width: '100%', left: 0, top }}>
        <LinearProgress mode="indeterminate" />
      </div>
    )
  }

  renderSettings (showDirs, transition) {
    const { topDirs } = this.state
    const drive = this.state.drive || this.props.drive
    const enabled = drive && drive.uuid !== 'fake-uuid' && !drive.client.disabled
    const color = enabled ? 'rgba(0,0,0,.76)' : 'rgba(0,0,0,.38)'
    return (
      <div style={{ position: 'absolute', height: '100%', width: '100%', left: showDirs ? '-100%' : 0, top: 0, transition }}>
        <div style={{ height: 56, display: 'flex', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
          <div style={{ marginLeft: 24 }}> { i18n.__('Current Device Backup') } </div>
          <div style={{ flexGrow: 1 }} />
          <Toggle
            disabled={this.state.toggleEnableLoading}
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

        <MenuItem
          primaryText="."
          disabled={!enabled} style={{ color: '#FFF' }}
          onClick={() => this.setState({ showDirs: true })}
        />
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

        {/* <MenuItem disabled={!enabled} primaryText="." style={{ color: '#FFF' }} onClick={this.openPolicy} /> */}
        <div
          style={{
            width: 'calc(100% - 40px)',
            marginLeft: 24,
            height: 48,
            color,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none'
          }}
        >
          { i18n.__('Backup Policy') }
          <div style={{ flexGrow: 1 }} />
          <div style={{ color: 'rgba(0,0,0,.38)' }}>
            { i18n.__('Starting Once Dir Changed') }
          </div>
          {/*
          <div>
            <ChevronRightIcon style={{ color: 'rgba(0,0,0,.38)', height: 16, width: 16 }} />
          </div>
          */}
        </div>
      </div>
    )
  }

  renderBackupDirs (showDirs, transition) {
    if (!this.state.topDirs) return <div />
    return (
      <div
        style={{ position: 'absolute', height: '100%', width: '100%', left: showDirs ? 0 : '100%', top: 0, transition }}
      >
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
        <SimpleScrollBar height={144} width={306} >
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

  renderCurrentBackup (drive) {
    const { label, client } = drive
    const { lastBackupTime } = client
    const disabled = drive.uuid === 'fake-uuid' || client.disabled
    const { showDirs } = this.state
    const transition = 'left 450ms'
    const hostname = label || window.config.hostname
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
          {/* host name */}
          <div style={{ color: '#FFF' }}>
            <div style={{ fontSize: 16, fontWeight: 500, maxWidth: 116 }} className="text">
              { hostname }
            </div>
            <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', height: 16 }}>
              { this.state.status === 'Idle' ? i18n.__('Current Device')
                : this.state.status === 'Working' ? i18n.__('Backuping') : '' }
            </div>
          </div>
          <div style={{ flexGrow: 1 }} />
          <div
            style={{ marginRight: -12 }}
            onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault() }}
          >
            <LIButton onClick={e => this.openSettings(e, drive)} iconStyle={{ color: '#FFF', height: 20, width: 20 }}>
              <SettingsIcon />
            </LIButton>
          </div>

          {/* backup settings */}
          <Popover
            open={this.state.openBS}
            anchorEl={this.state.anchorSetting}
            anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
            targetOrigin={{ horizontal: 'left', vertical: 'top' }}
            onRequestClose={() => this.setState({ openBS: false, showDirs: false })}
          >
            <Menu style={{ maxWidth: 306, fontSize: 14, marginTop: -8 }} >
              <div
                style={{ position: 'relative', minHeight: 210, width: 306, backgroundColor: '#FFF', overflow: 'hidden' }}
              >
                { this.state.loading ? this.renderLoading() : this.renderSettings(showDirs, transition) }
                { this.renderBackupDirs(showDirs, transition) }
                { !!this.state.toggleEnableLoading && this.renderActionLoading(0) }
              </div>
            </Menu>
          </Popover>

          {/* backup detail */}
          <Popover
            open={!!this.state.dirDetail}
            anchorEl={this.state.anchorDir}
            anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
            targetOrigin={{ horizontal: 'left', vertical: 'top' }}
            onRequestClose={() => this.setState({ dirDetail: null })}
          >
            {
              !!this.state.dirDetail &&
                <Menu style={{ maxWidth: 280, fontSize: 14, marginTop: -8, width: 280, position: 'relative' }} >
                  <div style={{ height: 56, display: 'flex', alignItems: 'center', borderBottom: '1px solid #e8eaed' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginLeft: 24 }}>
                      <AllFileIcon style={{ width: 24, height: 24, color: '#ffa93e', marginRight: 16 }} />
                      <div style={{ width: 146 }} className="text">
                        { this.state.dirDetail.name }
                      </div>
                    </div>
                    <div style={{ flexGrow: 1 }} />
                    <Toggle
                      disabled={this.state.toggleDirLoading}
                      onToggle={() => this.onToggleDir(this.state.dirDetail)}
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
                  { this.state.toggleDirLoading && this.renderActionLoading(8) }
                </Menu>
            }
            <Dialog
              modal
              style={{ zIndex: 4000 }}
              contentStyle={{ width: 326 }}
              open={!!this.state.confirmDelDir}
              onRequestClose={() => this.setState({ confirmDelDir: null, deleteLoading: false })}
              actions={[
                <FlatButton
                  primary
                  label={i18n.__('Cancel')}
                  onClick={() => this.setState({ confirmDelDir: null })}
                  disabled={this.state.deleteLoading}
                />,
                <FlatButton
                  primary
                  label={this.state.deleteLoading ? i18n.__('Deleting') : i18n.__('Confirm')}
                  onClick={() => this.delDir(this.state.confirmDelDir)}
                  disabled={this.state.deleteLoading}
                />
              ]}
            >
              {
                !!this.state.confirmDelDir && (
                  <div>
                    <div
                      className="title"
                      style={{ height: 48, display: 'flex', alignItems: 'center', color: '#f44336' }}
                    >
                      {
                        i18n.__(
                          'Confirm Delete Backup Dir Title %s',
                          this.state.confirmDelDir && this.state.confirmDelDir.name
                        )
                      }
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

          {/* policy */}
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
          ) : this.state.status === 'Failed' ? (
            <div style={{ fontSize: 12, fontWeight: 500, color: '#FFF' }} key="Failed">
              <div style={{ marginTop: 16, height: 16, display: 'flex', alignItems: 'center' }}>
                { !disabled && i18n.__('Current Backup Not Finished') }
              </div>
              <div style={{ width: '100%', marginTop: 56 }} className="flexCenter">
                { disabled && i18n.__('Backup Disabled Text') }
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, fontWeight: 500, color: '#FFF' }} key="Working">
              {/* backup speed */}
              <div style={{ fontSize: 18, height: 21, marginTop: 16, display: 'flex', alignItems: 'center' }}>
                { this.state.speed >= 0 ? `${prettySize(this.state.speed)} / s` : '0 Bytes / s'}
              </div>

              {/* backup progress */}
              <div style={{ height: 24, display: 'flex', alignItems: 'center' }}>
                { this.state.bProgress }
              </div>

              {/* rest time */}
              <div style={{ height: 24, display: 'flex', alignItems: 'center' }} >
                { this.state.restTime }
              </div>
            </div>
          )
        }
        {/* Add Backup Directroy  */}
        {
          !disabled &&
            <div
              style={{
                position: 'absolute',
                height: 40,
                width: '100%',
                left: 0,
                bottom: -2,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer'
              }}
            >
              <RaisedButton
                style={{ width: '100%' }}
                buttonStyle={{ width: '100%', textAlign: 'left' }}
                primary
                label={i18n.__('Add Backup Directroy')}
                labelStyle={{ fontSize: 12, width: '100%' }}
                onClick={e => this.handleClickAdd(e, drive)}
                onDoubleClick={(e) => { e.stopPropagation(); e.preventDefault() }}
                icon={
                  <AddCircleIcon style={{ color: '#FFF', height: 24, width: 24, margin: '0px 8px 0px 16px' }} />
                }
              />
            </div>
        }
        {/* progress bar  */}
        {
          this.state.status === 'Working' && (
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
    const color = this.props.selected ? '#009688' : 'rgba(0,0,0,.54)'
    return (
      <div style={{ height: 108, width: 'calc(100% - 64px)' }} >
        <div
          className="flexCenter"
          style={{ height: 40, width: 40, marginBottom: 16, backgroundColor, borderRadius: 20, overflow: 'hidden' }}
        >
          <Icon style={{ color: '#FFF' }} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: this.props.selected ? '#009688' : undefined }}>
          { label }
        </div>
        <div style={{ fontSize: 12, color, margin: '16px 0 0 0' }}>
          { this.calcTime(lastBackupTime) }
        </div>
        <div style={{ fontSize: 12, color }}>
          { lastBackupTime ? i18n.__('Backup Success') : i18n.__('Backup Not Finished') }
        </div>
      </div>
    )
  }
}

export default BackupCard
