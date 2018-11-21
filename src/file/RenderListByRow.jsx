import React from 'react'
import i18n from 'i18n'
import prettysize from 'prettysize'
import { AutoSizer } from 'react-virtualized'
import Name from './Name'
import ScrollBar from '../common/ScrollBar'
import renderFileIcon from '../common/renderFileIcon'
import { BackwardIcon, FolderIcon, PublicIcon } from '../common/Svg'
import { formatDate, formatMtime } from '../common/datetime'

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
      select,
      showTakenTime,
      inPublicRoot
    } = this.props

    const entry = entries[index]

    const onDropping = entry.type === 'directory' && select.rowDrop(index)

    /* backgroud color */
    const backgroundColor = onDropping ? '#f8f9fa' : select.rowColor(index)

    const isSelected = select.selected.includes(index)

    const isOnModify = select.modify === index

    /* render drive list */
    let users = []
    if (inPublicRoot) users = this.props.apis.users && this.props.apis.users.data

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
      width: 'calc(100% - 20px)',
      display: 'flex',
      alignItems: 'center',
      backgroundColor,
      color: 'transparent',
      boxSizing: 'border-box',
      border: 'solid 1px transparent'
    }, select.rowBorder(index))

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

          <div style={{ width: 'calc(100% - 370px)', display: 'flex', alignItems: 'center' }} >
            <Name
              refresh={() => this.props.refresh({ noloading: true })}
              openSnackBar={this.props.openSnackBar}
              entry={entry}
              entries={this.props.entries}
              modify={isOnModify}
              apis={this.props.apis}
              path={this.props.path}
              onMouseDown={e => onContentMouseDown(e, index)}
            />
          </div>
          <div style={{ width: 20 }} />

          <div
            style={{ width: 80, color: '#888a8c', textAlign: 'right' }}
            onMouseDown={e => onContentMouseDown(e, index)}
          >
            { showTakenTime ? entry.metadata && (entry.metadata.date || entry.metadata.datetime) &&
              formatDate(entry.metadata.date || entry.metadata.datetime) : entry.mtime && formatMtime(entry.mtime) }
            {
              inPublicRoot && (entry.writelist === '*' ? i18n.__('All Users')
                : entry.writelist.filter(uuid => users.find(u => u.uuid === uuid))
                  .map(uuid => users.find(u => u.uuid === uuid).username).join(', ')
              )
            }
          </div>

          <div
            style={{ width: 200, color: '#888a8c', textAlign: 'right' }}
            onMouseDown={e => onContentMouseDown(e, index)}
          >
            { entry.type === 'file' && entry.size && prettysize(entry.size, false, true, 2).toUpperCase() }
          </div>

        </div>
        <div
          onMouseDown={e => onBGMouseDown(e)}
          onContextMenu={e => this.props.onRowContextMenu(e, -1)}
          draggable={false}
          style={{ width: 20, height: '100%' }}
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
    return (
      <div
        key={h.title}
        style={{
          width: h.width,
          flexGrow: h.flexGrow,
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
            fontSize: 12,
            color: '#888a8c',
            letterSpacing: 1.4,
            opacity: this.state.type === h.title ? 1 : 0.7
          }}
        >
          { h.title }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', marginTop: 2 }}>
          { this.props.sortType === h.up &&
            <BackwardIcon style={{ width: 18, height: 18, color: 'rgba(0,0,0,.27)', transform: 'rotate(-90deg)' }} /> }
          { this.props.sortType === h.down &&
            <BackwardIcon style={{ width: 18, height: 18, color: 'rgba(0,0,0,.27)', transform: 'rotate(90deg)' }} /> }
        </div>
      </div>
    )
  }

  render () {
    const rowRenderer = props => (
      <Row
        {...props}
        {...this.props}
      />
    )

    return (
      <div
        style={{
          marginLeft: 12,
          width: 'calc(100% - 12px)',
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
          { this.renderHeader({ title: i18n.__('File Name'), flexGrow: 1, up: 'nameUp', down: 'nameDown' }) }
          { this.renderHeader({ title: i18n.__('Date Modified'), width: 232, up: 'timeUp', down: 'timeDown' }) }
          { this.renderHeader({ title: i18n.__('Size'), width: 48, up: 'sizeUp', down: 'sizeDown' }) }
          <div style={{ width: 8 }} />
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
                    rowHeight={48}
                    rowRenderer={rowRenderer}
                  />
                </div>
              )}
            </AutoSizer>
          }
        </div>
      </div>
    )
  }
}

export default RenderListByRow
