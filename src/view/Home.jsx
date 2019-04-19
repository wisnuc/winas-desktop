import i18n from 'i18n'
import React from 'react'
import Promise from 'bluebird'
import { ipcRenderer } from 'electron'
import { Divider } from 'material-ui'
import OpenInFolderIcon from 'material-ui/svg-icons/action/open-in-new'

import Base from './Base'
import DownloadDialog from '../file/DownloadDialog'
import FileDetail from '../file/FileDetail'
import ListSelect from '../file/ListSelect'
import FileContent from '../file/FileContent'
import NewFolderDialog from '../file/NewFolderDialog'
import MoveDialog from '../file/MoveDialog'
import RenameDialog from '../file/RenameDialog'
import ContextMenu from '../common/ContextMenu'
import DialogOverlay from '../common/PureDialog'
import MenuItem from '../common/MenuItem'
import sortByType from '../common/sort'
import { BreadCrumbItem, BreadCrumbSeparator } from '../common/BreadCrumb'
import { RefreshAltIcon, DeleteIcon, ListIcon, GridIcon, FolderIcon, FolderOutlineIcon, AddIcon, DownloadIcon, InfoIcon, EditIcon, ShareIcon, CopyIcon, MoveIcon, NewFolderIcon, UploadFold, UploadFile } from '../common/Svg'
import renderFileIcon from '../common/renderFileIcon'
import { xcopyMsg } from '../common/msg'
import History from '../common/history'
import { LIButton, ActButton } from '../common/Buttons'
import ConfirmDialog from '../common/ConfirmDialog'

/* increase limit of listeners of EventEmitter */
ipcRenderer.setMaxListeners(1000)

/* Drag Item's Coordinate */
const transition = 'all 225ms cubic-bezier(.4,0,1,1)'
const DRAGTOP = 163
const DRAGLEFT = 116
const DRAGWIDTH = 'calc(100% - 140px)'

