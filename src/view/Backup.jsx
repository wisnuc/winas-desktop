import i18n from 'i18n'
import React from 'react'
import { remote, ipcRenderer } from 'electron'
import Base from './Base'
import BDrives from '../backup/BDrives'
import { LIButton } from '../common/Buttons'
import { BackupIcon, SettingsIcon, InfoIcon } from '../common/Svg'

class Backup extends Base {
  constructor (ctx) {
    super(ctx)
    this.title = () => i18n.__('Backup')

    this.state = {
      drives: [],
      drive: null,
      localPath: ''
    }

    this.openDialog = () => {
      remote.dialog.showOpenDialog({ properties: ['openDirectory'] }, (filePaths) => {
        if (!filePaths || !filePaths.length) return
        const localPath = filePaths[0]
        const id = 'test123'
        const apis = this.ctx.props && this.ctx.props.apis
        const drives = apis && apis.drives && apis.drives.data
        const backupDrive = drives.find(d => d.type === 'backup')
        if (backupDrive) {
          ipcRenderer.send('BACKUP', { id, localPath, dirUUID: backupDrive.uuid, driveUUID: backupDrive.uuid })
          this.setState({ localPath })
        }
      })
    }

    this.refresh = () => {
      this.ctx.props.apis.request('drives')
    }

    this.enterDrive = (drive) => {
      this.ctx.props.apis.request('listNavDir', { driveUUID: drive.uuid, dirUUID: drive.uuid }, (err, body) => {
        console.log(err, body)
      })
    }

    ipcRenderer.on('BACKUP_STAT', (event, data) => {
      console.log('BACKUP_STAT', data)
    })
  }

  willReceiveProps (nextProps) {
    this.handleProps(nextProps.apis, ['drives'])
  }

  navEnter () {
    this.refresh()
  }

  navLeave () {
    this.setState({ drives: null })
  }

  navGroup () {
    return 'file'
  }

  menuName () {
    return this.title()
  }

  menuIcon () {
    return BackupIcon
  }

  menuSelectedIcon () {
    return BackupIcon
  }

  renderTitle () {
    return (
      <div
        style={{
          height: 24,
          marginBottom: 24,
          marginLeft: 56,
          fontSize: 12,
          color: 'rgba(0,0,0,.54)',
          display: 'flex',
          alignItems: ' center'
        }}
      >
        { '备份空间' }
      </div>
    )
  }

  renderToolBar ({ style, openDetail }) {
    return (
      <div style={style}>
        <div style={{ width: 16 }} />
        <div style={{ height: 40, display: 'flex', alignItems: 'center', fontSize: 18, color: 'rgba(0,0,0,.76)' }}>
          { this.menuName() }
        </div>
        <div style={{ flexGrow: 1 }} />
        <LIButton onClick={() => {}} tooltip={i18n.__('More')} >
          <SettingsIcon />
        </LIButton>
        <LIButton onClick={openDetail} tooltip={i18n.__('Info')} >
          <InfoIcon />
        </LIButton>
        <div style={{ width: 8 }} />
      </div>
    )
  }

  renderContent ({ openSnackBar }) {
    return (
      <BDrives
        {...this.ctx.props}
        enterDrive={this.enterDrive}
      />
    )
  }
}

export default Backup
