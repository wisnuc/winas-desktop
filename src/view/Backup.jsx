import i18n from 'i18n'
import React from 'react'
import { remote, ipcRenderer } from 'electron'
import Home from './Home'
import sortByType from '../common/sort'
import { ipcReq } from '../common/ipcReq'
import { LIButton } from '../common/Buttons'
import BackupNotification from '../file/BackupNotification'
import convertCode from '../transmission/convertCode'
import { RefreshAltIcon, BackupIcon, ListIcon, GridIcon, EyeOffIcon, EyeOpenIcon } from '../common/Svg'

class Backup extends Home {
  constructor (ctx) {
    super(ctx)
    this.type = 'backup'
    this.title = () => i18n.__('Backup')
    this.isBackup = true
    this.rootDrive = null

    const userConfig = Array.isArray(window.config.users) && window.config.users.find(u => u.userUUID === this.userUUID)
    const gridView = userConfig && userConfig[`gridViewIn${this.type}`]

    this.state = Object.assign(this.state, { inRoot: true, showArchive: false, gridView })

    this.openAddDirDialog = (drive) => {
      remote.dialog.showOpenDialog({ properties: ['openDirectory'] }, (filePaths) => {
        if (!filePaths || !filePaths.length) {
          this.setState({ addingBackupDir: false })
          return
        }
        const localPath = filePaths[0]

        const args = { driveUUID: drive.uuid, dirUUID: drive.uuid }
        this.ctx.props.apis.pureRequest('listNavDir', args, (err, listNav) => {
          if (err || !listNav) {
            this.setState({ addingBackupDir: false })
            this.ctx.props.openSnackBar(err.code ? convertCode(err.code) : i18n.__('Get Backup Dirs Failed'))
          } else {
            const { entries } = listNav
            if (entries && entries.find(e => !e.deleted && e.metadata && e.metadata.localPath === localPath)) {
              this.setState({ addingBackupDir: false })
              this.ctx.props.openSnackBar(i18n.__('Duplicated Backup Dir'))
            } else { // new backup dir
              const newDirName = remote.require('path').parse(localPath).base
              const dirs = entries ? entries.filter(e => !e.deleted && e.metadata && e.metadata.localPath) : []
              dirs.push({ metadata: { localPath }, name: newDirName })
              ipcRenderer.send('BACKUP_DIR', { dirs, drive })
              this.setState({ addingBackupDir: false })
            }
          }
        })
      })
    }

    this.addBackupDir = () => {
      if (!this.currentDrive || this.state.addingBackupDir) return // should have current device's backup drive
      this.setState(Object.assign(this.state, { addingBackupDir: true }))
      if (this.currentDrive.uuid === 'fake-uuid') { // create backup drive
        ipcReq('createBackupDrive', null, (err, drive) => {
          if (err || !drive) {
            this.setState({ addingBackupDir: false })
            this.ctx.props.openSnackBar(i18n.__('Create Backup Drive Failed'))
          } else {
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
      } else if (entry.type === 'backup' && entry.uuid !== 'fake-uuid') {
        this.rootDrive = entry

        const pos = { driveUUID: entry.uuid, dirUUID: entry.uuid }
        this.enter(pos, err => err && console.error('listNavBySelect error', err))
        this.history.add(pos)
      }
    }

    this.toggleShowArchive = () => {
      console.log('this.toggleShowArchive', this.state)
      const { showArchive, listNavDir, sortType } = this.state
      Object.assign(this.state, { showArchive: !showArchive })
      const entries = this.rearrange(listNavDir.entries)
      entries.sort((a, b) => sortByType(a, b, sortType))
      const select = this.select.reset(entries.length)
      this.setState({ entries, select, showArchive: !showArchive })
    }
  }

  rearrange (entries) {
    const map = new Map()
    // map: name => files, acc: dirs
    const sorted = entries.filter(e => !e.deleted).sort((a, b) => sortByType(a, b, 'otimeDown'))
    const dirs = sorted.reduce((acc, cur, idx) => {
      if (cur.type !== 'file') {
        acc.push(cur)
        return acc
      }
      const versions = map.get(cur.name)
      if (versions) versions.push(cur)
      else map.set(cur.name, [cur])
      return acc
    }, [])
    if (!map.size) return dirs

    const newArray = [...map.values()].map((arr) => {
      const latestVersion = arr[0]
      return Object.assign(latestVersion, { versions: arr, versionNum: arr.length })
    })

    console.log('result', dirs, newArray)
    const result = ([...dirs, ...newArray])
    if (!this.state.showArchive) return result.filter(e => !e.archived)
    return result
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

      const { machineId, hostname } = window.config
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

      const entries = this.rearrange(this.state.listNavDir.entries)

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
    const { path } = this.state
    const color = 'rgba(0,0,0,.54)'
    const breadCrumbStyle = { height: 40, fontSize: 18, color, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }
    const iconStyle = { color, width: 24, height: 24 }
    return (
      <div style={style}>
        { this.renderBreadCrumbItem({ style: breadCrumbStyle }) }
        <div style={{ flexGrow: 1 }} />

        { path && path.length <= 2 && <BackupNotification {...this.ctx.props} /> }

        <LIButton onClick={() => this.refresh()} tooltip={i18n.__('Refresh')} >
          <RefreshAltIcon color={color} />
        </LIButton>

        {
          path && path.length > 2 &&
            <LIButton
              onClick={this.toggleShowArchive}
              tooltip={this.state.showArchive ? i18n.__('Hide Archived') : i18n.__('Show Archived')}
            >
              { this.state.showArchive ? <EyeOffIcon /> : <EyeOpenIcon /> }
            </LIButton>
        }
        {
          path && path.length > 2 &&
            <LIButton
              onClick={() => this.toggleDialog('gridView')}
              tooltip={this.state.gridView ? i18n.__('List View') : i18n.__('Grid View')}
            >
              { this.state.gridView ? <ListIcon style={iconStyle} /> : <GridIcon style={iconStyle} /> }
            </LIButton>
        }

        <div style={{ width: 16 }} />
      </div>
    )
  }
}

export default Backup