class Home extends Base {
  constructor (ctx) {
    super(ctx)

    this.type = 'home'
    this.title = () => i18n.__('Home Title')
    /* handle select TODO */
    this.select = new ListSelect(this)
    this.select.on('updated', next => this.setState({ select: next }))

    this.userUUID = ctx.props.account.winasUserId

    const userConfig = Array.isArray(window.config.users) && window.config.users.find(u => u.userUUID === this.userUUID)
    const gridView = userConfig && userConfig[`gridViewIn${this.type}`]

    this.state = {
      gridView: !!gridView, // false: list, true: grid
      sortType: 'nameUp', // nameUp, nameDown, timeUp, timeDown, sizeUp, sizeDown, takenUp, takenDown
      select: this.select.state,
      listNavDir: null, // save a reference
      path: [],
      entries: [], // sorted
      contextMenuOpen: false,
      contextMenuY: -1,
      contextMenuX: -1,

      createNewFolder: false,
      delete: false,
      move: false,
      copy: false,
      share: false,
      loading: true
    }

    /* handle update sortType */
    this.force = false
    this.changeSortType = (sortType) => {
      this.force = true
      if (sortType === 'takenUp' || sortType === 'takenDown') this.setState({ takenTime: true })
      if (sortType === 'timeUp' || sortType === 'timeDown') this.setState({ takenTime: false })
      this.setState({ sortType })
      this.hideContextMenu()
    }

    this.toggleDialog = (type) => {
      this.setState({ [type]: !this.state[type] })
    }

    this.toggleGridView = () => {
      this.preGridView = this.state.gridView
      this.setState({ gridView: !this.preGridView })
      ipcRenderer.send('UPDATE_USER_CONFIG', this.userUUID, { [`gridViewIn${this.type}`]: !this.preGridView })
    }

    /* op: scrollTo file */
    this.refresh = (op) => {
      if (!this.state.path) return
      const rUUID = this.state.path[0] && this.state.path[0].uuid
      const dUUID = this.state.path[0] && this.state.path[this.state.path.length - 1].uuid
      if (!rUUID || !dUUID) {
        // home or public
        this.setState({ loading: true, showSearch: false })
        const drives = this.ctx.props.apis && this.ctx.props.apis.drives && this.ctx.props.apis.drives.data
        const drive = drives.find(d => (this.isPublic ? d.tag === 'built-in' : d.tag === 'home'))
        this.ctx.props.apis.request('listNavDir', { driveUUID: drive.uuid, dirUUID: drive.uuid })
      } else {
        this.ctx.props.apis.request('listNavDir', { driveUUID: rUUID, dirUUID: dUUID })
      }
      this.resetScrollTo()

      if (op) this.setState({ scrollTo: op.fileName || op.uuid, loading: !op.noloading }) // fileName for files, uuid for drives
      else this.setState({ loading: true, showSearch: false })
    }

    /* file or dir operations */
    this.upload = (type) => {
      const dirPath = this.state.path
      const dirUUID = dirPath[dirPath.length - 1].uuid
      const driveUUID = dirPath[0].uuid
      ipcRenderer.send('UPLOAD', { dirUUID, driveUUID, type })
    }

    this.download = () => {
      const selected = this.state.select.selected
      const entries = selected.map(index => this.state.entries[index])
      const path = this.state.path
      this.setState({ onDownload: { entries, path } })
    }

    this.downloadBackup = (entries) => {
      this.setState({ onDownload: { entries, path: this.state.path } })
    }

    this.downloadFire = ({ entries, path, downloadPath }) => {
      if (this.isSearch) { // search result
        const entriesByDir = entries.sort((a, b) => a.pdir.localeCompare(b.pdir)).reduce((acc, cur) => {
          if (!acc[0]) acc.push([cur])
          else if (acc.slice(-1)[0][0].pdir === cur.pdir) acc.slice(-1)[0].push(cur)
          else acc.push([cur])
          return acc
        }, [])
        entriesByDir.forEach((arr) => {
          const driveUUID = arr[0].pdrv
          const dirUUID = arr[0].pdir
          ipcRenderer.send('DOWNLOAD', { entries: arr, dirUUID, driveUUID })
        })
      } else {
        ipcRenderer.send('DOWNLOAD', { entries, dirUUID: path[path.length - 1].uuid, driveUUID: path[0].uuid })
      }
      this.setState({ onDownload: null })
    }

    this.dupFile = () => {
      const entries = this.state.entries
      const selected = this.state.select.selected
      const path = this.state.path
      const curr = path[path.length - 1]
      const oldName = entries[selected[0]].name
      const reg = /^.*\./
      const extension = oldName.replace(reg, '')
      const nameNoExt = oldName.match(reg) ? oldName.match(reg)[0] : oldName
      let newName = oldName
      const findSame = name => entries.findIndex(e => e.name === name) > -1
      for (let i = 0; findSame(newName); i++) {
        const addText = i ? ` - ${i18n.__('Copy(noun)')} (${i})` : ` - ${i18n.__('Copy(noun)')}`
        if (!extension || extension === oldName || nameNoExt === '.') {
          newName = `${oldName}${addText}`
        } else {
          const pureName = oldName.match(/^.*\./)[0]
          newName = `${pureName.slice(0, pureName.length - 1)}${addText}.${extension}`
        }
      }
      const args = {
        driveUUID: path[0].uuid,
        dirUUID: curr.uuid,
        entryUUID: entries[selected[0]].uuid,
        newName,
        oldName
      }
      this.ctx.props.apis.request('dupFile', args, (err, data) => {
        if (err) this.ctx.props.openSnackBar(i18n.__('Dup File Failed'))
        else {
          this.refresh()
          this.ctx.props.openSnackBar(i18n.__('Dup File Success'))
        }
      })
    }

    this.xcopy = (action) => {
      if (this.state.inRoot && !this.state.showSearch) return
      const selected = this.state.select.selected
      if (!selected && !selected.length) return
      const entries = selected.map(index => this.state.entries[index])
      const drive = this.state.path[0].uuid
      const srcPath = this.state.path.slice(-1)[0]
      const dir = srcPath.uuid
      this.ctx.props.clipboard.set({ action, loc: 'drive', drive, dir, entries, srcPath })
    }

    this.onCopy = () => {
      this.xcopy('copy')
    }

    this.onCut = () => {
      this.xcopy('move')
    }

    /* request task state */
    this.getTaskState = async (uuid) => {
      await Promise.delay(500)
      const data = await this.ctx.props.apis.pureRequestAsync('task', { uuid })
      if (data && (data.finished || data.allFinished)) return 'Finished'
      if (data && data.nodes && data.nodes.findIndex(n => n.state === 'Conflict') > -1) return 'Conflict'
      return 'Working'
    }

    /* finish post change dialog content to waiting/result */
    this.finish = (error, data, action) => {
      const type = action === 'copy' ? i18n.__('Copy') : i18n.__('Move')
      if (error) {
        this.ctx.props.openSnackBar(type.concat(i18n.__('+Failed')))
        this.ctx.setState({ showTasks: true })
      } else {
        this.getTaskState(data.uuid).then((res) => {
          let text = i18n.__('Working')
          if (res === 'Finished') text = xcopyMsg(this.xcopyData)
          if (res === 'Conflict') text = i18n.__('Task Conflict Text')
          this.refresh({ noloading: true })
          this.ctx.props.openSnackBar(text)
          // TODO
          // if (res !== 'Finished') this.ctx.setState({ showTasks: true })
          this.ctx.setState({ showTasks: true })
        }).catch((err) => {
          console.error('this.getTaskState error', err)
          this.ctx.props.openSnackBar(type.concat(i18n.__('+Failed')))
          this.ctx.setState({ showTasks: true })
        })
      }
    }

    this.onPaste = () => {
      if (this.isMedia || this.state.inRoot) return
      const pos = this.ctx.props.clipboard.get()
      const driveUUID = this.state.path[0].uuid
      const dirUUID = this.state.path.slice(-1)[0].uuid
      const isBatch = !!pos.entries[0].pdrv || !!pos.entries[0].namepath // drive search or usb search result

      const entries = pos.entries[0].pdrv ? pos.entries.map(e => ({ name: e.name, drive: e.pdrv, dir: e.pdir }))
        : pos.entries[0].namepath ? pos.entries.map(e => ({
          name: e.name, drive: pos.drive, dir: e.namepath.slice(0, e.namepath.length - 1).join('/')
        }))
          : pos.entries.map(e => e.name)

      const args = {
        batch: isBatch,
        entries,
        policies: { dir: ['keep', null] },
        dst: { drive: driveUUID, dir: dirUUID },
        src: { drive: pos.drive, dir: pos.dir },
        type: pos.loc === 'phy' ? `i${pos.action}` : pos.loc === 'drive' ? pos.action : ''
      }
      if (!isBatch && dirUUID === pos.dir && driveUUID === pos.drive) {
        Object.assign(args, { policies: { dir: ['rename', 'rename'], file: ['rename', 'rename'] } })
      }
      this.xcopyData = {
        type: pos.action,
        entries: pos.entries,
        srcDir: pos.srcPath,
        dstDir: this.state.path.slice(-1)[0]
      }
      console.log('xcopy', args)
      this.ctx.props.apis.pureRequest('copy', args, (err, res) => this.finish(err, res, pos.action))
    }

    /* share to built-in drive */
    this.shareToAll = () => {
      /* set parameter */
      const type = 'copy'
      const builtIn = this.ctx.props.apis.drives.value().find(d => d.tag === 'built-in')
      const src = { drive: this.state.path[0].uuid, dir: this.state.path[this.state.path.length - 1].uuid }
      const dst = { drive: builtIn.uuid, dir: builtIn.uuid }

      const selected = this.state.select.selected
      if (!selected && !selected.length) return
      const entries = selected.map(i => this.state.entries[i].name)

      const policies = { dir: ['rename', 'rename'], file: ['rename', 'rename'] }

      this.xcopyData = {
        type: 'share',
        srcDir: this.state.path[this.state.path.length - 1],
        dstDir: Object.assign({}, builtIn, { type: 'public' }),
        entries: selected.map(i => this.state.entries[i])
      }

      this.ctx.props.apis.pureRequest('copy', { type, src, dst, entries, policies }, this.finish)
    }

    this.rename = () => {
      this.setState({ rename: true })
    }

    this.deleteMediaOrSearchAsync = async () => {
      const selected = this.state.select.selected
      const entries = selected.map(index => this.state.entries[index])
      const entriesByDir = entries.sort((a, b) => a.pdir.localeCompare(b.pdir)).reduce((acc, cur) => {
        if (!acc[0]) acc.push([cur])
        else if (acc.slice(-1)[0][0].pdir === cur.pdir) acc.slice(-1)[0].push(cur)
        else acc.push([cur])
        return acc
      }, [])

      for (let n = 0; n < entriesByDir.length; n++) {
        const arr = entriesByDir[n]
        const driveUUID = arr[0].pdrv
        const dirUUID = arr[0].pdir

        const op = []
        for (let i = 0; i < arr.length; i++) {
          const entryName = arr[i].name
          const entryUUID = arr[i].uuid
          op.push({ driveUUID, dirUUID, entryName, entryUUID })
        }
        for (let j = 0; j <= (op.length - 1) / 512; j++) { // delete no more than 512 files per post
          await this.ctx.props.apis.requestAsync('deleteDirOrFile', op.filter((a, i) => (i >= j * 512) && (i < (j + 1) * 512)))
        }
      }

      /* refresh */
      this.refresh()
    }

    this.deletePhyAsync = async () => {
      const path = this.state.path.filter(p => p.type === 'directory').map(p => p.name).join('/')
      const entries = this.state.select.selected.map(index => this.state.entries[index])
      const queryStrings = this.state.showSearch
        ? entries.map(e => e.namepath.join('/'))
        : entries.map(e => (path ? `${path}/${e.name}` : e.name))
      for (let i = 0; i < queryStrings.length; i++) {
        const p = queryStrings[i]
        await this.ctx.props.apis.requestAsync('deletePhyDirOrFile', { id: this.phyDrive.id, qs: { path: p } })
      }
      await this.ctx.props.apis.requestAsync('listPhyDir', { id: this.phyDrive.id, path })
    }

    this.deleteAsync = async () => {
      const entries = this.state.entries
      const selected = this.state.select.selected
      const path = this.state.path
      const dirUUID = path[path.length - 1].uuid
      const driveUUID = this.state.path[0].uuid

      if (this.isBackup && path.length === 1) { // TODO, delete backup drive, for dev
        for (let i = 0; i < selected.length; i++) {
          const entry = entries[selected[i]]
          await this.ctx.props.apis.requestAsync('adminDeleteDrive', { uuid: entry.uuid })
        }
        this.refresh()
        return
      }
      const op = []
      for (let i = 0; i < selected.length; i++) {
        const entry = entries[selected[i]]
        if (entry.versionNum > 1) { // delete all version
          entry.versions.forEach((v) => {
            const entryName = v.name
            const entryUUID = v.uuid
            const hash = v.hash
            op.push({ driveUUID, dirUUID, entryName, entryUUID: hash ? entryUUID : undefined, hash })
          })
        } else {
          const entryName = entry.name
          const entryUUID = entry.uuid
          const hash = entry.hash
          op.push({ driveUUID, dirUUID, entryName, entryUUID: hash ? entryUUID : undefined, hash })
        }
      }
      for (let j = 0; j <= (op.length - 1) / 512; j++) { // delete no more than 512 files per post
        await this.ctx.props.apis.requestAsync('deleteDirOrFile', op.filter((a, i) => (i >= j * 512) && (i < (j + 1) * 512)))
      }

      if (this.state.path[this.state.path.length - 1].uuid === dirUUID) {
        await this.ctx.props.apis.requestAsync('listNavDir', { driveUUID: this.state.path[0].uuid, dirUUID })
      }
    }

    this.delete = () => {
      this.setState({ deleteLoading: true })
      const fire = this.isUSB ? this.deletePhyAsync
        : (this.isMedia || this.state.showSearch) ? this.deleteMediaOrSearchAsync
          : this.deleteAsync

      fire().then(() => {
        this.setState({ deleteLoading: false, delete: false })
        this.ctx.props.openSnackBar(i18n.__('Delete Success'))
      }).catch((e) => {
        this.setState({ deleteLoading: false, delete: false })
        this.ctx.props.openSnackBar(i18n.__('Delete Failed'))
      })
    }

    this.deleteVersion = (entry) => {
      const path = this.state.path
      const dirUUID = path[path.length - 1].uuid
      const driveUUID = this.state.path[0].uuid
      const { bname, uuid, hash } = entry
      this.setState({ deleteLoading: true })
      this.ctx.props.apis.request('deleteDirOrFile', [{ driveUUID, dirUUID, entryName: bname, entryUUID: uuid, hash }], (err) => {
        if (err) {
          this.setState({ deleteLoading: false, openDeleteVersion: false })
          this.ctx.props.openSnackBar(i18n.__('Delete Failed'))
        } else {
          this.setState({ deleteLoading: false, openDeleteVersion: false })
          this.ctx.props.openSnackBar(i18n.__('Delete Success'))
        }
        this.refresh()
      })
    }

    this.onDeleteVersion = (entry) => {
      this.setState({ openDeleteVersion: entry })
    }

    this.fakeOpen = () => {
      const selected = this.state.select && this.state.select.selected
      if (!selected || selected.length !== 1) return
      this.setState({ fakeOpen: { index: selected[0] } })
    }

    this.openInFolder = () => {
      const selected = this.state.select && this.state.select.selected
      if (!selected || selected.length !== 1) return

      const entry = selected.map(index => this.state.entries[index])[0]
      const driveUUID = entry.pdrv
      const dirUUID = entry.pdir
      if (!driveUUID || !dirUUID) return
      this.ctx.navToDrive(driveUUID, dirUUID)
    }

    this.clearFakeOpen = () => {
      this.setState({ fakeOpen: null })
    }

    /* handle Public Drive */
    this.modifyPublic = () => {
      this.setState({ newDrive: 'edit' })
    }

    this.deletePublic = () => {
      this.setState({ deleteDriveConfirm: true })
    }

    this.fireDeletePublic = () => {
      const { select, entries } = this.state
      const uuid = select && entries && entries[select.selected[0]] && entries[select.selected[0]].uuid
      this.ctx.props.apis.request('adminDeleteDrive', { uuid }, (err, res) => {
        if (err) this.ctx.props.openSnackBar(i18n.__('Delete Drive Failed'))
        else this.ctx.props.openSnackBar(i18n.__('Delete Drive Success'))
        this.setState({ deleteDriveConfirm: false })
        this.refresh()
      })
    }

    this.history = new History()

    /* actions */
    this.enter = (pos, cb) => {
      this.ctx.props.apis.request('listNavDir', pos, cb)
    }

    this.listNavBySelect = () => {
      const selected = this.select.state.selected
      if (selected.length !== 1) return

      /* reset jump action of files or drives */
      this.resetScrollTo()

      const entry = this.state.entries[selected[0]]
      if (entry.type === 'directory' || (entry.type === 'backup')) {
        const pos = { driveUUID: this.state.path[0].uuid, dirUUID: entry.uuid }
        this.enter(pos, err => err && console.error('listNavBySelect error', err))
        this.history.add(pos)
      }
    }

    this.back = () => {
      const pos = this.history.back()
      this.setState({ showSearch: false })
      this.enter(pos, err => err && console.error('back error', err))
    }

    this.forward = () => {
      const pos = this.history.forward()
      this.enter(pos, err => err && console.error('forward error', err))
    }

    this.resetScrollTo = () => Object.assign(this.state, { scrollTo: null })

    this.showContextMenu = (clientX, clientY) => {
      const length = (this.select.state && this.select.state.selected && this.select.state.selected.length) || 0
      const depth = this.state.path && this.state.path.length

      if (!this.select.state || this.select.state.ctrl || this.select.state.shift) return

      /* in backup, no selected, in drive or topDirs */
      if (this.isBackup && (!length || depth < 2)) return

      /* in search, no selected */
      if (this.isSearch && !length) return

      const containerDom = document.getElementById('content-container')
      const maxLeft = containerDom.offsetLeft + containerDom.clientWidth - 256
      const x = clientX > maxLeft ? maxLeft : clientX
      /* calc positon of menu using height of menu which is related to number of selected items */
      let itemNum = 7
      if (this.isSearch && length === 1) {
        itemNum = 4
      } else if (this.isBackup || this.isSearch || !length) {
        itemNum = 3
      } else if (length > 1) itemNum = 6
      else itemNum = 7

      const maxTop = containerDom.offsetTop + containerDom.offsetHeight - itemNum * 40 - 48
      const y = clientY > maxTop ? maxTop : clientY
      this.setState({
        contextMenuOpen: true,
        contextMenuX: x,
        contextMenuY: y
      })
    }

    this.hideContextMenu = () => {
      this.setState({
        contextMenuOpen: false
      })
    }

    this.shouldFire = () => {
      const { select, entries } = this.state
      const { hover } = select
      return hover > -1 && select.rowDrop(hover) && entries[hover].type === 'directory' && this.RDSI !== hover
    }

    this.onHoverHeader = (node) => {
      this.hoverHeader = node
      this.forceUpdate()
    }

    /* verify header node for dropping, return `null` or the node */
    this.dropHeader = () => {
      if (!this.hoverHeader || this.hoverHeader.uuid === this.state.path.slice(-1)[0].uuid) return null
      if (this.hoverHeader.type === 'publicRoot') return null
      return this.hoverHeader
    }

    this.setScrollTop = scrollTop => (this.scrollTop = scrollTop)

    this.setGridData = data => (this.gridData = data)

    this.getPosition = (gridData, index) => {
      const { mapData, indexHeightSum, scrollTop, cellWidth } = gridData
      console.log('gridData', gridData)
      const lineNum = mapData[index]
      const top = indexHeightSum[lineNum] + 48 - scrollTop
      const left = (index - mapData.findIndex(i => i === lineNum)) * (cellWidth + 16) + DRAGLEFT + 16
      return ({ top, left })
    }

    /* drag row */
    this.dragRow = (e) => {
      if (this.isBackup || this.isSearch) return
      const s = this.refDragedItems.style
      if (!this.state.select.selected.includes(this.RDSI)) {
        if (this.RDSI > -1) this.state.select.addByArray([this.RDSI], (new Date()).getTime())
      } else if (s.display !== 'flex') {
        s.display = 'flex'
      } else {
        s.width = '180px'
        s.opacity = 1

        const RDTop = `${this.RDSI * 48 + DRAGTOP - (this.scrollTop || 0)}px`
        if (!s.top || s.top === RDTop) s.top = `${e.clientY + 2}px`
        else s.marginTop = `${e.clientY + 2 - parseInt(s.top, 10)}px`

        const RDLeft = `${DRAGLEFT + (this.pin ? 136 : 0)}px`
        if (!s.left || s.left === RDLeft) s.left = `${e.clientX + 2}px`
        else s.marginLeft = `${e.clientX + 2 - parseInt(s.left, 10)}px`
      }
      if (!this.entry.type) this.forceUpdate()
    }

    this.dragEnd = () => {
      document.removeEventListener('mousemove', this.dragGrid)
      document.removeEventListener('mousemove', this.dragRow)
      document.removeEventListener('mouseup', this.dragEnd)
      if (!this.refDragedItems || this.RDSI < 0) return
      const hover = this.state.select.hover
      const shouldFire = this.shouldFire()
      const dropHeader = this.dropHeader()
      if (shouldFire || dropHeader) {
        const type = this.isUSB ? 'nmove' : 'move'

        const path = this.state.path
        const dir = this.isUSB ? path.filter(p => p.type === 'directory').map(p => p.name).join('/') : path[path.length - 1].uuid
        const drive = this.isUSB ? this.phyDrive.id : path[0].uuid

        const dstEntry = this.state.entries[hover]
        const dstDir = this.isUSB ? (dir ? [dir, dstEntry.name].join('/') : dstEntry.name) : shouldFire ? dstEntry.uuid : dropHeader.uuid

        const args = {
          type,
          policies: { dir: ['keep', null] },
          entries: this.state.select.selected.map(i => this.state.entries[i].name),
          src: { drive, dir },
          dst: { drive, dir: dstDir }
        }

        this.xcopyData = {
          type: 'move',
          srcDir: path[path.length - 1],
          dstDir: shouldFire ? this.state.entries[hover] : dropHeader,
          entries: this.state.select.selected.map(i => this.state.entries[i])
        }

        this.ctx.props.apis.pureRequest('copy', args, this.finish)
      }
      const s = this.refDragedItems.style
      s.transition = transition

      if (this.state.gridView) {
        const { top, left } = this.getPosition(this.gridData, this.RDSI)
        s.top = `${top}px`
        s.left = `${left}px`
        s.width = '180px'
      } else {
        s.top = `${this.RDSI * 48 + DRAGTOP - (this.scrollTop || 0)}px`
        s.left = `${DRAGLEFT + (this.pin ? 136 : 0)}px`
        s.width = DRAGWIDTH
      }
      s.marginTop = '0px'
      s.marginLeft = '0px'
      s.opacity = 0

      this.RDSI = -1
      this.state.select.toggleDrag([])

      setTimeout(() => {
        s.display = 'none'
        s.transition = transition
        s.transitionProperty = 'top, left, width, opacity'
      }, shouldFire || dropHeader ? 0 : 225)
    }

    this.rowDragStart = (event, index) => {
      if (this.isBackup || this.isSearch) return
      /* only left click */
      if (event.nativeEvent.button !== 0) return
      /* not public */
      if (this.state.entries[index].type === 'public') return
      this.RDSI = index // rowDragStartIndex
      const selected = this.state.select.selected
      this.state.select.toggleDrag(selected.includes(this.RDSI) ? selected : [this.RDSI])

      /* show drag item */
      this.refDragedItems.style.top = `${this.RDSI * 48 + DRAGTOP - (this.scrollTop || 0)}px`
      this.refDragedItems.style.left = `${DRAGLEFT + (this.pin ? 136 : 0)}px`

      document.addEventListener('mousemove', this.dragRow)
      document.addEventListener('mouseup', this.dragEnd, true)
    }

    /* drag item in GridView */
    this.dragGrid = (e) => {
      if (this.isBackup) return
      const s = this.refDragedItems.style
      if (!this.state.select.selected.includes(this.RDSI)) {
        if (this.RDSI > -1) this.state.select.addByArray([this.RDSI], (new Date()).getTime())
      } else if (s.display !== 'flex') {
        s.display = 'flex'
      } else {
        s.opacity = 1

        const { top, left } = this.getPosition(this.gridData, this.RDSI)

        if (!s.top || s.top === `${top}px`) s.top = `${e.clientY + 2}px`
        else s.marginTop = `${e.clientY + 2 - parseInt(s.top, 10)}px`

        if (!s.left || s.left === `${left}px`) s.left = `${e.clientX + 2}px`
        else s.marginLeft = `${e.clientX + 2 - parseInt(s.left, 10)}px`
      }
      if (!this.entry.type) this.forceUpdate()
    }

    this.gridDragStart = (event, index) => {
      if (this.isBackup) return
      /* only left click */
      if (event.nativeEvent.button !== 0) return
      /* not public */
      if (this.state.entries[index].type === 'public') return
      /* not usb drive */
      if (this.state.entries[index].isUSB) return

      this.RDSI = index // rowDragStartIndex
      const selected = this.state.select.selected
      this.state.select.toggleDrag(selected.includes(this.RDSI) ? selected : [this.RDSI])

      /* show drag item */
      const { top, left } = this.getPosition(this.gridData, this.RDSI)
      this.refDragedItems.style.top = `${top}px`
      this.refDragedItems.style.left = `${left}px`
      this.refDragedItems.style.width = '180px'

      document.addEventListener('mousemove', this.dragGrid)
      document.addEventListener('mouseup', this.dragEnd, true)
    }

    ipcRenderer.on('driveListUpdate', (e, dir) => {
      if (this.state.contextMenuOpen) return
      if (this.state.select && this.state.select.selected && this.state.select.selected.length > 1) return
      const path = this.state.path
      if (this.isNavEnter && path && path.length && dir.uuid === path[path.length - 1].uuid) this.refresh({ noloading: true })
    })
  }

