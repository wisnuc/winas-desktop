import React, { Component } from 'react'
import i18n from 'i18n'
import FolderSvg from 'material-ui/svg-icons/file/folder'
import FileSvg from 'material-ui/svg-icons/editor/insert-drive-file'
import WarningIcon from 'material-ui/svg-icons/alert/warning'
import DownloadSvg from 'material-ui/svg-icons/file/file-download'
import UploadSvg from 'material-ui/svg-icons/file/file-upload'
import MultiSvg from 'material-ui/svg-icons/content/content-copy'
import { LIButton } from '../common/Buttons'
import prettySize from '../common/prettySize'

const svgStyle = { color: 'rgba(0,0,0,.54)' }
const svgStyleSmall = { color: '#000', opacity: 0.38, height: 18, width: 18 }

class FinishedTask extends Component {
  constructor (props) {
    super(props)

    this.state = {
      isSelected: false
    }

    this.createDate = new Date()

    this.updateDom = (isSelected) => {
      this.setState({ isSelected })
    }

    this.selectFinishItem = (e) => {
      const event = e.nativeEvent
      this.props.select('finish', this.props.task.uuid, this.state.isSelected, null, event)
    }

    this.openFileLocation = () => {
      if (this.props.task.trsType === 'download') setImmediate(this.props.open)
      else setImmediate(this.props.openInDrive)
    }

    this.checkError = () => {
      const errors = this.props.task.errors || []
      const warnings = this.props.task.warnings || []
      this.props.openErrorDialog([...errors, ...warnings], true)
    }
  }

  shouldComponentUpdate (nextProps, nextState) {
    return (this.state !== nextState)
  }

  getFinishDate (d) {
    const date = new Date()
    if (typeof d === 'number') {
      date.setTime(d)
    } else {
      return '-'
    }
    const year = date.getFullYear()
    const mouth = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    return `${year}-${mouth}-${day} ${hour}:${minute}`
  }

  render () {
    const task = this.props.task
    const border = this.state.hover ? '1px solid rgba(0,150,136,.38)' : '1px solid transparent'
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          margin: '0px 16px 0px 32px',
          width: 'calc(100% - 48px)',
          border,
          height: 56,
          fontSize: 14,
          backgroundColor: this.state.isSelected ? 'rgba(0,150,136,.08)' : ''
        }}
        onMouseUp={this.selectFinishItem}
        onMouseMove={() => this.setState({ hover: true })}
        onMouseLeave={() => this.setState({ hover: false })}
        onDoubleClick={this.openFileLocation}
      >
        {/* task type */}
        <div style={{ width: 18, margin: '0 16px' }}>
          { task.trsType === 'download' ? <DownloadSvg style={svgStyleSmall} /> : <UploadSvg style={svgStyleSmall} /> }
        </div>

        {/* task item type */}
        <div style={{ width: 24, marginRight: 16 }}>
          { task.entries.length > 1 ? <MultiSvg style={svgStyle} /> : task.taskType === 'file' ? <FileSvg style={svgStyle} />
            : <FolderSvg style={Object.assign({ fill: '#f9a825' }, svgStyle)} /> }
        </div>

        {/* task item name */}
        <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center' }}>
          <div
            style={{
              maxWidth: this.props.pin ? 120 : 240,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            { task.name }
          </div>
          <div>
            { task.entries.length > 1 && i18n.__('And Other %s Items', task.entries.length)}
          </div>
        </div>

        <div style={{ width: 120, textAlign: 'right' }}>
          { prettySize(task.completeSize) }
        </div>

        <div style={{ width: 'calc(20% - 160px)' }} />

        {/* task finishDate */}
        <div style={{ width: 126, marginRight: 24, textAlign: 'right' }} >
          { this.getFinishDate(task.finishDate) }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', width: 96 }} >
          <div style={{ flexGrow: 1 }} />
          {
            task.warnings && !!task.warnings.length &&
            <LIButton onClick={this.checkError} tooltip={i18n.__('Detail')}>
              <WarningIcon color="#FB8C00" />
            </LIButton>
          }
        </div>
      </div>
    )
  }
}

export default FinishedTask
