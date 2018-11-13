import i18n from 'i18n'
import React from 'react'
import Promise from 'bluebird'
import { ipcRenderer } from 'electron'
import { Divider } from 'material-ui'

import Base from './Base'
import DownloadDialog from '../file/DownloadDialog'
import FileDetail from '../file/FileDetail'
import ListSelect from '../file/ListSelect'
import FileContent from '../file/FileContent'
import NewFolderDialog from '../file/NewFolderDialog'
import ContextMenu from '../common/ContextMenu'
import DialogOverlay from '../common/PureDialog'
import MenuItem from '../common/MenuItem'
import sortByType from '../common/sort'
import { BreadCrumbItem, BreadCrumbSeparator } from '../common/BreadCrumb'
import { BackwardIcon, RefreshAltIcon, DeleteIcon, MoreIcon, ListIcon, GridIcon, InfoIcon, ArrowIcon, FolderIcon, FolderOutlineIcon, AddIcon } from '../common/Svg'
import renderFileIcon from '../common/renderFileIcon'
import { xcopyMsg } from '../common/msg'
import History from '../common/history'
import { SIButton, LIButton, ActButton } from '../common/Buttons'
import ConfirmDialog from '../common/ConfirmDialog'

/* increase limit of listeners of EventEmitter */
ipcRenderer.setMaxListeners(1000)

/* Drag Item's Coordinate */
const DRAGTOP = 270