  willReceiveProps (nextProps) {
    this.preValue = this.state.listNavDir
    this.handleProps(nextProps.apis, ['listNavDir'])

    /* set force === true  to update sortType forcely */
    if (this.preValue === this.state.listNavDir && !this.force) return

    const { path, counter } = this.state.listNavDir
    const entries = (this.state.showSearch && this.force) ? this.state.entries : this.state.listNavDir.entries
    const select = this.select.reset(entries.length)

    if (Array.isArray(path) && path[0]) path[0].type = this.type

    const pos = { driveUUID: path[0].uuid, dirUUID: path[0].uuid }
    if (this.history.get().curr === -1) this.history.add(pos)

    /* sort entries, reset select, stop loading */
    this.setState({
      path,
      select,
      loading: false,
      entries: [...entries].sort((a, b) => sortByType(a, b, this.state.sortType)),
      counter,
      showSearch: this.force && this.state.showSearch
    })

    this.force = false
  }

  navEnter (target) {
    this.isNavEnter = true
    const apis = this.ctx.props.apis
    if (!apis || !apis.drives || !apis.drives.data) return
    if (target && target.driveUUID) { // jump to specific dir
      const { driveUUID, dirUUID } = target
      apis.request('listNavDir', { driveUUID, dirUUID })
      if (this.isBackup) this.rootDrive = { uuid: driveUUID }
      this.setState({ loading: true, showSearch: false })
    } else this.refresh({ noloading: true })
  }

