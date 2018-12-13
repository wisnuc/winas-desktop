import i18n from 'i18n'
import React from 'react'
import { Menu, MenuItem, IconButton, Popover } from 'material-ui'

import Thumb from './Thumb'
import BackupCard from './BackupCard'
import renderFileIcon from '../common/renderFileIcon'
import { AllFileIcon, ArrowDownIcon, CheckedIcon, PCIcon, MobileIcon } from '../common/Svg'
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
    this.state = {
      open: false
    }

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
    const { select, list, isScrolling, rowSum, sortType, changeSortType, size } = this.props
    const h = this.headers.find(header => header.title === this.state.type) || this.headers[0]
    return (
      <div style={{ height: '100%', width: '100%', paddingLeft: 8 }} >
        {/* header */}
        {
          list.first && list.entries[0].entry.type !== 'backup' &&
            <div style={{ height: 48, display: 'flex', alignItems: 'center ' }}>
              <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.54)', width: 64 }}>
                { list.entries[0].entry.type === 'directory' ? i18n.__('Directory') : i18n.__('File') }
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
                      iconStyle={{
                        height: 18,
                        width: 18,
                        color: 'rgba(0,0,0,0.54)',
                        transition: 'transform 0ms',
                        transform: (sortType === h.up || !sortType) ? 'rotate(180deg)' : ''
                      }}
                      hoveredStyle={{ backgroundColor: 'rgba(0,0,0,0.18)' }}
                      onClick={() => { sortType === h.up || !sortType ? changeSortType(h.down) : changeSortType(h.up) }}
                    >
                      { sortType === h.up || !sortType ? <ArrowDownIcon /> : <ArrowDownIcon /> }
                    </IconButton>
                  </div>
              }
            </div>
        }
        {
          list.first && list.entries[0].entry.type === 'backup' && <div style={{ height: 24 }} />
        }
        {/* onMouseDown: clear select and start grid select */}
        <div style={{ display: 'flex' }} >
          {
            list.entries.map((item) => {
              // isScrolling
              const { index, entry } = item
              const selected = select.selected.findIndex(s => s === index) > -1
              const hover = select.hover === index && !selected
              const border = hover ? '1px solid rgba(0,150,136, 0.26)' : selected ? '1px solid rgba(0,150,136, 0.38)' : ''
              const backgroundColor = selected ? 'rgba(0,150,136,.04)' : '#FFF'
              const isMobile = false // TODO
              const Icon = isMobile ? MobileIcon : PCIcon
              const actions = isScrolling ? {} : {
                onClick: e => this.props.onRowClick(e, index),
                onMouseUp: (e) => { e.preventDefault(); e.stopPropagation() },
                onContextMenu: e => this.props.onRowContextMenu(e, index),
                onMouseEnter: e => this.props.onRowMouseEnter(e, index),
                onMouseLeave: e => this.props.onRowMouseLeave(e, index),
                onDoubleClick: e => this.props.onRowDoubleClick(e, index),
                onMouseDown: e => e.stopPropagation() || this.props.gridDragStart(e, index)
              }
              if (entry.type === 'backup') {
                const boxShadow = (selected || hover) ? '0px 5px 6.6px 0.4px rgba(0,105,92,.24), 0px 2px 9.8px 0.2px rgba(0,105,92,.16)'
                  : '0px 1px 0.9px 0.1px rgba(0, 0, 0, 0.24), 0 0 1px 0px rgba(0, 0, 0, 0.16)'
                return (
                  <div
                    key={entry.uuid}
                    className="flexCenter"
                    style={{
                      boxShadow,
                      width: size,
                      height: size,
                      borderRadius: 4,
                      overflow: 'hidden',
                      marginRight: 16,
                      marginBottom: 16,
                      backgroundColor: selected ? 'rgba(0,150,136,.04)' : '#FFF'
                    }}
                    {...actions}
                  >
                    <BackupCard {...this.props} drive={entry} index={index} selected={selected} />
                  </div>
                )
              }
              return (
                <div
                  key={index}
                  style={{
                    position: 'relative',
                    width: size,
                    height: entry.type !== 'directory' ? size : 48,
                    border,
                    margin: border ? '-1px 16px 16px 0px' : '0px 16px 16px 0px',
                    backgroundColor,
                    boxSizing: 'border-box',
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}
                  {...actions}
                >
                  {/* preview or icon */}
                  {
                    entry.type !== 'directory' &&
                      <div
                        draggable={false}
                        className="flexCenter"
                        style={{ height: size - 48, width: size, marginLeft: border ? -1 : 0, overflow: 'hidden' }}
                      >
                        {
                          entry.type === 'directory'
                            ? <AllFileIcon style={{ width: 48, height: 48, color: '#ffa93e' }} />
                            : ((rowSum < 500 || !isScrolling) && entry.hash && hasThumb(entry.metadata)
                              ? (
                                <Thumb
                                  full
                                  name={entry.name}
                                  metadata={entry.metadata}
                                  bgColor="transparent"
                                  digest={entry.hash}
                                  ipcRenderer={this.props.ipcRenderer}
                                  height={size - 48}
                                  width={size}
                                />
                              ) : renderFileIcon(entry.name, entry.metadata, 48)
                            )
                        }
                      </div>
                  }

                  {/* file name */}
                  <div
                    style={{
                      height: 48,
                      width: size,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      marginLeft: border ? -1 : 0
                    }}
                  >
                    <div
                      className="flexCenter"
                      style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF', margin: '0px 12px' }}
                    >
                      { entry.type === 'directory' ? <AllFileIcon style={{ width: 24, height: 24, color: '#ffa93e' }} />
                        : renderFileIcon(entry.name, entry.metadata, 24) }
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ maxWidth: size - (entry.archived ? 108 : 80) }} className="text">
                        { entry.bname || entry.name }
                      </div>
                      { entry.archived && <Icon style={{ width: 18, height: 18, marginLeft: 16 }} /> }
                    </div>
                    <div style={{ width: 8 }} />
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

export default Row
