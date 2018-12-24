import i18n from 'i18n'
import React from 'react'
import { AutoSizer } from 'react-virtualized'

import Row from './RowInGrid'
import HoverTip from './HoverTip'
import ScrollBar from '../common/ScrollBar'
import prettySize from '../common/prettySize'
import { formatMtime } from '../common/datetime'

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
        cellWidth: this.size
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
          entry.type !== 'directory' && (
            <div>
              { `${i18n.__('Size')}: ${prettySize(entry.size)}` }
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
      const MAX = Math.floor((width - (24 - 16)) / (184 + 16)) // Min Size: 180, margin-between: 16, margin-right: 24
      const size = Math.floor((width - (24 - 16)) / MAX - 16)
      let MaxItem = 0
      let lineIndex = 0
      let lastType = 'diriectory'
      this.allHeight = []
      this.rowHeightSum = 0
      this.indexHeightSum = []
      this.maxScrollTop = 0

      const firstFileIndex = entries.findIndex(item => item.type !== 'directory')
      this.mapData = []
      entries.forEach((entry, index) => {
        if (MaxItem === 0 || lastType !== entry.type) {
          /* add new row */
          this.mapData.push({
            first: (!index || index === firstFileIndex),
            index: lineIndex,
            entries: [{ entry, index }]
          })

          MaxItem = MAX - 1
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
        const tmp = 64 + !!list.first * 48 + (list.entries[0].entry.type !== 'directory') * (size + 16 - 64)
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
        size,
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
        style={{ width: 'calc(100% - 40px)', marginLeft: 40, height: '100%' }}
        onDrop={this.props.drop}
        onMouseMove={this.onMouseMove}
        onMouseDown={e => this.props.onRowClick(e, -1) || this.props.selectStart(e)}
      >
        <AutoSizer>
          {({ height, width }) => {
            const gridInfo = this.calcGridInfo(height, width, this.props.entries)
            const { mapData, allHeight, rowHeightSum, size } = gridInfo

            /* To get row index of scrollToRow */
            this.mapData = mapData
            this.allHeight = allHeight
            this.size = size

            const estimatedRowSize = rowHeightSum / allHeight.length
            const rowHeight = ({ index }) => allHeight[index]

            const rowRenderer = ({ key, index, style, isScrolling }) => (
              <div key={key} style={style} >
                <Row
                  {...this.props}
                  size={size}
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