  navLeave () {
    this.isNavEnter = false
    const select = this.select.reset(this.state.entries.length)
    this.setState({
      select,
      contextMenuOpen: false,
      contextMenuY: -1,
      contextMenuX: -1,
      createNewFolder: false,
      delete: false,
      move: false,
      copy: false,
      share: false,
      loading: false,
      showSearch: false
    })
  }

  navRoot () {
    const path = this.state.path
    if (!Array.isArray(path) || !path[0] || !path[0].uuid) return
    const pos = { driveUUID: path[0].uuid, dirUUID: path[0].uuid }
    this.enter(pos, err => err && console.error('Jump via breadCrumb error', err))
    this.history.add(pos)
  }

  navGroup () {
    return 'file'
  }

  menuName () {
    return i18n.__('Home Menu Name')
  }

  menuIcon () {
    return FolderOutlineIcon
  }

  menuSelectedIcon () {
    return FolderIcon
  }

  /* renderers */
  renderDragItems () {
    this.entry = (this.RDSI > -1 && this.state.entries[this.RDSI]) || {}
    return (
      <div
        ref={ref => (this.refDragedItems = ref)}
        style={{
          position: 'fixed',
          zIndex: 1000,
          top: 0,
          left: DRAGLEFT + (this.pin ? 136 : 0),
          marginLeft: 0,
          opacity: 0,
          width: DRAGWIDTH,
          height: 48,
          transition,
          transitionProperty: 'top, left, width, opacity',
          display: 'none',
          alignItems: 'center',
          color: '#FFF',
          boxShadow: '2px 2px 2px rgba(0,0,0,0.27)',
          backgroundColor: this.groupPrimaryColor()
        }}
      >
        <div style={{ width: 4 }} />
        {/* file type may be: folder, public, directory, file, unsupported */}
        <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', margin: 12 }}>
          <div
            style={{
              backgroundColor: 'white',
              width: 36,
              height: 36,
              borderRadius: 18,
              overflow: 'hidden'
            }}
            className="flexCenter"
          >
            {
              this.entry.type === 'directory'
                ? <FolderIcon style={{ color: '#f9a825', width: 24, height: 24 }} />
                : this.entry.type === 'file'
                  ? renderFileIcon(this.entry.name, this.entry.metadata, 24)
                  : <div />
            }
          </div>
        </div>
        <div
          style={{
            width: 114,
            marginRight: 12,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis'
          }}
        >
          { this.entry.name }
        </div>
        {
          this.state.select.selected.length > 1 &&
            <div
              style={{
                position: 'absolute',
                top: -12,
                right: -12,
                width: 24 + Math.floor(Math.log10(this.state.select.selected.length)) * 6,
                height: 24,
                borderRadius: 12,
                boxSizing: 'border-box',
                backgroundColor: this.shouldFire() || this.dropHeader() ? this.groupPrimaryColor() : '#FF4081',
                border: '1px solid rgba(0,0,0,0.18)',
                color: '#FFF',
                fontWeight: 500,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              { this.state.select.selected.length }
            </div>
        }
      </div>
    )
  }

  renderBreadCrumbItem ({ style }) {
    const path = this.state.path

    const touchTap = (node, index) => {
      if (index === path.length - 1) { // current dir
        this.refresh()
      } else {
        this.setState({ loading: true })
        if (node.type === 'backupRoot') { // backup drives
          this.rootDrive = null
          this.ctx.props.apis.request('users')
          this.ctx.props.apis.request('drives')
        } else if (node.isUSB) {
          const newPath = [...path.slice(0, index + 1)]
          const pos = { id: node.id, path: newPath, name: node.name, isUSB: true }
          this.enter(pos, err => err && console.error('listNavBySelect error', err))
          this.history.add(pos)
          this.ctx.props.apis.request('listPhyDir', { id: node.id, path: '' })
        } else if (node.isPhy) { // phyDrives
          const newPath = [...path.slice(0, index + 1)]
          const pos = { id: node.id, path: newPath, name: node.name }
          this.enter(pos, err => err && console.error('listNavBySelect error', err))
          this.history.add(pos)
        } else if (node.isPhyRoot) { // phyRoot
          this.phyDrive = null
          this.ctx.props.apis.request('phyDrives')
        } else { // home drives
          const pos = { driveUUID: path[0].uuid, dirUUID: node.uuid }
          this.enter(pos, err => err && console.error('Jump via breadCrumb error', err))
          this.history.add(pos)
        }
      }
    }

    /*
      each one is preceded with a separator, except for the first one
      each one is assigned an action, except for the last one
    */

    return (
      <div style={Object.assign({}, style, { marginLeft: 16 })}>
        {
          path.reduce((acc, node, index) => {
            const last = index === path.length - 1
            const isDrop = () => this.state.select.isDrop()
            const dropable = () => this.state.select.isDrop() && this.dropHeader()
            const funcs = { node, isDrop, dropable, onHoverHeader: this.onHoverHeader, onClick: () => touchTap(node, index) }

            if (path.length > 4 && index > 0 && index < path.length - 3) {
              if (index === path.length - 4) {
                acc.push(<BreadCrumbSeparator key={`Separator${index}`} />)
                acc.push(<BreadCrumbItem key="..." text="..." {...funcs} />)
              }
              return acc
            }

            if (index !== 0) acc.push(<BreadCrumbSeparator key={`Separator${index}`} />)

            /* the first one is always special; fix Built-in Drive without name */
            if (index === 0) acc.push(<BreadCrumbItem text={this.title()} key="root" {...funcs} last={last} />)
            else {
              acc.push(<BreadCrumbItem
                last={last}
                key={`Item${index}`}
                text={node.bname || node.name || i18n.__('Built-in Drive')}
                {...funcs}
              />)
            }

            return acc
          }, [])
        }
      </div>
    )
  }

  renderToolBar ({ style }) {
    const color = 'rgba(0,0,0,.54)'
    const { select } = this.state
    const itemSelected = select && select.selected && select.selected.length

    const iconStyle = { color, width: 24, height: 24 }
    const breadCrumbStyle = { height: 40, fontSize: 18, color: 'rgba(0,0,0,.54)', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }
    const noRefresh = this.state.showSearch === true
    const hasEntries = this.state.entries && this.state.entries.length
    return (
      <div style={style}>
        {
          !this.state.showSearch ? this.renderBreadCrumbItem({ style: breadCrumbStyle })
            : (
              <div style={{ fontSize: 18, height: 32, marginLeft: 18, display: 'flex', alignItems: 'center' }} >
                { this.state.showSearch === true ? i18n.__('Search Results')
                  : i18n.__('Search Result of %s', this.state.showSearch) }
              </div>
            )
        }
        <div style={{ flexGrow: 1 }} />
        {
          !!itemSelected &&
            <LIButton onClick={() => this.toggleDialog('delete')} tooltip={i18n.__('Delete')} >
              <DeleteIcon />
            </LIButton>
        }

        {
          !!itemSelected &&
            <LIButton onClick={this.download} tooltip={i18n.__('Download')} >
              <DownloadIcon />
            </LIButton>
        }

        {
          !noRefresh &&
            <LIButton onClick={() => this.refresh()} tooltip={i18n.__('Refresh')} >
              <RefreshAltIcon color={color} />
            </LIButton>
        }

        {
          !!hasEntries &&
            <LIButton
              onClick={this.toggleGridView}
              tooltip={this.state.gridView ? i18n.__('List View') : i18n.__('Grid View')}
            >
              { this.state.gridView ? <ListIcon style={iconStyle} /> : <GridIcon style={iconStyle} /> }
            </LIButton>
        }

        <div style={{ width: 16 }} />
      </div>
    )
  }

  renderCreateNewButton (props) {
    return (
      <ActButton
        {...props}
        label={i18n.__('New')}
        icon={AddIcon}
        newFolder={() => this.setState({ createNewFolder: true })}
        upload={this.upload}
      />
    )
  }

  deleteText () {
    const entries = this.state.entries
    const selected = this.state.select.selected
    if (!entries || !Array.isArray(selected) || !selected.length) return ''
    const isMultiple = selected.length > 1
    const isFile = entries[selected[0]].type === 'file'
    let text = isMultiple ? i18n.__('Delete Items Text %s', selected.length)
      : isFile ? i18n.__('Delete File Text') : i18n.__('Delete Folder Text')

    if (this.isBackup) text = `${i18n.__('Delete Backup Text')}${text}`
    return text
  }

  renderDialogs (openSnackBar, navTo) {
    const showDetail = this.state.detail && this.select.state && this.select.state.selected &&
      this.state.entries && this.state.entries[this.select.state.selected[0]]
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <DownloadDialog
          apis={this.ctx.props.apis}
          open={!!this.state.onDownload}
          data={this.state.onDownload}
          onCancel={() => this.setState({ onDownload: null })}
          onConfirm={this.downloadFire}
        />

        <DialogOverlay open={!!this.state.createNewFolder} onRequestClose={() => this.toggleDialog('createNewFolder')}>
          { this.state.createNewFolder &&
          <NewFolderDialog
            onRequestClose={() => this.toggleDialog('createNewFolder')}
            apis={this.ctx.props.apis}
            path={this.state.path}
            entries={this.state.entries}
            openSnackBar={openSnackBar}
            refresh={this.refresh}
          /> }
        </DialogOverlay>

        <ConfirmDialog
          open={this.state.delete}
          onCancel={() => this.setState({ delete: false })}
          onConfirm={() => this.delete()}
          title={i18n.__('Confirm Delete Items Title')}
          text={() => this.deleteText()}
        />

        <DialogOverlay open={!!this.state.move} onRequestClose={() => this.toggleDialog('move')}>
          {
            this.state.move && (
              <MoveDialog
                onRequestClose={() => this.toggleDialog('move')}
                title={this.title}
                apis={this.ctx.props.apis}
                path={this.state.path}
                entries={this.state.entries}
                select={this.state.select}
                openSnackBar={openSnackBar}
                primaryColor={this.groupPrimaryColor()}
                refresh={this.refresh}
                navTo={navTo}
                type="move"
                operation="move"
              />
            )
          }
        </DialogOverlay>

        <DialogOverlay open={!!this.state.copy} onRequestClose={() => this.toggleDialog('copy')}>
          {
            this.state.copy && (
              <MoveDialog
                onRequestClose={() => this.toggleDialog('copy')}
                title={this.title}
                apis={this.ctx.props.apis}
                path={this.state.path}
                entries={this.state.entries}
                select={this.state.select}
                openSnackBar={openSnackBar}
                primaryColor={this.groupPrimaryColor()}
                refresh={this.refresh}
                navTo={navTo}
                type="copy"
                operation="copy"
              />
            )
          }
        </DialogOverlay>

        <ConfirmDialog
          open={!!this.state.openDeleteVersion}
          onCancel={() => this.setState({ openDeleteVersion: false })}
          onConfirm={() => this.deleteVersion(this.state.openDeleteVersion)}
          title={i18n.__('Confirm Delete Backup Version Title')}
          text={i18n.__('Confirm Delete Backup Version Text')}
        />

        <DialogOverlay open={!!showDetail} onRequestClose={() => this.toggleDialog('detail')}>
          {
            showDetail &&
            <FileDetail
              {...this.ctx.props}
              isUSB={this.isUSB}
              path={this.state.path}
              entries={this.state.entries}
              isSearch={!!this.state.showSearch}
              onRequestClose={() => this.toggleDialog('detail')}
              selected={this.select.state.selected}
            />
          }
        </DialogOverlay>

        <DialogOverlay open={!!this.state.rename} onRequestClose={() => this.toggleDialog('rename')}>
          { this.state.rename &&
            <RenameDialog
              apis={this.ctx.props.apis}
              path={this.state.path}
              entries={this.state.entries}
              select={this.state.select}
              openSnackBar={openSnackBar}
              refresh={this.refresh}
              onRequestClose={() => this.toggleDialog('rename')}
            /> }
        </DialogOverlay>

        <ConfirmDialog
          open={this.state.deleteDriveConfirm}
          onCancel={() => this.setState({ deleteDriveConfirm: false })}
          onConfirm={() => this.fireDeletePublic()}
          title={i18n.__('Confirm Delete Public Title')}
          text={i18n.__('Confirm Delete Public Text')}
        />
      </div>
    )
  }

  renderMenu ({ open }) {
    const itemSelected = this.state.select && this.state.select.selected && this.state.select.selected.length
    const multiSelected = this.state.select && this.state.select.selected && (this.state.select.selected.length > 1)
    const style = { height: 24, width: 24, color: 'rgba(0,0,0,.54)', marginTop: 8, paddingLeft: 8 }

    const commonAction = [
      <MenuItem
        key="Download"
        leftIcon={<DownloadIcon style={style} />}
        primaryText={i18n.__('Download')}
        onClick={this.download}
      />,
      <MenuItem
        key="delete"
        leftIcon={<DeleteIcon style={style} />}
        primaryText={i18n.__('Delete')}
        onClick={() => this.toggleDialog('delete')}
      />,
      <MenuItem
        key="Properties"
        leftIcon={<InfoIcon style={style} />}
        primaryText={i18n.__('Properties')}
        onClick={() => this.setState({ detail: true })}
      />
    ]

    if (this.isSearch && itemSelected && !multiSelected) {
      commonAction.unshift(<MenuItem
        key="OpenInFolder"
        leftIcon={<OpenInFolderIcon style={style} />}
        primaryText={i18n.__('Open In Folder')}
        onClick={() => this.openInFolder()}
      />)
    }

    return (
      <ContextMenu
        open={open}
        top={this.state.contextMenuY}
        left={this.state.contextMenuX}
        onRequestClose={this.hideContextMenu}
      >
        {
          (this.isBackup || this.isSearch) ? commonAction
            : !itemSelected
              ? (
                <div>
                  <MenuItem
                    primaryText={i18n.__('Create New Folder')}
                    leftIcon={<NewFolderIcon style={style} />}
                    onClick={() => this.toggleDialog('createNewFolder')}
                  />
                  <div style={{ height: 8 }} />
                  <Divider />
                  <div style={{ height: 8 }} />

                  <MenuItem
                    primaryText={i18n.__('Upload Folder')}
                    leftIcon={<UploadFold style={style} />}
                    onClick={() => this.upload('directory')}
                  />
                  <MenuItem
                    primaryText={i18n.__('Upload File')}
                    leftIcon={<UploadFile style={style} />}
                    onClick={() => this.upload('file')}
                  />
                </div>
              )
              : (
                <div>
                  <div>
                    {
                      !this.isPublic &&
                      <MenuItem
                        leftIcon={<ShareIcon style={style} />}
                        primaryText={i18n.__('Share to Public')}
                        onClick={this.shareToAll}
                      />
                    }
                    <MenuItem
                      leftIcon={<CopyIcon style={style} />}
                      primaryText={i18n.__('Copy to')}
                      onClick={() => this.toggleDialog('copy')}
                    />
                    <MenuItem
                      leftIcon={<MoveIcon style={style} />}
                      primaryText={i18n.__('Move to')}
                      onClick={() => this.toggleDialog('move')}
                    />
                  </div>
                  {
                    !multiSelected &&
                    <MenuItem
                      leftIcon={<EditIcon style={style} />}
                      primaryText={i18n.__('Rename')}
                      onClick={() => this.toggleDialog('rename')}
                    />
                  }
                  <div style={{ height: 8 }} />
                  <Divider />
                  <div style={{ height: 8 }} />
                  { commonAction }
                </div>
              )
        }
      </ContextMenu>
    )
  }

  renderContent ({ openSnackBar, navTo, pin }) {
    this.pin = pin
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }} key={this.type}>
        <FileContent
          {...this.state}
          isMedia={this.isSearch}
          isSearch={this.isSearch}
          pin={pin}
          apis={this.ctx.props.apis}
          showUsers={this.ctx.props.showUsers}
          clearFakeOpen={this.clearFakeOpen}
          listNavBySelect={this.listNavBySelect}
          showContextMenu={this.showContextMenu}
          ipcRenderer={ipcRenderer}
          download={this.download}
          downloadBackup={this.downloadBackup}
          onDeleteVersion={this.onDeleteVersion}
          primaryColor={this.groupPrimaryColor()}
          changeSortType={this.changeSortType}
          openSnackBar={openSnackBar}
          toggleDialog={this.toggleDialog}
          showTakenTime={!!this.state.takenTime}
          refresh={this.refresh}
          resetScrollTo={this.resetScrollTo}
          rowDragStart={this.rowDragStart}
          gridDragStart={this.gridDragStart}
          setScrollTop={this.setScrollTop}
          setGridData={this.setGridData}
          onPaste={this.onPaste}
          onCopy={this.onCopy}
          onCut={this.onCut}
          inPublicRoot={this.hasRoot && !this.phyDrive}
          addBackupDir={this.addBackupDir}
          isBackup={this.isBackup}
          currentDrive={this.currentDrive}
        />

        { this.renderMenu({ open: this.state.contextMenuOpen }) }

        { this.renderDialogs(openSnackBar, navTo) }
      </div>
    )
  }
}

export default Home
