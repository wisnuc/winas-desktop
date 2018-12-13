import React from 'react'
import i18n from 'i18n'
import prettysize from 'prettysize'
import { AutoSizer } from 'react-virtualized'
import Dialog from '../common/PureDialog'
import ScrollBar from '../common/ScrollBar'
import { LIButton } from '../common/Buttons'
import { localMtime } from '../common/datetime'
import renderFileIcon from '../common/renderFileIcon'
import SimpleScrollBar from '../common/SimpleScrollBar'
import { BackwardIcon, FolderIcon, PublicIcon, DesktopNoAccessIcon, MobileNoAccessIcon, PublishIcon, VersionsIcon, CloseIcon, DeleteIcon } from '../common/Svg'

const mtimeWidth = 144
const sizeWidth = 96
const versionWidth = 108
const deltaWidth = 60

class FolderSize extends React.PureComponent {
  constructor (props) {
    super(props)
    this.state = {
      loading: true,
      dirCount: 0,
      fileCount: 0,
      fileTotalSize: 0
    }
    this.reqAsync = async () => {
      this.setState({ loading: true })
      const { entry, drive, apis } = this.props
      const driveUUID = drive.uuid
      const dirUUID = entry.uuid
      const res = await apis.pureRequestAsync('content', { driveUUID, dirUUID })
      return ({ dirCount: res.dirCount, fileCount: res.fileCount, fileTotalSize: res.fileTotalSize })
    }
  }

  componentDidMount () {
    this.reqAsync()
      .then((content) => {
        const { dirCount, fileCount, fileTotalSize } = content
        this.setState({ dirCount, fileCount, fileTotalSize, loading: false })
      })
      .catch(e => console.error('req dir content error', e))
  }

  render () {
    return (
      <div style={{ color: 'rgba(0,0,0,.54)', fontSize: 12, width: 100, textAlign: 'right' }}>
        { this.state.loading ? i18n.__('Loading') : prettysize(this.state.fileTotalSize) }
      </div>
    )
  }
}

class Row extends React.PureComponent {
  render () {
    const {
      /* these are react-virtualized List props */
      index, // Index of row
      // isScrolling, // The List is currently being scrolled
      // isVisible, // This row is visible within the List (eg it is not an overscanned row)
      // parent, // Reference to the parent List (instance)
      style, // Style object to be applied to row (to position it);
      // This must be passed through to the rendered row element.

      /* these are view-model state */
      entries,
      select
    } = this.props

    const entry = entries[index]

    const onDropping = entry.type === 'directory' && select.rowDrop(index)

    /* backgroud color */
    const backgroundColor = onDropping ? '#f8f9fa' : select.rowColor(index)

    const isSelected = select.selected.includes(index)

    const onRowMouseDown = (e, i) => {
      e.stopPropagation()
      if (isSelected) this.props.rowDragStart(e, i)
      else {
        this.props.onRowClick(e, i)
        this.props.selectStart(e)
      }
    }

    const onContentMouseDown = (e, i) => {
      e.stopPropagation()
      // if (!isSelected) this.props.onRowClick(e, i)
      this.props.rowDragStart(e, i)
    }

    const onBGMouseDown = (e) => {
      this.props.onRowClick(e, -1)
      this.props.selectStart(e)
    }

    /* { borderColor, borderTopColor, borderBottomColor } = select.rowBorder(index) */
    const rowStyle = Object.assign({
      height: '100%',
      width: 'calc(100% - 24px)',
      display: 'flex',
      alignItems: 'center',
      backgroundColor,
      color: 'transparent',
      boxSizing: 'border-box',
      border: 'solid 1px transparent'
    }, select.rowBorder(index))

    const textStyle = { color: 'rgba(0,0,0,.54)', textAlign: 'right', fontSize: 12 }

    const isMobile = false // TODO
    const Icon = isMobile ? MobileNoAccessIcon : DesktopNoAccessIcon
    const otherWidth = sizeWidth + mtimeWidth + deltaWidth + ((this.props.isBackup && versionWidth) || 0)
    const nameWidth = `calc(100% - ${otherWidth}px)`

    return (
      <div key={entry.name} style={Object.assign({ display: 'flex' }, style)}>
        <div
          style={rowStyle}
          onClick={e => this.props.onRowClick(e, index)}
          onMouseUp={(e) => { e.preventDefault(); e.stopPropagation() }}
          onContextMenu={e => this.props.onRowContextMenu(e, index)}
          onMouseEnter={e => this.props.onRowMouseEnter(e, index)}
          onMouseLeave={e => this.props.onRowMouseLeave(e, index)}
          onDoubleClick={e => this.props.onRowDoubleClick(e, index)}
          onMouseDown={e => onRowMouseDown(e, index)}
        >
          {/* file type may be: folder, public, directory, file, unsupported */}
          <div
            style={{ width: 32, marginLeft: 16 }}
            onMouseDown={e => onContentMouseDown(e, index)}
            className="flexCenter"
          >
            {
              entry.type === 'directory'
                ? <FolderIcon style={{ color: '#f9a825', width: 24, height: 24 }} />
                : entry.type === 'public'
                  ? <PublicIcon style={{ color: '#f9a825', width: 24, height: 24 }} />
                  : renderFileIcon(entry.name, entry.metadata, 24)
            }
          </div>
          <div style={{ width: 12 }} />

          <div style={{ width: nameWidth, display: 'flex', alignItems: 'center' }} >
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', position: 'relative' }}>
              <div style={{ maxWidth: 'calc(100% - 40px)', color: 'rgba(0,0,0,.76)' }} className="text">
                { entry.bname || entry.name }
              </div>
              { entry.archived && <Icon style={{ width: 16, height: 16, marginLeft: 16 }} /> }
            </div>
          </div>

          <div
            style={Object.assign({ width: mtimeWidth }, textStyle)}
            onMouseDown={e => onContentMouseDown(e, index)}
          >
            { localMtime(entry.bmtime || entry.mtime) }
          </div>

          <div
            style={Object.assign({ width: sizeWidth }, textStyle)}
            onMouseDown={e => onContentMouseDown(e, index)}
          >
            { entry.type === 'file' && entry.size && prettysize(entry.size) }
          </div>

          {
            this.props.isBackup
              ? <div
                style={Object.assign({ width: versionWidth }, textStyle)}
                className="flexCenter"
                onClick={e => e.stopPropagation()}
                onDoubleClick={e => e.stopPropagation()}
              >
                {
                  !entry.versions || (entry.versions && entry.versions.length <= 1) ? '--'
                    : (
                      <LIButton onClick={() => this.props.showVersions(entry.versions)} iconStyle={{ width: 18, height: 18 }}>
                        <VersionsIcon />
                      </LIButton>
                    )
                }
              </div>
              : <div style={{ width: 26 }} />
          }
        </div>
        <div
          onMouseDown={e => onBGMouseDown(e)}
          onContextMenu={e => this.props.onRowContextMenu(e, -1)}
          draggable={false}
          style={{ width: 24, height: '100%' }}
        />
      </div>
    )
  }
}

