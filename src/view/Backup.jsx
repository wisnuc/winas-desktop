import i18n from 'i18n'
import React from 'react'
import { remote, ipcRenderer } from 'electron'
import Home from './Home'
import sortByType from '../common/sort'
import { LIButton } from '../common/Buttons'
import { RefreshAltIcon, BackupIcon, MoreIcon } from '../common/Svg'

class Backup extends Home {
  constructor (ctx) {
    super(ctx)
    this.title = () => i18n.__('Backup')
    this.isBackup = true
    this.rootDrive = null
    this.state = Object.assign(this.state, { inRoot: true })

    this.openAddDirDialog = (drive) => {
      remote.dialog.showOpenDialog({ properties: ['openDirectory'] }, (filePaths) => {
        if (!filePaths || !filePaths.length) return
        const localPath = filePaths[0]

        const args = { driveUUID: drive.uuid, dirUUID: drive.uuid }
        this.ctx.props.apis.pureRequest('listNavDir', args, (err, listNav) => {
          if (err || !listNav) this.ctx.props.openSnackBar(i18n.__('Get Backup Dirs Failed'))
          else {
            const { entries } = listNav
            if (entries && entries.find(e => !e.deleted && e.metadata && e.metadata.localPath === localPath)) {
              this.ctx.props.openSnackBar(i18n.__('Duplicated Backup Dir'))
            } else { // new backup dir
              const newDirName = remote.require('path').parse(localPath).base
              const dirs = entries ? entries.filter(e => !e.deleted && e.metadata && e.metadata.localPath) : []
              // dirs.length = 0 // ignore previous top dirs TODO
              dirs.push({ metadata: { localPath }, name: newDirName })
              ipcRenderer.send('BACKUP_DIR', { dirs, drive })
            }
          }
        })
      })
    }

    this.addBackupDir = () => {
      if (!this.currentDrive) return // should have current device's backup drive
      if (this.currentDrive.uuid === 'fake-uuid') { // create backup drive
        const { hostname, machineId, platform } = window.config
        const args = {
          label: hostname,
          machineId: machineId.slice(-8),
          type: platform === 'drawin' ? 'Mac-PC' : platform === 'win32' ? 'Win-PC' : 'Linux-PC'
        }
        this.ctx.props.apis.pureRequest('createBackupDrive', args, (err, drive) => {
          if (err || !drive) this.ctx.props.openSnackBar(i18n.__('Create Backup Drive Failed'))
          else {
            const rest = this.state.entries.slice(1, this.state.entries.length)
            this.currentDrive = drive
            this.setState({ entries: [Object.assign({ name: drive.label }, drive), ...rest] })
            this.openAddDirDialog(drive)
          }
        })
      } else this.openAddDirDialog(this.currentDrive)
    }

    this.refresh = (op) => {
      if (!this.state.path) return
      const rUUID = this.state.path[0] && this.state.path[0].uuid
      const dUUID = this.state.path[0] && this.state.path[this.state.path.length - 1].uuid
      if (!rUUID || !dUUID) {
        this.setState({ loading: true, showSearch: false })
        this.ctx.props.apis.request('drives') // drive root
        this.ctx.props.apis.request('users') // drive root
      } else {
        this.ctx.props.apis.request('listNavDir', { driveUUID: rUUID, dirUUID: dUUID })
      }
      this.resetScrollTo()

      if (op) this.setState({ scrollTo: op.fileName || op.uuid, loading: !op.noloading }) // fileName for files, uuid for drives
      else this.setState({ loading: true, showSearch: false })
    }

    this.listNavBySelect = () => {
      const selected = this.select.state.selected
      if (selected.length !== 1) return

      /* reset jump action of files or drives */
      this.resetScrollTo()

      const entry = this.state.entries[selected[0]]
      if (entry.type === 'directory' && entry.pdrv) { // search result
        const driveUUID = entry.pdrv
        const dirUUID = entry.uuid
        this.rootDrive = this.ctx.props.apis.drives.data.find(d => d.uuid === entry.pdrv)
        if (!driveUUID || !dirUUID) return
        this.ctx.navToDrive(driveUUID, dirUUID)
      } else if (entry.type === 'directory') {
        const pos = { driveUUID: this.state.path[0].uuid, dirUUID: entry.uuid }
        this.enter(pos, err => err && console.error('listNavBySelect error', err))
        this.history.add(pos)
      } else if (entry.type === 'backup') {
        this.rootDrive = entry

        const pos = { driveUUID: entry.uuid, dirUUID: entry.uuid }
        this.enter(pos, err => err && console.error('listNavBySelect error', err))
        this.history.add(pos)
      }
    }

    this.toggleShowArchive = () => {
      console.log('this.toggleShowArchive', this.state)
      const { showArchive, listNavDir, sortType } = this.state
      let entries = listNavDir.entries.filter(e => !e.deleted)
      if (showArchive) entries = entries.filter(e => !e.archived)
      entries.sort((a, b) => sortByType(a, b, sortType))
      const select = this.select.reset(entries.length)
      this.setState({ entries, select, showArchive: !showArchive })
    }

    ipcRenderer.on('BACKUP_STAT', (event, data) => {
      console.log('BACKUP_STAT', data)
    })
  }

