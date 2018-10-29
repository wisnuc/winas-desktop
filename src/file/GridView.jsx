import i18n from 'i18n'
import React from 'react'
import prettysize from 'prettysize'
import { AutoSizer } from 'react-virtualized'
import { Popover, Menu, MenuItem, IconButton } from 'material-ui'

import Name from './Name'
import Thumb from './Thumb'
import AddDrive from './AddDrive'
import HoverTip from './HoverTip'
import ScrollBar from '../common/ScrollBar'
import renderFileIcon from '../common/renderFileIcon'
import { AllFileIcon, PublicIcon, PartitionIcon, ArrowDownIcon, CheckedIcon } from '../common/Svg'
import { formatMtime } from '../common/datetime'
import FlatButton from '../common/FlatButton'

const hasThumb = (metadata) => {
  if (!metadata) return false
  const arr = ['PNG', 'JPEG', 'GIF', 'BMP', 'TIFF', 'MOV', '3GP', 'MP4', 'RM', 'RMVB', 'WMV', 'AVI', 'MPEG', 'MP4', '3GP', 'MOV', 'FLV', 'MKV', 'PDF']
  if (arr.includes(metadata.type)) return true
  return false
}

class Row extends React.Component {
  constructor (props) {
    super(props)

    this.headers = [
      { title: i18n.__('Name'), up: 'nameUp', down: 'nameDown' },
      { title: i18n.__('Date Modified'), up: 'timeUp', down: 'timeDown' },
      { title: i18n.__('Date Taken'), up: 'takenUp', down: 'takenDown' },
      { title: i18n.__('Size'), up: 'sizeUp', down: 'sizeDown' }
    ]

    this.header = this.headers.find(header => (header.up === this.props.sortType) ||
      (header.down === this.props.sortType)) || this.headers[0]

    this.state = {
      type: this.header.title
    }

    this.handleChange = (type) => {
      if (this.state.type !== type) {
        switch (type) {
          case i18n.__('Date Modified'):
            this.props.changeSortType('timeUp')
            break
          case i18n.__('Size'):
            this.props.changeSortType('sizeUp')
            break
          case i18n.__('Date Taken'):
            this.props.changeSortType('takenUp')
            break
          default:
            this.props.changeSortType('nameUp')
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
  }

  shouldComponentUpdate (nextProps) {
    return (!nextProps.isScrolling)
  }

  render () {
    const { select, list, isScrolling, rowSum, inPublicRoot, sortType, changeSortType } = this.props

    const h = this.headers.find(header => header.title === this.state.type) || this.headers[0]

    return (
      <div style={{ height: '100%', width: '100%', marginLeft: 10 }} >
        {/* header */}
        {
          list.first &&
            <div style={{ height: 48, display: 'flex', alignItems: 'center ', marginBottom: 8 }}>
              <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.54)', width: 64 }}>
                {
                  list.entries[0].entry.type === 'file'
                    ? i18n.__('File') : list.entries[0].entry.type === 'public'
                      ? i18n.__('Public Drive') : i18n.__('Directory')
                }
              </div>
              <div style={{ flexGrow: 1 }} />
              {
                !list.entries[0].index && !this.props.inPublicRoot &&
                  <div style={{ display: 'flex', alignItems: 'center ', marginRight: 84 }}>
                    <FlatButton
                      label={this.state.type}
                      labelStyle={{ fontSize: 14, color: 'rgba(0,0,0,0.54)' }}
                      onClick={this.toggleMenu}
                    />
                    {/* menu */}
                    <Popover
                      open={this.state.open}
                      anchorEl={this.state.anchorEl}
                      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                      targetOrigin={{ horizontal: 'right', vertical: 'top' }}
                      onRequestClose={this.toggleMenu}
                    >
                      <Menu style={{ minWidth: 240 }}>
                        <MenuItem
                          style={{ fontSize: 13 }}
                          leftIcon={this.state.type === i18n.__('Name') ? <CheckedIcon /> : <div />}
                          primaryText={i18n.__('Name')}
                          onClick={() => this.handleChange(i18n.__('Name'))}
                        />
                        <MenuItem
                          style={{ fontSize: 13 }}
                          leftIcon={this.state.type === i18n.__('Date Modified') ? <CheckedIcon /> : <div />}
                          primaryText={i18n.__('Date Modified')}
                          onClick={() => this.handleChange(i18n.__('Date Modified'))}
                        />
                        <MenuItem
                          style={{ fontSize: 13 }}
                          leftIcon={this.state.type === i18n.__('Date Taken') ? <CheckedIcon /> : <div />}
                          primaryText={i18n.__('Date Taken')}
                          onClick={() => this.handleChange(i18n.__('Date Taken'))}
                        />
                        <MenuItem
                          style={{ fontSize: 13 }}
                          leftIcon={this.state.type === i18n.__('Size') ? <CheckedIcon /> : <div />}
                          primaryText={i18n.__('Size')}
                          onClick={() => this.handleChange(i18n.__('Size'))}
                        />
                      </Menu>
                    </Popover>

                    {/* direction icon */}
                    <IconButton
                      style={{ height: 36, width: 36, padding: 9, borderRadius: '18px' }}
                      iconStyle={{ height: 18, width: 18, color: 'rgba(0,0,0,0.54)' }}
                      hoveredStyle={{ backgroundColor: 'rgba(0,0,0,0.18)' }}
                      onClick={() => { sortType === h.up || !sortType ? changeSortType(h.down) : changeSortType(h.up) }}
                    >
                      { sortType === h.up || !sortType ? <ArrowDownIcon /> : <ArrowDownIcon /> }
                    </IconButton>
                  </div>
              }
            </div>
        }
        {/* onMouseDown: clear select and start grid select */}
        {
          isScrolling ? (
            <div style={{ display: 'flex' }}>
              {
                list.entries.map((item) => {
                  const { index, entry } = item
                  const backgroundColor = '#FFF'
                  const borderColor = 'transparent'
                  if (entry.type === 'addDrive') {
                    return (
                      <AddDrive
                        {...this.props}
                        item={item}
                        key={index}
                        onClick={this.props.openNewDrive}
                      />
                    )
                  }
                  return (
                    <div
                      style={{
                        position: 'relative',
                        width: 196,
                        height: entry.type === 'file' ? 196 : 48,
                        marginRight: 20,
                        marginBottom: 10,
                        backgroundColor,
                        borderRadius: 6,
                        boxSizing: 'border-box',
                        border: `1px solid ${borderColor}`,
                        boxShadow: 'rgba(0, 0, 0, 0.118) 0px 1px 6px, rgba(0, 0, 0, 0.118) 0px 1px 4px'
                      }}
                      role="presentation"
                      key={index}
                    >
                      {/* preview or icon */}
                      {
                        entry.type === 'file' &&
                          <div
                            draggable={false}
                            className="flexCenter"
                            style={{
                              height: 148,
                              width: 196,
                              margin: 0,
                              overflow: 'hidden',
                              backgroundColor: '#f0f0f0'
                            }}
                          />
                      }

                      {/* file name */}
                      <div
                        style={{ height: 48, width: 196, position: 'relative', display: 'flex', alignItems: 'center' }}
                      >
                        <div style={{ width: 24, margin: '0px 16px' }}>
                          { entry.type === 'directory' ? <AllFileIcon style={{ width: 24, height: 24, color: '#ffa93e' }} />
                            : renderFileIcon(entry.name, entry.metadata, 24) }
                        </div>
                        <div
                          style={{
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            color: '#525a60',
                            letterSpacing: 1.4
                          }}
                        >
                          { entry.name }
                        </div>
                        <div style={{ width: 8 }} />
                      </div>
                    </div>
                  )
                })
              }
            </div>
          )
            : <div style={{ display: 'flex' }} >
              {
                list.entries.map((item) => {
                  const { index, entry } = item
                  const selected = select.selected.findIndex(s => s === index) > -1
                  const isOnModify = select.modify === index && !inPublicRoot
                  const hover = select.hover === index && !selected
                  const focus = select.specified === index
                  const backgroundColor = selected ? '#f4fafe' : hover ? '#f9fcfe' : '#FFF'
                  const borderColor = selected ? '#a3d3f8' : hover ? '#d1e9fb' : focus ? '#a3d3f8' : 'transparent'
                  // const onDropping = entry.type === 'directory' && select.rowDrop(index)
                  if (entry.type === 'addDrive') {
                    return (
                      <AddDrive
                        {...this.props}
                        item={item}
                        key={index}
                        onClick={this.props.openNewDrive}
                      />
                    )
                  }
                  return (
                    <div
                      style={{
                        position: 'relative',
                        width: 196,
                        height: entry.type === 'file' ? 196 : 48,
                        marginRight: 20,
                        marginBottom: 10,
                        backgroundColor,
                        boxSizing: 'border-box',
                        // border: `1px solid ${borderColor}`,
                        boxShadow: selected ? 'rgba(0, 0, 0, 0.19) 0px 10px 30px, rgba(0, 0, 0, 0.227) 0px 6px 10px'
                          : 'rgba(0, 0, 0, 0.118) 0px 1px 6px, rgba(0, 0, 0, 0.118) 0px 1px 4px'
                      }}
                      role="presentation"
                      onClick={e => this.props.onRowClick(e, index)}
                      onMouseUp={(e) => { e.preventDefault(); e.stopPropagation() }}
                      onContextMenu={e => this.props.onRowContextMenu(e, index)}
                      onMouseEnter={e => this.props.onRowMouseEnter(e, index)}
                      onMouseLeave={e => this.props.onRowMouseLeave(e, index)}
                      onDoubleClick={e => this.props.onRowDoubleClick(e, index)}
                      onMouseDown={e => e.stopPropagation() || this.props.gridDragStart(e, index)}
                      key={index}
                    >
                      {/* preview or icon */}
                      {
                        entry.type === 'file' &&
                          <div
                            draggable={false}
                            className="flexCenter"
                            style={{ height: 148, width: 196, margin: 0, overflow: 'hidden' }}
                          >
                            {
                              entry.isUSB ? <PartitionIcon style={{ width: 50, height: 50 }} />
                                : entry.type === 'public' ? <PublicIcon style={{ width: 50, height: 50, color: '#ffa93e' }} />
                                  : entry.type === 'directory'
                                    ? <AllFileIcon style={{ width: 50, height: 50, color: '#ffa93e' }} />
                                    : ((rowSum < 500 || !isScrolling) && entry.hash && hasThumb(entry.metadata)
                                      ? (
                                        <Thumb
                                          full
                                          name={entry.name}
                                          metadata={entry.metadata}
                                          bgColor="#FFFFFF"
                                          digest={entry.hash}
                                          ipcRenderer={this.props.ipcRenderer}
                                          height={148}
                                          width={196}
                                        />
                                      ) : renderFileIcon(entry.name, entry.metadata, 50)
                                    )
                            }
                          </div>
                      }

                      {/* file name */}
                      <div
                        style={{ height: 48, width: 196, position: 'relative', display: 'flex', alignItems: 'center' }}
                      >
                        <div style={{ width: 24, margin: '0px 16px' }}>
                          { entry.type === 'directory' ? <AllFileIcon style={{ width: 24, height: 24, color: '#ffa93e' }} />
                            : renderFileIcon(entry.name, entry.metadata, 24) }
                        </div>
                        <Name
                          center
                          refresh={() => this.props.refresh({ noloading: true })}
                          openSnackBar={this.props.openSnackBar}
                          entry={entry}
                          entries={this.props.entries}
                          modify={isOnModify}
                          apis={this.props.apis}
                          path={this.props.path}
                        />
                        <div style={{ width: 8 }} />
                      </div>
                    </div>
                  )
                })
              }
            </div>
        }
      </div>
    )
  }
}

class GridView extends React.Component {
  constructor (props) {
    super(props)

    this.scrollToRow = index => this.ListRef.scrollToRow(index)

    this.getStatus = () => this.gridData

    this.calcGridData = () => {
      this.gridData = {
        mapData: this.mapData.reduce((acc, val, index) => {
          val.entries.forEach(() => acc.push(index))
          return acc
        }, []),
        allHeight: this.allHeight, // const rowHeight = ({ index }) => allHeight[index]
        indexHeightSum: this.indexHeightSum,
        scrollTop: this.getScrollToPosition(),
        cellWidth: 144
      }

      this.props.setGridData(this.gridData)
    }

    this.getScrollToPosition = () => (this.scrollTop || 0)

    this.onScroll = ({ scrollTop }) => {
      this.scrollTop = scrollTop
      this.props.onScroll(scrollTop)
    }

    this.onMouseMove = (e) => {
      this.mouseX = e.clientX
      this.mouseY = e.clientY
    }
  }

  componentDidMount () {
    this.calcGridData()
  }

  componentDidUpdate () {
    if (this.props.scrollTo) {
      const index = this.props.entries.findIndex(entry => entry.name === this.props.scrollTo)
      if (index > -1) {
        let rowIndex = 0
        let sum = 0
        /* calc rowIndex */
        for (let i = 0; i < this.mapData.length; i++) {
          sum += this.mapData[i].entries.length
          if (index < sum) break
          rowIndex += 1
        }
        if (rowIndex < this.mapData.length) this.scrollToRow(rowIndex)
        this.props.resetScrollTo()
        this.props.select.touchTap(0, index)
      }
    }
    this.calcGridData()
  }

  renderHoverTip () {
    const longHover = this.props.select && this.props.select.longHover
    const hover = this.props.select && this.props.select.hover
    const entry = this.props.entries[longHover] || this.props.entries[hover] || {}
    const top = Math.min(this.mouseY, window.innerHeight - 100)
    const left = Math.min(this.mouseX, window.innerWidth - 400)
    return (
      <div
        style={{
          position: 'fixed',
          top,
          left,
          maxWidth: 400,
          boxSizing: 'bordr-box',
          padding: 5,
          color: '#292936',
          fontSize: 12,
          backgroundColor: '#FFF',
          border: 'solid 1px #d9d9d9'
        }}
      >
        <div>
          { `${i18n.__('Name')}: ${entry.name}` }
        </div>
        {
          entry.type === 'file' && (
            <div>
              { `${i18n.__('Size')}: ${prettysize(entry.size, false, true, 2).toUpperCase()}` }
            </div>
          )
        }
        {
          entry.mtime && (
            <div>
              { `${i18n.__('Date Modified')}: ${formatMtime(entry.mtime)}` }
            </div>
          )
        }
      </div>
    )
  }

  calcGridInfo (height, width, entries) {
    if (height !== this.preHeight || width !== this.preWidth || entries !== this.preEntries || !this.preData) { // singleton
      const MAX = Math.floor((width - 0) / 216) - 1
      let MaxItem = 0
      let lineIndex = 0
      let lastType = 'diriectory'
      this.allHeight = []
      this.rowHeightSum = 0
      this.indexHeightSum = []
      this.maxScrollTop = 0

      const firstFileIndex = entries.findIndex(item => item.type === 'file')
      this.mapData = []
      entries.forEach((entry, index) => {
        if (MaxItem === 0 || lastType !== entry.type) {
          /* add new row */
          this.mapData.push({
            first: (!index || index === firstFileIndex),
            index: lineIndex,
            entries: [{ entry, index }]
          })

          MaxItem = MAX
          lastType = entry.type
          lineIndex += 1
        } else {
          MaxItem -= 1
          this.mapData[this.mapData.length - 1].entries.push({ entry, index })
        }
      })

      /* simulate large list */
      for (let i = 1; i <= 0; i++) {
        this.mapData.push(...this.mapData)
      }
      /* calculate each row's heigth and their sum */
      this.mapData.forEach((list) => {
        const tmp = 80 + !!list.first * 48 + (list.entries[0].entry.type === 'file') * 148
        this.allHeight.push(tmp)
        this.rowHeightSum += tmp
        this.indexHeightSum.push(this.rowHeightSum)
      })

      this.maxScrollTop = this.rowHeightSum - height
      if (this.rowHeightSum > 1500000) {
        const r = this.rowHeightSum / 1500000
        this.indexHeightSum = this.indexHeightSum.map(h => h / r)
        this.maxScrollTop = 1500000 - height
      }

      this.preHeight = height
      this.preWidth = width
      this.preEntries = entries
      this.preData = {
        mapData: this.mapData,
        allHeight: this.allHeight,
        rowHeightSum: this.rowHeightSum,
        indexHeightSum: this.indexHeightSum,
        maxScrollTop: this.maxScrollTop
      }
    }

    return this.preData
  }

  render () {
    if (!this.props.entries || this.props.entries.length === 0) return (<div />)
    return (
      <div
        style={{ width: 'calc(100% - 48px)', marginLeft: 48, height: '100%' }}
        onDrop={this.props.drop}
        onMouseMove={this.onMouseMove}
        onMouseDown={e => this.props.onRowClick(e, -1) || this.props.selectStart(e)}
      >
        <AutoSizer key={this.props.entries && this.props.entries[0] && this.props.entries[0].uuid}>
          {({ height, width }) => {
            const gridInfo = this.calcGridInfo(height, width, this.props.entries)
            const { mapData, allHeight, rowHeightSum } = gridInfo

            /* To get row index of scrollToRow */
            this.mapData = mapData
            this.allHeight = allHeight

            const estimatedRowSize = rowHeightSum / allHeight.length
            const rowHeight = ({ index }) => allHeight[index]

            const rowRenderer = ({ key, index, style, isScrolling }) => (
              <div key={key} style={style} >
                <Row
                  {...this.props}
                  rowSum={mapData.length}
                  isScrolling={isScrolling}
                  list={mapData[index]}
                />
              </div>
            )

            return (
              <div
                role="presentation"
                onMouseUp={e => this.props.onRowClick(e, -1)}
                onContextMenu={e => this.props.onRowContextMenu(e, -1)}
                onMouseMove={e => this.props.selectGrid(e, this.getStatus())}
                onMouseDown={e => this.props.onRowClick(e, -1) || this.props.selectStart(e)}
              >
                <ScrollBar
                  ref={ref => (this.ListRef = ref)}
                  allHeight={rowHeightSum}
                  height={height}
                  width={width}
                  estimatedRowSize={estimatedRowSize}
                  rowHeight={rowHeight}
                  rowRenderer={rowRenderer}
                  rowCount={gridInfo.mapData.length}
                  onScroll={this.onScroll}
                  overscanRowCount={10}
                  style={{ outline: 'none' }}
                />
              </div>
            )
          }}
        </AutoSizer>
        <HoverTip
          longHover={this.props.select && this.props.select.longHover}
          hover={this.props.select && this.props.select.hover}
          entries={this.props.entries}
          mouseX={this.mouseX}
          mouseY={this.mouseY}
          onMouseEnter={this.props.onRowMouseEnter}
          onMouseLeave={this.props.onRowMouseLeave}
        />
      </div>
    )
  }
}

export default GridView