class RenderListByRow extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      type: ''
    }

    this.enterDiv = (type) => {
      this.setState({ type })
    }

    this.leaveDiv = () => {
      this.setState({ type: '' })
    }

    this.scrollToRow = index => this.ListRef.scrollToRow(index)

    this.handleChange = (type) => {
      if (this.state.type !== type) {
        switch (type) {
          case i18n.__('Date Modified'):
            this.props.changeSortType('timeUp')
            break
          case i18n.__('Date Taken'):
            this.props.changeSortType('takenUp')
            break
          default:
            console.error('this.handleChange no such type', type)
        }
        this.setState({ type, open: false })
      } else {
        this.setState({ open: false })
      }
    }

    this.toggleMenu = (event) => {
      if (!this.state.open && event && event.preventDefault) event.preventDefault()
      this.setState({ open: event !== 'clickAway' && !this.state.open, anchorEl: event.currentTarget })
    }

    this.getScrollToPosition = () => (this.scrollTop || 0)

    this.onScroll = ({ scrollTop }) => {
      this.scrollTop = scrollTop
      this.props.onScroll(scrollTop)
    }
    this.showVersions = (versions) => {
      this.setState({ openVersions: versions })
    }

    this.onDownload = (entries) => {
      this.setState({ openVersions: null }, () => this.props.downloadBackup(entries))
    }

    this.onDelete = (entry) => {
      this.setState({ openVersions: null }, () => this.props.onDeleteVersion(entry))
    }
  }

  componentDidUpdate () {
    if (this.props.scrollTo) {
      const index = this.props.entries.findIndex(entry => entry.name === this.props.scrollTo)
      if (index > -1) {
        this.scrollToRow(index)
        this.props.resetScrollTo()
        this.props.select.touchTap(0, index)
      }
    }
  }

  renderHeader (h) {
    const dStyle = { width: 18, height: 18, color: 'rgba(0,0,0,.27)', transition: 'all 0ms' }
    const Icon = this.props.sortType === h.down
      ? <BackwardIcon style={Object.assign({ transform: 'rotate(-90deg)' }, dStyle)} />
      : this.props.sortType === h.up
        ? <BackwardIcon style={Object.assign({ transform: 'rotate(90deg)' }, dStyle)} />
        : <div />
    return (
      <div
        key={h.title}
        style={{
          width: h.width,
          flexGrow: h.flexGrow,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          cursor: this.state.type === h.title ? 'pointer' : 'default'
        }}
        onMouseMove={() => this.enterDiv(h.title)}
        onMouseLeave={() => this.leaveDiv(h.title)}
        onClick={() => {
          this.props.sortType === h.up ? this.props.changeSortType(h.down) : this.props.changeSortType(h.up)
        }}
      >
        <div
          style={{
            fontSize: 14,
            width: '100%',
            color: 'rgba(0,0,0,.54)',
            textAlign: h.textAlign,
            display: h.textAlign === 'left' ? 'flex' : undefined,
            alignItems: 'center',
            opacity: this.state.type === h.title ? 1 : 0.7
          }}
        >
          { h.title }
          {
            h.textAlign === 'left' &&
              <div style={{ marginLeft: 8 }} className="flexCenter">
                { Icon }
              </div>
          }
        </div>
        {
          h.textAlign !== 'left' &&
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                height: '100%',
                position: 'absolute',
                right: h.textAlign === 'right' ? -26 : 0
              }}
            >
              { Icon }
            </div>
        }
      </div>
    )
  }

  renderTopDirs () {
    const { select, path, apis } = this.props
    const entries = this.props.entries.filter(e => e.metadata && !e.deleted)
    const drive = (path && path[1]) || {}
    const onRowMouseDown = (e, i) => {
      e.stopPropagation()
      if (select.selected.includes(i)) this.props.rowDragStart(e, i)
      else {
        this.props.onRowClick(e, i)
        this.props.selectStart(e)
      }
    }
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <div
          style={{
            position: 'relative',
            height: 48,
            width: 'calc(100% - 48px)',
            marginLeft: 48,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f8f9fa'
          }}
        >
          { this.renderHeader({ title: i18n.__('Backup Folder'), flexGrow: 1, up: 'nameUp', down: 'nameDown', textAlign: 'left' }) }
          <div style={{ fontSize: 14, color: 'rgba(0,0,0,.54)', width: 190 }} >
            { i18n.__('Backup Status') }
          </div>
          <div style={{ fontSize: 14, color: 'rgba(0,0,0,.54)', width: 48, textAlign: 'right' }} >
            { i18n.__('Size') }
          </div>
          <div style={{ width: 24 }} />
        </div>
        <AutoSizer>
          {({ height, width }) => (
            <SimpleScrollBar width={width} height={height} >
              {
                entries.map((entry, index) => (
                  <div
                    key={entry.uuid}
                    onClick={e => this.props.onRowClick(e, index)}
                    onMouseUp={(e) => { e.preventDefault(); e.stopPropagation() }}
                    onMouseEnter={e => this.props.onRowMouseEnter(e, index)}
                    onMouseLeave={e => this.props.onRowMouseLeave(e, index)}
                    onDoubleClick={e => this.props.onRowDoubleClick(e, index)}
                    onMouseDown={e => onRowMouseDown(e, index)}
                    style={{
                      height: 56,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 32,
                      boxSizing: 'border-box'
                    }}
                  >
                    <div
                      style={{ width: 24, marginLeft: 16 }}
                      className="flexCenter"
                    >
                      <FolderIcon style={{ color: '#f9a825', width: 24, height: 24 }} />
                    </div>
                    <div style={{ width: 16 }} />

                    <div style={{ width: 'calc(100% - 500px)', height: 56 }}>
                      <div style={{ margin: '8px 0' }} className="text">
                        { entry.bname }
                      </div>
                      <div style={{ color: 'rgba(0,0,0,.54)', fontSize: 12 }} className="text">
                        { entry.metadata.localPath }
                      </div>
                    </div>
                    <div style={{ flexGrow: 1 }} />

                    <div style={{ width: 136, height: 56, color: 'rgba(0,0,0,.54)', fontSize: 12 }}>
                      {
                        entry.metadata.status === 'Idle' && entry.metadata.lastBackupTime
                          ? (
                            <div>
                              <div style={{ margin: '8px 0px' }}>
                                { localMtime(entry.metadata.lastBackupTime) }
                              </div>
                              <div>
                                { i18n.__('Last Success Backup') }
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', height: 56 }}>
                              { entry.metadata.disabled ? i18n.__('Backup is Disabled')
                                : entry.metadata.status === 'Working' ? i18n.__('Backuping') : i18n.__('Backup Not Finished') }
                            </div>
                          )
                      }
                    </div>

                    <FolderSize entry={entry} drive={drive} apis={apis} />
                    <div style={{ width: 24 }} />
                  </div>
                ))
              }
            </SimpleScrollBar>
          )}
        </AutoSizer>
      </div>
    )
  }

  renderVersions (versions) {
    console.log('renderVersions', versions)
    return (
      <div style={{ height: 441, width: 560 }}>
        <div style={{ height: 56, display: 'flex', alignItems: 'center', marginLeft: 24 }}>
          { i18n.__('File Versions') }
          <div style={{ flexGrow: 1 }} />
          <LIButton onClick={() => this.setState({ openVersions: null })}> <CloseIcon /> </LIButton>
          <div style={{ width: 7 }} />
        </div>
        <div style={{ height: 1, backgroundColor: '#e8eaed', width: '100%' }} />
        <div style={{ height: 32, fontSize: 12, color: 'rgba(0,0,0,.54)', display: 'flex', alignItems: 'center', marginTop: 8 }}>
          <div style={{ marginLeft: 72, width: 186 }} >
            { i18n.__('Name') }
          </div>
          <div style={{ width: 108, textAlign: 'right' }}>
            { i18n.__('Date Modified') }
          </div>
          <div style={{ width: 77, textAlign: 'right' }}>
            { i18n.__('Size') }
          </div>
        </div>
        <SimpleScrollBar height={344} width={560}>
          {
            versions.map((entry, index) => {
              const { bname, bmtime, metadata, size } = entry
              return (
                <div
                  key={index.toString()}
                  style={{ height: 56, width: '100%', display: 'flex', alignItems: 'center', fontWeight: 500 }}
                >
                  <div style={{ width: 22 }} />
                  { renderFileIcon(bname, metadata, 24) }
                  <div style={{ width: 27 }} />
                  <div style={{ width: 186 }} className="text">
                    { bname }
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,.54)', textAlign: 'right', width: 108 }}>
                    { localMtime(bmtime) }
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,.54)', textAlign: 'right', width: 77 }}>
                    { prettysize(size) }
                  </div>
                  <div style={{ width: 23 }} />
                  <LIButton onClick={() => this.onDownload([entry])} iconStyle={{ transform: 'rotate(180deg)' }}>
                    <PublishIcon />
                  </LIButton>
                  <div style={{ marginLeft: -9 }}>
                    <LIButton onClick={() => this.onDelete(entry)}> <DeleteIcon /> </LIButton>
                  </div>
                  <div style={{ width: 7 }} />
                </div>
              )
            })
          }
        </SimpleScrollBar>
      </div>
    )
  }

  render () {
    if (this.props.isTopDirs) return this.renderTopDirs()
    return (
      <div
        style={{
          marginLeft: 8,
          width: 'calc(100% - 8px)',
          height: '100%',
          boxSizing: 'border-box',
          position: 'relative'
        }}
        onDrop={this.props.drop}
      >
        {/* header */}
        <div
          style={{
            position: 'relative',
            height: 48,
            width: 'calc(100% - 40px)',
            margin: '0 40px',
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f8f9fa'
          }}
        >
          { this.renderHeader({ title: i18n.__('Name'), flexGrow: 1, up: 'nameUp', down: 'nameDown', textAlign: 'left' }) }
          { this.renderHeader({ title: i18n.__('Date Modified'), width: mtimeWidth, up: 'timeUp', down: 'timeDown', textAlign: 'right' }) }
          { this.renderHeader({ title: i18n.__('Size'), width: sizeWidth, up: 'sizeUp', down: 'sizeDown', textAlign: 'right' }) }
          { this.props.isBackup &&
              this.renderHeader({ title: i18n.__('Versions'), width: versionWidth, down: 'versionDown', up: 'versionUp', textAlign: 'center' }) }
          <div style={{ width: this.props.isBackup ? 22 : 48 }} />
        </div>

        {/* list content */}
        <div style={{ width: '100%', height: 'calc(100% - 40px)' }}>
          {
            this.props.entries.length !== 0 &&
            <AutoSizer>
              {({ height, width }) => (
                <div
                  role="presentation"
                  onMouseDown={e => this.props.onRowClick(e, -1) || this.props.selectStart(e)}
                  onContextMenu={e => this.props.onRowContextMenu(e, -1)}
                  draggable={false}
                  style={{ padding: '0 20px' }}
                >
                  <ScrollBar
                    ref={ref => (this.ListRef = ref)}
                    height={height}
                    width={width - 20}
                    allHeight={Math.min(this.props.entries.length * 48, 1500000)}
                    rowCount={this.props.entries.length}
                    onScroll={this.onScroll}
                    rowHeight={this.props.isTopDirs ? 56 : 48}
                    rowRenderer={props => (<Row {...props} {...this.props} showVersions={this.showVersions} />)}
                  />
                </div>
              )}
            </AutoSizer>
          }
        </div>

        <Dialog open={!!this.state.openVersions} onRequestClose={() => this.setState({ openVersions: null })} modal >
          { !!this.state.openVersions && this.renderVersions(this.state.openVersions) }
        </Dialog>
      </div>
    )
  }
}

export default RenderListByRow