  willReceiveProps (nextProps) {
    if (this.state.showSearch && this.force) { // for change sort type of search results
      this.force = false
      const entries = [...this.state.entries].sort((a, b) => sortByType(a, b, this.state.sortType))
      this.setState({ entries })
    } else if (!this.rootDrive) {
      this.preDriveValue = this.state.drives
      this.handleProps(nextProps.apis, ['drives', 'users'])
      if (this.preDriveValue === this.state.drives && !this.force) return

      /* process path and entries, in root */
      const path = [{ name: i18n.__('Backup Devices'), uuid: null, type: 'backupRoot' }]

      const machineId = window.config.machineId.slice(-8)
      const hostname = window.config.hostname
      const entries = this.state.drives.filter(d => d.type === 'backup' && d.client && (d.client.id !== machineId))

      /* backup drive created or not */
      this.currentDrive = this.state.drives.find(d => d.type === 'backup' && d.client && (d.client.id === machineId))
      if (!this.currentDrive) this.currentDrive = { type: 'backup', client: { id: machineId }, label: hostname, uuid: 'fake-uuid' }

      /* set current device's backup drives as first */
      entries.unshift(this.currentDrive)

      entries.forEach(item => Object.assign(item, { name: item.label }))
      const select = this.select.reset(entries.length)

      this.force = false

      /* history */
      const pos = { type: 'backRoot' }
      if (this.history.get().curr === -1) this.history.add(pos)

      this.setState({ path, entries, select, inRoot: true, loading: false })
    } else {
      this.preListValue = this.state.listNavDir
      this.handleProps(nextProps.apis, ['listNavDir'])
      if (this.preListValue === this.state.listNavDir && !this.force) return

      /* process path and entries, not in root */
      const path = [{ name: i18n.__('Backup Devices'), uuid: this.rootDrive.uuid, type: 'backupRoot' }, ...this.state.listNavDir.path]
      const drives = this.state.drives || this.ctx.props.apis.drives.value()
      path[1].name = this.rootDrive.name || drives.find(d => d.uuid === this.rootDrive.uuid).label

      let entries = [...this.state.listNavDir.entries].filter(e => !e.deleted)
      if (!this.state.showArchive) entries = entries.filter(e => !e.archived)
      entries.sort((a, b) => sortByType(a, b, this.state.sortType))

      const select = this.select.reset(entries.length)
      const { counter } = this.state.listNavDir

      this.setState({
        path,
        entries,
        select,
        counter,
        inRoot: false,
        loading: false,
        showSearch: false
      })

      this.force = false
    }
  }

  navGroup () {
    return 'file'
  }

  navRoot () {
    this.rootDrive = null
    this.ctx.props.apis.request('drives')
    this.ctx.props.apis.request('users')
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

  renderToolBar ({ style }) {
    const color = 'rgba(0,0,0,.54)'

    const inRoot = this.state.inRoot || (this.hasRoot && !this.phyDrive)
    const breadCrumbStyle = { height: 40, fontSize: 18, color: 'rgba(0,0,0,.54)', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }
    return (
      <div style={style}>
        { this.renderBreadCrumbItem({ style: breadCrumbStyle }) }
        <div style={{ flexGrow: 1 }} />

        <LIButton onClick={() => this.refresh()} tooltip={i18n.__('Refresh')} >
          <RefreshAltIcon color={color} />
        </LIButton>

        {
          !inRoot &&
            <LIButton onClick={this.toggleShowArchive} tooltip={i18n.__('Filter')} >
              <MoreIcon />
            </LIButton>
        }

        <div style={{ width: 8 }} />
      </div>
    )
  }
}

export default Backup