class Home extends Base {
  constructor (ctx) {
    super(ctx)

    this.type = 'home'
    this.title = () => i18n.__('Home Title')
    /* handle select TODO */
    this.select = new ListSelect(this)
    this.select.on('updated', next => this.setState({ select: next }))

    this.state = {
      isMedia: false,
      gridView: false, // false: list, true: grid
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
      this.setState({ onDownload: { selected, entries, path } })
    }

    this.downloadFire = ({ selected, entries, path, downloadPath }) => {
      if (this.state.showSearch) { // search result
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
          if (res !== 'Finished') this.ctx.setState({ showTasks: true })
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
      this.ctx.props.apis.pureRequest('copy', args, (err, res) => this.finish(err, res, pos.action))
    }

    this.rename = () => {
      this.state.select.setModify(this.state.select.selected[0])
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

      const op = []
      for (let i = 0; i < selected.length; i++) {
        const entryName = entries[selected[i]].name
        const entryUUID = entries[selected[i]].uuid
        op.push({ driveUUID, dirUUID, entryName, entryUUID })
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
      if (entry.type === 'directory') {
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

    /* op: scrollTo file */
    this.refresh = (op) => {
      if (!this.state.path) return
      const rUUID = this.state.path[0] && this.state.path[0].uuid
      const dUUID = this.state.path[0] && this.state.path[this.state.path.length - 1].uuid
      if (!rUUID || !dUUID) {
        this.setState({ loading: true, showSearch: false })
        const drives = this.ctx.props.apis && this.ctx.props.apis.drives && this.ctx.props.apis.drives.data
        const drive = drives.find(d => d.tag === 'built-in')
        this.ctx.props.apis.request('listNavDir', { driveUUID: drive.uuid, dirUUID: drive.uuid })
      } else {
        this.ctx.props.apis.request('listNavDir', { driveUUID: rUUID, dirUUID: dUUID })
      }
      this.resetScrollTo()

      if (op) this.setState({ scrollTo: op.fileName || op.uuid, loading: !op.noloading }) // fileName for files, uuid for drives
      else this.setState({ loading: true, showSearch: false })
    }

    this.resetScrollTo = () => Object.assign(this.state, { scrollTo: null })

    this.showContextMenu = (clientX, clientY) => {
      const selected = this.state.select && this.state.select.selected
      /* in public root */
      if (this.state.inRoot && selected && selected.length !== 1) return
      /* in phyDrive root */
      if (this.hasRoot && !this.phyDrive && selected && selected.length !== 1) return

      if (this.select.state.ctrl || this.select.state.shift) return
      const containerDom = document.getElementById('content-container')
      const maxLeft = containerDom.offsetLeft + containerDom.clientWidth + 80
      const x = clientX > maxLeft ? maxLeft : clientX
      /* calc positon of menu using height of menu which is related to number of selected items */
      const length = (this.select.state && this.select.state.selected && this.select.state.selected.length) || 0
      let itemNum = 7
      if (this.isMedia || this.state.showSearch) {
        if (!length) itemNum = 3
        else if (length === 1) itemNum = 8
        else itemNum = 5
      } else if (length > 1) itemNum = 5
      else itemNum = 7

      const maxTop = containerDom.offsetTop + containerDom.offsetHeight - itemNum * 30 + 90
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
        // contextMenuX: -1,
        // contextMenuY: -1,
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
      const { mapData, indexHeightSum, scrollTop } = gridData
      const lineNum = mapData[index]
      const top = indexHeightSum[lineNum] + 104 - scrollTop
      const left = (index - mapData.findIndex(i => i === lineNum)) * 200 + 123
      return ({ top, left })
    }

    /* drag row */
    this.dragRow = (e) => {
      const s = this.refDragedItems.style
      if (!this.state.select.selected.includes(this.RDSI)) {
        if (this.RDSI > -1) this.state.select.addByArray([this.RDSI], (new Date()).getTime())
      } else if (s.display !== 'flex') {
        s.display = 'flex'
      } else {
        s.width = '108px'
        s.opacity = 1

        const RDTop = `${this.RDSI * 40 + DRAGTOP - (this.scrollTop || 0)}px`
        if (!s.top || s.top === RDTop) s.top = `${e.clientY + 2}px`
        else s.marginTop = `${e.clientY + 2 - parseInt(s.top, 10)}px`

        if (!s.left) s.left = `${e.clientX + 2}px`
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
        const dstDir = this.isUSB ? (dir ? [dir, dstEntry.name].join('/') : dstEntry.name) : dstEntry.uuid

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
      s.transition = 'all 225ms cubic-bezier(.4,0,1,1)'

      if (this.state.gridView) {
        const { top, left } = this.getPosition(this.gridData, this.RDSI)
        s.top = `${top}px`
        s.left = `${left}px`
        s.width = '108px'
      } else {
        s.top = `${this.RDSI * 40 + DRAGTOP - (this.scrollTop || 0)}px`
        s.width = '108px'
      }
      s.marginTop = '0px'
      s.marginLeft = '0px'
      s.opacity = 0

      this.RDSI = -1
      this.state.select.toggleDrag([])

      setTimeout(() => {
        s.display = 'none'
        s.transition = 'all 225ms cubic-bezier(.4,0,1,1)'
        s.transitionProperty = 'top, left, width, opacity'
      }, shouldFire || dropHeader ? 0 : 225)
    }

    this.rowDragStart = (event, index) => {
      /* only left click */
      if (event.nativeEvent.button !== 0) return
      /* not public */
      if (this.state.entries[index].type === 'public') return
      this.RDSI = index // rowDragStartIndex
      const selected = this.state.select.selected
      this.state.select.toggleDrag(selected.includes(this.RDSI) ? selected : [this.RDSI])

      /* show drag item */
      this.refDragedItems.style.top = `${this.RDSI * 40 + DRAGTOP - (this.scrollTop || 0)}px`
      this.refDragedItems.style.left = `${event.clientX}px`

      document.addEventListener('mousemove', this.dragRow)
      document.addEventListener('mouseup', this.dragEnd, true)
    }

    /* drag item in GridView */
    this.dragGrid = (e) => {
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
      this.refDragedItems.style.width = '108px'

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
      this.setState({ loading: true, showSearch: false })
    } else this.refresh()
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

  search (name) {
    if (!name) return
    const select = this.select.reset(this.state.entries.length)
    this.setState({ showSearch: name, loading: true, select })
    const types = this.types // photo, docs, video, audio
    const apis = this.ctx.props.apis
    const drives = apis && apis.drives && apis.drives.data
    if (!Array.isArray(drives)) {
      this.ctx.props.openSnackBar(i18n.__('Search Failed'))
      return
    }
    const places = types ? drives.map(d => d.uuid).join('.') // media
      : this.isPublic ? drives.filter(d => d.type === 'public').map(d => d.uuid).join('.') // public
        : drives.find(d => d.type === 'private').uuid // home
    const order = types ? 'newest' : 'find'

    this.ctx.props.apis.pureRequest('search', { name, places, order }, (err, res) => {
      if (err || !res || !Array.isArray(res)) this.setState({ error: true, loading: false })
      else {
        const pdrives = places.split('.')
        let entries = res.map(l => Object.assign({ pdrv: pdrives[l.place] }, l))
        if (types) entries = entries.filter(e => e.hash).map(e => Object.assign({ type: 'file' }, e))
        this.setState({
          loading: false,
          entries: entries.sort((a, b) => sortByType(a, b, this.state.sortType))
        })
      }
    })
  }

  clearSearch () {
    this.setState({ showSearch: false })
    this.refresh()
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
          left: 0,
          marginLeft: 0,
          opacity: 0,
          width: 108,
          height: 108,
          transition: 'all 225ms cubic-bezier(.4,0,1,1)',
          transitionProperty: 'top, left, width, opacity',
          display: 'none',
          alignItems: 'center',
          backgroundColor: '#FFF',
          boxShadow: '0 0 20px 0 rgba(23, 99, 207, 0.1)'
        }}
      >
        {/* file type may be: folder, public, directory, file, unsupported */}
        <div style={{ width: 108, height: 108 }} className="flexCenter">
          {
            this.entry.type === 'directory'
              ? <FolderIcon style={{ width: 64, height: 64 }} />
              : this.entry.type === 'file'
                ? renderFileIcon(this.entry.name, this.entry.metadata, 64)
                : <div />
          }
        </div>
        {/*
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
        */}
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
                backgroundColor: this.shouldFire() || this.dropHeader() ? '#31a0f5' : '#e63939',
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
        if (node.type === 'publicRoot') { // public drives
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
      <div style={Object.assign({}, style, { marginLeft: 24 })}>
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
            else acc.push(<BreadCrumbItem text={node.name || i18n.__('Built-in Drive')} key={`Item${index}`} {...funcs} last={last} />)

            return acc
          }, [])
        }
      </div>
    )
  }

  renderTitle ({ style }) {
    const breadCrumbStyle = { height: 40, fontSize: 18, color: 'rgba(0,0,0,.54)', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }
    return (
      <div style={style}>
        <div style={{ width: 28 }} />
        <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
        </div>
      </div>
    )
  }

  renderToolBar ({ style, openDetail }) {
    const color = 'rgba(0,0,0,.54)'
    const { curr, queue } = this.history.get()
    const noBack = curr < 1
    const noForward = curr > queue.length - 2
    const { select } = this.state
    const itemSelected = select && select.selected && select.selected.length

    const iconStyle = disabled => ({ color: disabled ? 'rgba(0,0,0,.54)' : color, width: 24, height: 24 })
    const inRoot = this.state.inRoot || (this.hasRoot && !this.phyDrive)
    const breadCrumbStyle = { height: 40, fontSize: 18, color: 'rgba(0,0,0,.54)', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }
    return (
      <div style={style}>
        {/*
        <LIButton onClick={this.back} tooltip={i18n.__('Backward')} disabled={noBack} style={{ marginLeft: -8 }}>
          <BackwardIcon color={color} />
        </LIButton>
        <div style={{ width: 8 }} />
        <LIButton
          onClick={this.forward}
          tooltip={i18n.__('Forward')}
          disabled={noForward}
          iconStyle={{ transform: 'rotate(180deg)' }}
        >
          <BackwardIcon color={color} />
        </LIButton>
        */}
        {
          !this.state.showSearch ? this.renderBreadCrumbItem({ style: breadCrumbStyle })
            : (
              <div
                style={{
                  fontSize: 18,
                  height: 32,
                  marginLeft: 24,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                { i18n.__('Search Result of %s', this.state.showSearch) }
              </div>
            )
        }
        <div style={{ flexGrow: 1 }} />
        <LIButton onClick={() => this.refresh()} tooltip={i18n.__('Refresh')} >
          <RefreshAltIcon color={color} />
        </LIButton>

        {
          !!itemSelected &&
            <LIButton onClick={() => this.toggleDialog('delete')} tooltip={i18n.__('Delete')} >
              <DeleteIcon />
            </LIButton>
        }

        <LIButton onClick={() => {}} tooltip={i18n.__('More')} >
          <MoreIcon />
        </LIButton>

        <LIButton
          onClick={() => this.toggleDialog('gridView')}
          tooltip={this.state.gridView ? i18n.__('List View') : i18n.__('Grid View')}
          disabled={inRoot}
        >
          {
            this.state.gridView
              ? <ListIcon style={iconStyle(inRoot)} />
              : <GridIcon style={iconStyle(inRoot)} />
          }
        </LIButton>

        <LIButton onClick={openDetail} tooltip={i18n.__('Info')} >
          <InfoIcon />
        </LIButton>
        <div style={{ width: 8 }} />
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
    let text = ''
    const entries = this.state.entries
    const selected = this.state.select.selected
    if (!entries || !Array.isArray(selected) || !selected.length) return ''
    const isMultiple = selected.length > 1
    const isFile = entries[selected[0]].type === 'file'
    switch (this.type) {
      case 'photos':
        text = i18n.__('Delete Photos Text')
        break
      case 'music':
        text = i18n.__('Delete Music Text')
        break
      case 'docs':
        text = i18n.__('Delete Docs Text')
        break
      case 'videos':
        text = i18n.__('Delete Videos Text')
        break
      default:
        text = isMultiple ? i18n.__('Delete Items Text %s', selected.length)
          : isFile ? i18n.__('Delete File Text') : i18n.__('Delete Folder Text')
        break
    }
    return text
  }

  renderDialogs (openSnackBar, navTo) {
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

  renderMenu ({ open, openDetail }) {
    const itemSelected = this.state.select && this.state.select.selected && this.state.select.selected.length
    const multiSelected = this.state.select && this.state.select.selected && (this.state.select.selected.length > 1)

    const apis = this.ctx.props.apis
    const isAdmin = apis && apis.account && apis.account.data && apis.account.data.isFirstUser

    const pos = this.ctx.props.clipboard.get()
    const pastable = pos && pos.action
    return (
      <ContextMenu
        open={open}
        top={this.state.contextMenuY}
        left={this.state.contextMenuX}
        onRequestClose={this.hideContextMenu}
      >
        {
          this.hasRoot && !this.phyDrive && !this.state.showSearch
            ? (
              <div>
                <MenuItem
                  primaryText={i18n.__('Open')}
                  onClick={() => this.fakeOpen()}
                />
                <MenuItem
                  primaryText={i18n.__('Properties')}
                  onClick={() => this.setState({ detail: true })}
                />
              </div>
            )
            : this.state.inRoot && !this.state.showSearch
              ? (
                <div>
                  <MenuItem
                    primaryText={i18n.__('Modify')}
                    onClick={this.modifyPublic}
                    disabled={!isAdmin}
                  />
                  <MenuItem
                    primaryText={i18n.__('Delete')}
                    onClick={this.deletePublic}
                    disabled={(itemSelected && !multiSelected && this.state.select.selected[0] === 0) || !isAdmin}
                  />
                  <MenuItem
                    primaryText={i18n.__('Properties')}
                    onClick={() => this.setState({ detail: true })}
                  />
                </div>
              ) : !itemSelected ? (
                <div>
                  { !this.isMedia &&
                  <div>
                    <MenuItem
                      primaryText={i18n.__('Upload File')}
                      onClick={() => this.upload('file')}
                      disabled={this.isMedia}
                    />
                    <MenuItem
                      primaryText={i18n.__('Upload Folder')}
                      onClick={() => this.upload('directory')}
                      disabled={this.isMedia}
                    />
                    <MenuItem
                      primaryText={i18n.__('Create New Folder')}
                      onClick={() => this.toggleDialog('createNewFolder')}
                      disabled={this.isMedia}
                    />
                    {
                      !this.state.showSearch &&
                      <MenuItem
                        primaryText={i18n.__('Paste')}
                        disabled={!pastable}
                        onClick={this.onPaste}
                      />
                    }
                    <Divider style={{ marginLeft: 10, marginTop: 2, marginBottom: 2, width: 'calc(100% - 20px)' }} />
                  </div>
                  }
                  <MenuItem
                    primaryText={i18n.__('Toggle View Mode')}
                    onClick={() => this.toggleDialog('gridView')}
                  />
                  <MenuItem
                    primaryText={i18n.__('Refresh')}
                    onClick={() => this.refresh()}
                  />
                  <MenuItem
                    primaryText={i18n.__('Sort')}
                    onClick={(e) => { e.stopPropagation(); e.preventDefault() }}
                    rightIcon={
                      <ArrowIcon
                        style={{
                          position: 'absolute',
                          color: '#505259',
                          marginTop: 5,
                          right: -16,
                          transform: 'rotate(270deg)'
                        }}
                      />
                    }
                    menuItems={[
                      <MenuItem
                        style={{ marginTop: -8 }}
                        primaryText={i18n.__('Name')}
                        onClick={() => this.changeSortType('nameUp')}
                      />,
                      <MenuItem
                        primaryText={i18n.__('Date Modified')}
                        onClick={() => this.changeSortType('timeUp')}
                      />,
                      <MenuItem
                        style={{ marginBottom: -8 }}
                        primaryText={i18n.__('Size')}
                        onClick={() => this.changeSortType('sizeUp')}
                      />
                    ]}
                  />
                </div>
              ) : (
                <div>
                  {
                    !multiSelected &&
                    <MenuItem
                      primaryText={i18n.__('Open')}
                      onClick={() => this.fakeOpen()}
                    />
                  }
                  {
                    !multiSelected && (this.state.showSearch || this.isMedia) &&
                    <MenuItem
                      primaryText={i18n.__('Open In Folder')}
                      onClick={() => this.openInFolder()}
                    />
                  }
                  <MenuItem
                    primaryText={i18n.__('Download')}
                    onClick={this.download}
                  />
                  <Divider style={{ marginLeft: 10, marginTop: 2, marginBottom: 2, width: 'calc(100% - 20px)' }} />
                  <MenuItem
                    primaryText={i18n.__('Copy')}
                    onClick={this.onCopy}
                  />
                  <MenuItem
                    primaryText={i18n.__('Cut')}
                    onClick={this.onCut}
                  />
                  {
                    !multiSelected &&
                    <MenuItem
                      primaryText={i18n.__('Rename')}
                      onClick={this.rename}
                    />
                  }
                  <MenuItem
                    primaryText={i18n.__('Delete')}
                    onClick={() => this.toggleDialog('delete')}
                  />
                  <Divider style={{ marginLeft: 10, marginTop: 2, marginBottom: 2, width: 'calc(100% - 20px)' }} />
                  <MenuItem
                    primaryText={i18n.__('Properties')}
                    onClick={openDetail}
                  />
                </div>
              )
        }
      </ContextMenu>
    )
  }

  renderDetail ({ onClose }) {
    return (
      <FileDetail
        {...this.ctx.props}
        isUSB={this.isUSB}
        path={this.state.path}
        entries={this.state.entries}
        isSearch={!!this.state.showSearch}
        onRequestClose={() => onClose()}
        selected={this.select.state.selected}
      />
    )
  }

  renderContent ({ openSnackBar, navTo, pin, openDetail }) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <FileContent
          {...this.state}
          pin={pin}
          apis={this.ctx.props.apis}
          showUsers={this.ctx.props.showUsers}
          clearFakeOpen={this.clearFakeOpen}
          listNavBySelect={this.listNavBySelect}
          showContextMenu={this.showContextMenu}
          ipcRenderer={ipcRenderer}
          download={this.download}
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
        />

        { this.renderMenu({ open: this.state.contextMenuOpen, openDetail }) }

        { this.renderDialogs(openSnackBar, navTo) }
      </div>
    )
  }
}

export default Home
