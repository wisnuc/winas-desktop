import i18n from 'i18n'
import React from 'react'
import { Divider } from 'material-ui'
import { AutoSizer } from 'react-virtualized'

import ScrollBar from '../common/ScrollBar'
import renderFileIcon from '../common/renderFileIcon'
import { LIButton, RSButton } from '../common/Buttons'
import { FolderIcon, MultiDownloadIcon, MultiUploadIcon, CloseIcon } from '../common/Svg'

const convert = (code) => {
  switch (code) {
    case 'EEXIST':
      return i18n.__('EEXIST')
    case 'ECONNRESET':
      return i18n.__('ECONNRESET')
    case 'ECONNREFUSED':
      return i18n.__('ECONNREFUSED')
    case 'ECONNEND':
      return i18n.__('ECONNEND')
    case 'ENOENT':
      return i18n.__('ENOENT')
    case 'EPERM':
      return i18n.__('EPERM')
    case 'EACCES':
      return i18n.__('EACCES')
    case 'ENOSPC':
      return i18n.__('ENOSPC')
    case 'ENXIO':
      return i18n.__('ENXIO')
    case 'ESHA256MISMATCH':
      return i18n.__('ESHA256MISMATCH')
    case 'EOVERSIZE':
      return i18n.__('EOVERSIZE')
    case 'EUNDERSIZE':
      return i18n.__('EUNDERSIZE')
    case 'ENAME':
      return i18n.__('ENAME')
    case 'ETYPE':
      return i18n.__('ETYPE')
    case 'EIGNORE':
      return i18n.__('EIGNORE')
    case 'EMKDIR':
      return i18n.__('EMKDIR')
    case 'ENOTSTREAM':
      return i18n.__('ENOTSTREAM')
    case 'EHOSTUNREACH':
      return i18n.__('ECONNECT')
    case 'ETIMEOUT':
      return i18n.__('ETIMEOUT')
    case 'ETIMEDOUT':
      return i18n.__('ETIMEDOUT')
    case 'ECONNABORTED':
      return i18n.__('ECONNABORTED')
    case 'ECANCELED':
      return i18n.__('ECONNECT')
    case 'Not Found':
      return i18n.__('ENOTFOUND')
    default:
      return code || i18n.__('Unknown Error')
  }
}

const translateStatus = (statusCode) => {
  if (statusCode >= 500) return i18n.__('Internal Server Error')
  switch (statusCode) {
    case 404:
      return i18n.__('ENOTFOUND')
    default:
      return statusCode ? i18n.__('Request Failed %s', statusCode) : i18n.__('Unknown Error')
  }
}

class ErrorTree extends React.PureComponent {
  constructor (props) {
    super(props)
    this.state = {
    }

    this.retry = () => {
      const uuid = this.props.errors[0].task
      this.props.resume(uuid)
      this.props.onRequestClose()
    }

    this.ignore = () => {
      const uuid = this.props.errors[0].task
      this.props.ignore(uuid)
      this.props.onRequestClose()
    }
  }

  renderRow ({ node, key, style }) {
    const code = node.error.code ||
      (node.error.response && node.error.response[0] && node.error.response[0].error && node.error.response[0].error.code) ||
      (node.error.response && node.error.response.error && node.error.response.error.code) ||
      (node.error.response && node.error.response.code)
    const error = code ? convert(code) : translateStatus(node.error.status)
    let name = ''
    if (node.entry && typeof node.entry === 'object') name = node.entry.name
    if (node.entry && typeof node.entry === 'string') name = node.entry.replace(/^.*\//, '').replace(/^.*\\/, '')
    if (node.entries && typeof node.entries[0] === 'object') name = node.entries[0].newName
    if (node.entries && typeof node.entries[0] === 'string') name = node.entries[0].replace(/^.*\//, '').replace(/^.*\\/, '')

    return (
      <div style={style} key={key}>
        <div style={{ height: 60, width: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 30, display: 'flex', alignItems: 'center' }}>
            {
              node.entries && node.entries.length > 1 ? (node.trsType === 'download' ? <MultiDownloadIcon /> : <MultiUploadIcon />)
                : node.type === 'file' ? renderFileIcon(name, null, 30)
                  : <FolderIcon style={{ width: 30, height: 30 }} />
            }
          </div>
          <div style={{ width: 10 }} />
          <div>
            <div style={{ width: 320, height: 20, marginTop: 10, letterSpacing: 1.4, color: '#505259' }} className="text">
              { name }
            </div>
            <div style={{ height: 20, letterSpacing: 1.2, color: '#fa5353', fontSize: 12 }} className="text">
              { error }
            </div>
          </div>
        </div>
      </div>
    )
  }

  render () {
    return (
      <div
        style={{
          width: 420,
          maxHeight: 474,
          padding: '0px 20px',
          boxSizing: 'border-box',
          transition: 'all 225ms',
          overflow: 'hidden'
        }}
      >
        <div
          className="title"
          style={{ height: 60, display: 'flex', alignItems: 'center', fontSize: 20, color: '#525a60' }}
        >
          { i18n.__('Transfer Error List') }
          <div style={{ flexGrow: 1 }} />
          <div style={{ marginRight: -10 }}>
            { <LIButton onClick={this.props.onRequestClose}> <CloseIcon /> </LIButton> }
          </div>
        </div>
        <Divider
          style={{ width: 380, transition: 'all 175ms' }}
          className="divider"
        />
        <div style={{ height: 19 }} />

        {/* list of errors */}
        <div style={{ width: '100%', maxHeight: 300, height: this.props.errors.length * 60, overflowY: 'auto' }} >
          <AutoSizer>
            {({ height, width }) => (
              <ScrollBar
                height={height}
                width={width}
                allHeight={this.props.errors.length * 60}
                rowCount={this.props.errors.length}
                rowHeight={60}
                rowRenderer={({ key, index, style }) => this.renderRow({ node: this.props.errors[index], key, style })}
              />
            )}
          </AutoSizer>
        </div>

        <div style={{ height: 20 }} />
        {/* confirm button */}
        <div style={{ height: 34, display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <div style={{ flexGrow: 1 }} />
          {
            !!this.props.finished &&
              <RSButton
                alt
                label={i18n.__('Ignore All')}
                onClick={this.ignore}
              />
          }
          <div style={{ width: 10 }} />
          <RSButton
            label={this.props.finished ? i18n.__('Retry All') : i18n.__('Retry')}
            onClick={this.retry}
          />
        </div>
      </div>
    )
  }
}

export default ErrorTree
