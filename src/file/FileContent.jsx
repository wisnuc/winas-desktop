import React from 'react'
import i18n from 'i18n'
import EventListener from 'react-event-listener'
import ErrorIcon from 'material-ui/svg-icons/alert/error'
import ContainerOverlay from './ContainerOverlay'
import SingleView from './SingleView'
import RenderListByRow from './RenderListByRow'
import GridView from './GridView'
import CircularLoading from '../common/CircularLoading'

/* Draw Select Box */
const TOP = 114
const LEFT = 88
const LEFTPIN = 224

class FileContent extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      seqIndex: -1,
      loading: false,
      preview: false
    }

    this.data = {}

    this.download = () => {
      this.setState({ preview: false }, () => this.props.download())
    }

    /* cathc key action */
    this.keyDown = (e) => {
      const { createNewFolder, loading, newDrive, select, showUsers } = this.props
      const isModifyName = select && select.modify !== -1
      if (createNewFolder || this.props.delete || loading || newDrive || isModifyName || !select || showUsers) return
      if (e.ctrlKey && e.key === 'a') {
        select.addByArray(Array.from({ length: this.props.entries.length }, (v, i) => i)) // [0, 1, ..., N]
      }
      if (e.ctrlKey && e.key === 'v') this.props.onPaste()
      const isSelected = select && Array.isArray(select.selected) && select.selected.length > 0
      if (isSelected) {
        if (e.key === 'Delete') this.props.toggleDialog('delete')
        if (e.ctrlKey && e.key === 'c') this.props.onCopy()
        if (e.ctrlKey && e.key === 'x') this.props.onCut()
      }
      select.keyEvent(e.ctrlKey, e.shiftKey)
    }

    this.keyUp = (e) => {
      const { createNewFolder, loading, newDrive, select, showUsers } = this.props
      const isModifyName = select && select.modify !== -1
      if (createNewFolder || this.props.delete || loading || newDrive || isModifyName || !select || showUsers) return
      select.keyEvent(e.ctrlKey, e.shiftKey)
    }

    this.handleResize = () => this.forceUpdate()

    /* left click file */
    this.onRowClick = (e, index, fakeCtrl) => {
      e.preventDefault() // important, to prevent other event
      e.stopPropagation()

      /* disabled in select box mode */
      if (this.selectBox) return

      // if (this.props.entries[index] && this.props.entries[index].type !== 'file') return

      if (fakeCtrl) this.props.select.ctrlLeftClick(index)
      else this.props.select.touchTap(0, index)
      this.props.resetScrollTo()
    }

    /* right click */
    this.onRowContextMenu = (e, index) => {
      e.preventDefault() // important, to prevent other event
      e.stopPropagation()

      this.props.select.touchTap(2, index)
      this.props.resetScrollTo()

      this.props.showContextMenu(e.nativeEvent.clientX, e.nativeEvent.clientY)
    }

    this.onRowDoubleClick = (e, index) => {
      if (index === -1) return
      const entry = this.props.entries[index]
      this.props.listNavBySelect(entry)
      if (entry.type === 'file') {
        this.setState({ seqIndex: index, preview: true })
      } else {
        this.setState({ loading: true })
      }
    }

    this.onRowMouseEnter = (e, index) => {
      this.props.select.mouseEnter(index)
    }

    this.onRowMouseLeave = (e, index) => {
      this.deferredLeave = setImmediate(() => this.props.select.mouseLeave(index))
    }

    /* handle files */
    this.drop = (e) => {
      if (this.props.isMedia || this.props.showSearch) return
      const files = [...e.dataTransfer.files].map(f => f.path)
      const isPhy = this.props.path[0].isPhy || this.props.path[0].isPhyRoot
      const dir = this.props.path
      const dirUUID = isPhy ? dir.filter(v => v.type === 'directory').map(p => p.name).join('/') : dir[dir.length - 1].uuid
      const driveUUID = isPhy ? dir.slice(-1)[0].id : dir[0].uuid
      if ((!dirUUID && dirUUID !== '') || !driveUUID) {
        this.props.openSnackBar(i18n.__('No Drag File Warning'))
      } else {
        this.props.ipcRenderer.send('DRAG_FILE', { files, dirUUID, driveUUID, domain: isPhy ? 'phy' : 'drive' })
      }
    }

    /* selectBox
     * if mode === row
     *   selectStart -> selectRow -> drawBox && calcRow -> selectEnd
     *               -> onScroll ->        calcRow      ->
     *
     * if mode === grid
     *   selectStart -> selectGrid -> drawBox && calcGrid -> selectEnd
     *               -> onScroll ->        calcGrid       ->
     */

    this.selectBox = null

    this.selectStart = (event, scrollTop) => {
      /* disabled in public root */
      if (this.props.inPublicRoot) return

      if (event.nativeEvent.button !== 0) return
      if (this.selectBox) {
        this.selectEnd(event)
      } else {
        /* when click scroll bar, don't draw select box */
        const w = event.target.style.width
        if (w && w !== '100%' && parseInt(w, 10) > 200 && event.clientX - 56 > parseInt(w, 10)) return

        /* show draw box */
        const s = this.refSelectBox.style
        s.display = ''
        s.top = `${event.clientY - TOP}px`
        s.left = `${event.clientX - (this.props.pin ? LEFTPIN : LEFT)}px`
        this.selectBox = { x: event.clientX, y: event.clientY, session: (new Date()).getTime() }
        this.preScrollTop = scrollTop || this.preScrollTop
        document.addEventListener('mousemove', this.exSelect)
        document.addEventListener('mouseup', this.selectEnd, true)
      }
    }

    this.selectEnd = (event) => {
      document.removeEventListener('mousemove', this.exSelect)
      document.removeEventListener('mouseup', this.selectEnd, true)

      if (!this.selectBox) return

      const s = this.refSelectBox.style
      s.display = 'none'
      s.top = '0px'
      s.left = '0px'
      s.width = '0px'
      s.height = '0px'
      this.selectBox = null
      this.preScrollTop = 0
      // this.scrollTop = 0
    }

    /* draw select box */
    this.drawBox = (event) => {
      const s = this.refSelectBox.style
      const dx = event.clientX - this.selectBox.x
      const dy = event.clientY - this.selectBox.y
      if (dy < 0) this.up = true
      else this.up = false

      const L = this.props.pin ? LEFTPIN : LEFT
      if (dx > 0) {
        s.width = `${dx}px`
        s.left = `${this.selectBox.x - L}px`
      } else if (event.clientX - L > 0) {
        s.width = `${-dx}px`
        s.left = `${event.clientX - L}px`
      } else {
        s.width = `${this.selectBox.x - L}px`
        s.left = '0px'
      }

      if (dy > 0) {
        s.height = `${dy}px`
        s.top = `${this.selectBox.y - TOP}px`
      } else if (event.clientY - TOP > 48) {
        s.height = `${-dy}px`
        s.top = `${event.clientY - TOP}px`
      } else {
        s.height = `${this.selectBox.y - TOP - 48}px`
        s.top = '48px'
      }
    }

    this.onScroll = (scrollTop) => {
      this.props.setScrollTop(scrollTop)
      this.scrollTop = scrollTop
      if (!this.selectBox) return
      const s = this.refSelectBox.style
      const dy = scrollTop - this.preScrollTop
      this.preScrollTop = scrollTop

      if (this.up) {
        s.height = `${parseInt(s.height, 10) - dy}px`
      } else {
        s.top = `${parseInt(s.top, 10) - dy}px`
        s.height = `${parseInt(s.height, 10) + dy}px`
      }

      this.selectBox.y -= dy

      if (this.props.gridView) this.calcGrid(Object.assign(this.data, { scrollTop }))
      else this.calcRow(scrollTop)
    }

    /* calc rows should be selected */
    this.calcRow = (scrollTop) => {
      const s = this.refSelectBox.style
      const lineHeight = 48
      const length = this.props.entries.length

      const array = Array
        .from({ length }, (v, i) => i)
        .filter((v, i) => {
          const head = (i + 1) * lineHeight - scrollTop // row.tail > top && row.head < top + height
          return ((parseInt(s.top, 10) < head + lineHeight) &&
            (head < parseInt(s.top, 10) + parseInt(s.height, 10)))
        })

      this.props.select.addByArray(array, this.selectBox.session)
    }

    this.selectRow = (event, scrollTop) => {
      if (!this.selectBox) return
      this.scrollTop = scrollTop || this.scrollTop || 0
      this.preScrollTop = this.scrollTop
      this.drawBox(event)
      this.calcRow(this.scrollTop)
    }

    /* calc rows should be selected */
    this.calcGrid = (data) => {
      if (!data) return
      const { scrollTop, allHeight, mapData, indexHeightSum } = data
      const s = this.refSelectBox.style
      const top = parseInt(s.top, 10)
      const height = parseInt(s.height, 10)
      const left = parseInt(s.left, 10)
      const width = parseInt(s.width, 10)
      const length = this.props.entries.length

      const array = Array
        .from({ length }, (v, i) => i)
        .filter((v, i) => {
          if (!mapData) return false
          const lineNum = mapData[i]
          const lineHeight = allHeight[lineNum] // 112, 64, 248, 200
          const head = (lineNum > 0 ? indexHeightSum[lineNum - 1] + ((lineHeight === 248) && 48) : 48) + 24 - scrollTop
          const tail = head + (lineHeight < 200 ? 48 : 184)
          if (!(tail > top) || !(head < top + height)) return false
          const start = (i - mapData.findIndex(va => va === lineNum)) * 200 + 48
          const end = start + 180
          /* grid.tail > top && grid.head < top + height && grid.end > left && grid.start < left + width */
          return ((end > left) && (start < left + width))
        })
      this.props.select.addByArray(array, this.selectBox.session)
    }

    this.selectGrid = (event, data) => {
      if (!this.selectBox) return
      this.data = data || this.data
      const { scrollTop } = this.data
      this.preScrollTop = scrollTop
      this.drawBox(event)
      this.calcGrid(this.data)
    }

    this.exSelect = e => (this.props.gridView ? this.selectGrid(e, this.data) : this.selectRow(e, this.scrollTop))
  }

  componentDidMount () {
    /* bind keydown event */
    document.addEventListener('keydown', this.keyDown)
    document.addEventListener('keyup', this.keyUp)
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.loading) {
      this.setState({ loading: true })
      this.scrollTop = 0
    }
    if (nextProps.entries && this.props.entries !== nextProps.entries) this.setState({ loading: false })
    if (nextProps.fakeOpen) {
      const index = nextProps.fakeOpen.index
      this.props.clearFakeOpen()
      this.onRowDoubleClick(null, index)
    }
  }

  componentWillUnmount () {
    /* remove keydown event */
    document.removeEventListener('keydown', this.keyDown)
    document.removeEventListener('keyup', this.keyUp)
  }

  renderNoFile () {
    return (
      <div
        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onContextMenu={e => this.onRowContextMenu(e, -1)}
        onDrop={this.drop}
      >
        <img
          width={320}
          height={180}
          src="./assets/images/pic_nofile.png"
        />
      </div>
    )
  }

  renderOffLine () {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} >
        <div
          style={{
            width: 360,
            height: 360,
            borderRadius: '180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            backgroundColor: '#FAFAFA'
          }}
        >
          <ErrorIcon style={{ height: 64, width: 64, color: 'rgba(0,0,0,0.27)' }} />
          <div style={{ fontSize: 20, color: 'rgba(0,0,0,0.27)' }}> { i18n.__('Offline Text') } </div>
        </div>
      </div>
    )
  }

  renderLoading () {
    return (
      <div style={{ width: '100%', height: 'calc(100% - 70px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} >
        <CircularLoading />
      </div>
    )
  }

  render () {
    /* loading */
    if (this.state.loading) return this.renderLoading()

    /* not get list yet */
    if (!this.props.path || !this.props.path.length || !this.props.select) return (<div />)

    /* dir is empty */
    if (this.props.entries && !this.props.entries.length) return this.renderNoFile()

    /* lost connection to wisnuc */
    if (!window.navigator.onLine) return this.renderOffLine()

    const isPhoto = this.state.seqIndex > -1 && this.props.entries && this.props.entries[this.state.seqIndex] &&
      this.props.entries[this.state.seqIndex].metadata &&
      ['JPEG', 'PNG', 'JPG', 'GIF', 'BMP', 'RAW'].includes(this.props.entries[this.state.seqIndex].metadata.type)

    /* got list */
    return (
      <div style={{ width: '100%', height: '100%', position: 'relatvie', backgroundColor: '#f8f9fa' }} >
        <EventListener target="window" onResize={this.handleResize} />
        {/* render list */}
        {
          this.props.gridView || this.props.inRoot
            ? <GridView
              {...this.props}
              onRowClick={this.onRowClick}
              onRowContextMenu={this.onRowContextMenu}
              onRowMouseEnter={this.onRowMouseEnter}
              onRowMouseLeave={this.onRowMouseLeave}
              onRowDoubleClick={this.onRowDoubleClick}
              selectStart={this.selectStart}
              selectGrid={this.selectGrid}
              gridDragStart={this.props.gridDragStart}
              setGridData={this.props.setGridData}
              onScroll={this.onScroll}
              drop={this.drop}
            />
            : <RenderListByRow
              {...this.props}
              onRowClick={this.onRowClick}
              onRowContextMenu={this.onRowContextMenu}
              onRowMouseEnter={this.onRowMouseEnter}
              onRowMouseLeave={this.onRowMouseLeave}
              onRowDoubleClick={this.onRowDoubleClick}
              selectStart={this.selectStart}
              selectRow={this.selectRow}
              rowDragStart={this.props.rowDragStart}
              onScroll={this.onScroll}
              drop={this.drop}
            />
        }

        {/* preview picture */}
        {
          this.state.seqIndex > -1 && isPhoto &&
            <ContainerOverlay
              onRequestClose={() => this.setState({ preview: false })}
              isMedia={this.props.isMedia || this.props.showSearch}
              open={this.state.preview}
              items={this.props.entries}
              seqIndex={this.state.seqIndex}
              ipcRenderer={this.props.ipcRenderer}
              memoize={this.props.memoize}
              download={this.download}
              path={this.props.path}
              select={this.props.select.touchTap}
              apis={this.props.apis}
            />
        }

        {/* preview other files */}
        {
          this.state.seqIndex > -1 && !isPhoto &&
            <SingleView
              onRequestClose={() => this.setState({ preview: false })}
              isMedia={this.props.isMedia || this.props.showSearch}
              open={this.state.preview}
              items={this.props.entries}
              seqIndex={this.state.seqIndex}
              ipcRenderer={this.props.ipcRenderer}
              memoize={this.props.memoize}
              download={this.download}
              path={this.props.path}
              select={this.props.select.touchTap}
              apis={this.props.apis}
            />
        }

        {/* selection box */}
        <div
          role="presentation"
          ref={ref => (this.refSelectBox = ref)}
          onMouseDown={e => this.selectStart(e)}
          onMouseMove={e => (this.props.gridView ? this.selectGrid(e, this.data) : this.selectRow(e, this.scrollTop))}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            display: 'none',
            backgroundColor: 'rgba(0, 137, 123, 0.26)',
            border: `1px ${this.props.primaryColor} dashed`
          }}
        />
      </div>
    )
  }
}

export default FileContent
