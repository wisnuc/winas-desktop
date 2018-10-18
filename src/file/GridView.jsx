import i18n from 'i18n'
import React from 'react'
import prettysize from 'prettysize'
import { AutoSizer } from 'react-virtualized'

import Name from './Name'
import Thumb from './Thumb'
import AddDrive from './AddDrive'
import HoverTip from './HoverTip'
import ScrollBar from '../common/ScrollBar'
import renderFileIcon from '../common/renderFileIcon'
import { AllFileIcon, PublicIcon, PartitionIcon } from '../common/Svg'
import { formatMtime } from '../common/datetime'

const hasThumb = (metadata) => {
  if (!metadata) return false
  const arr = ['PNG', 'JPEG', 'GIF', 'BMP', 'TIFF', 'MOV', '3GP', 'MP4', 'RM', 'RMVB', 'WMV', 'AVI', 'MPEG', 'MP4', '3GP', 'MOV', 'FLV', 'MKV', 'PDF']
  if (arr.includes(metadata.type)) return true
  return false
}

class Row extends React.Component {
  shouldComponentUpdate (nextProps) {
    return (!nextProps.isScrolling)
  }

  render () {
    const { select, list, isScrolling, rowSum, inPublicRoot } = this.props
    if (isScrolling) {
      return (
        <div style={{ height: '100%', width: '100%', marginLeft: 10 }} >
          <div style={{ display: 'flex', height: 144 }} >
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
                      width: 140,
                      height: 140,
                      marginRight: 4,
                      marginBottom: 10,
                      backgroundColor,
                      boxSizing: 'border-box',
                      border: `1px solid ${borderColor}`
                    }}
                    role="presentation"
                    key={index}
                  >
                    {/* preview or icon */}
                    <div
                      draggable={false}
                      className="flexCenter"
                      style={{
                        height: 80,
                        width: 108,
                        margin: borderColor ? '15px auto 0 auto' : '16px auto 0 auto',
                        overflow: 'hidden',
                        backgroundColor: '#f0f0f0'
                      }}

                    />

                    {/* file name */}
                    <div
                      className="flexCenter"
                      style={{ height: 40, width: 130, color: 'var(--dark-text)', marginLeft: 5, paddingBottom: 4, position: 'relative' }}
                    >
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
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>
      )
    }

    return (
      <div style={{ height: '100%', width: '100%', marginLeft: 10 }} >
        {/* onMouseDown: clear select and start grid select */}
        <div style={{ display: 'flex', height: 144 }} >
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
                    width: 140,
                    height: 140,
                    marginRight: 4,
                    marginBottom: 10,
                    backgroundColor,
                    boxSizing: 'border-box',
                    border: `1px solid ${borderColor}`
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
                  <div
                    draggable={false}
                    className="flexCenter"
                    style={{ height: 80, width: 108, margin: borderColor ? '15px auto 0 auto' : '16px auto 0 auto', overflow: 'hidden' }}
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
                                  height={80}
                                  width={108}
                                />
                              ) : renderFileIcon(entry.name, entry.metadata, 50)
                            )
                    }
                  </div>

                  {/* file name */}
                  <div
                    className="flexCenter"
                    style={{ height: 40, width: 130, color: 'var(--dark-text)', marginLeft: 5, paddingBottom: 4, position: 'relative' }}
                  >
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
                  </div>
                </div>
              )
            })
          }
        </div>
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
      const MAX = Math.floor((width - 0) / 144) - 1
      let MaxItem = 0
      let lineIndex = 0
      this.allHeight = []
      this.rowHeightSum = 0
      this.indexHeightSum = []
      this.maxScrollTop = 0

      const firstFileIndex = entries.findIndex(item => item.type === 'file')
      this.mapData = []
      entries.forEach((entry, index) => {
        if (MaxItem === 0) {
          /* add new row */
          this.mapData.push({
            first: (!index || index === firstFileIndex),
            index: lineIndex,
            entries: [{ entry, index }]
          })

          MaxItem = MAX
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
        const tmp = 150
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
        style={{ width: '100%', height: '100%' }}
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
