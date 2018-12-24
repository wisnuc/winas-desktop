import React from 'react'
import i18n from 'i18n'
import DeleteSvg from 'material-ui/svg-icons/action/delete'
import FileSvg from 'material-ui/svg-icons/editor/insert-drive-file'
import FolderSvg from 'material-ui/svg-icons/file/folder'
import PlaySvg from 'material-ui/svg-icons/av/play-arrow'
import PauseSvg from 'material-ui/svg-icons/av/pause'
import InfoSvg from 'material-ui/svg-icons/action/info'
import WarningIcon from 'material-ui/svg-icons/alert/warning'
import DownloadSvg from 'material-ui/svg-icons/file/file-download'
import UploadSvg from 'material-ui/svg-icons/file/file-upload'
import MultiSvg from 'material-ui/svg-icons/content/content-copy'
import { LIButton } from '../common/Buttons'
import prettySize from '../common/prettySize'

const svgStyle = { color: 'rgba(0,0,0,.54)' }
const svgStyleSmall = { color: '#000', opacity: 0.38, height: 18, width: 18 }
class RunningTask extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      isSelected: false
    }

    this.updateDom = (isSelected) => {
      this.setState({ isSelected })
    }

    this.selectTaskItem = (e) => {
      const event = e.nativeEvent
      this.props.select('running', this.props.task.uuid, this.state.isSelected, null, event)
    }

    this.toggleTask = () => {
      const task = this.props.task
      if (task.paused) this.props.resume(task.uuid)
      else this.props.pause(task.uuid)
    }

    this.checkError = () => {
      const errors = this.props.task.errors || []
      const warnings = this.props.task.warnings || []
      this.props.openErrorDialog([...errors, ...warnings])
    }
  }

  renderSpeedOrStatus (task) {
    const speed = this.props.task.paused ? '' : this.formatSpeed(task.speed)
    if (task.state === 'failed') return i18n.__('Task Failed')
    if (task.waiting) return i18n.__('Task Waiting')
    if (task.paused) return i18n.__('Task Paused')
    if (task.state === 'visitless') return i18n.__('Task Visitless')
    if (task.state === 'hashing') return i18n.__('Task Hashing')
    if (task.state === 'diffing') return i18n.__('Task Diffing')
    if (task.state === 'uploadless') return i18n.__('Task Uploadless')
    if (task.state === 'uploading') return speed
    if (task.state === 'downloadless') return i18n.__('Task Downloadless')
    if (task.state === 'downloading') return speed
    if (task.state === 'finish') return i18n.__('Task Finished')
    return i18n.__('Task Unknown State')
  }

  formatSpeed (size) {
    return `${prettySize(size)}/s`
  }

  formatSeconds (seconds) {
    if (!seconds || seconds === Infinity || seconds === -Infinity || this.props.task.paused) return '- - : - - : - -'
    let s = parseInt(seconds, 10)
    let m = 0
    let h = 0
    if (s >= 60) {
      m = parseInt(s / 60, 10)
      s = parseInt(s % 60, 10)
      if (m >= 60) {
        h = parseInt(m / 60, 10)
        m = parseInt(m % 60, 10)
      }
    }
    if (h.toString().length === 1) h = `0${h}`
    if (m.toString().length === 1) m = `0${m}`
    if (s.toString().length === 1) s = `0${s}`
    if (h > 24) return i18n.__('More Than 24 Hours')
    return `${h} : ${m} : ${s}`
  }

  renderSize (task) {
    const finishCount = task.finishCount > 0 ? task.finishCount : 0
    const uploaded = task.count === 1 ? prettySize(task.completeSize) : `${finishCount}/${task.count}`
    return (
      <div style={{ height: 20, width: 160, display: 'flex', alignItems: 'center', color: 'rgba(0,0,0,.54)' }}>
        <div> { uploaded } </div>
        <div style={{ flexGrow: 1 }} />
      </div>
    )
  }

  renderPercent (task) {
    if (!task.size) return '0%'
    const percent = (Math.min(task.completeSize / task.size, 1) * 100).toFixed(1)
    return `${percent}%`
  }

  render () {
    const task = this.props.task
    const pColor = task.paused ? 'rgba(0,0,0,.12)' : '#43a047'
    const pBgColor = task.paused ? 'rgba(0,0,0,.06)' : 'rgba(0,200,83,.12)'
    let pWidth = task.completeSize / task.size * 100
    if (pWidth === Infinity || !pWidth) pWidth = 0

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          margin: '0px 16px 0px 32px',
          width: 'calc(100% - 48px)',
          height: 56,
          fontSize: 12,
          color: 'rgba(0,0,0,0.87)',
          backgroundColor: this.state.isSelected ? '#f4f4f4' : ''
        }}
        onClick={this.selectTaskItem}
      >
        {/* task type */}
        <div style={{ width: 18, margin: '0 16px' }}>
          { task.trsType === 'download' ? <DownloadSvg style={svgStyleSmall} /> : <UploadSvg style={svgStyleSmall} /> }
        </div>

        {/* task item type */}
        <div style={{ width: 24, marginRight: 16 }}>
          {
            task.entries.length > 1 ? <MultiSvg style={svgStyle} />
              : task.taskType === 'file' ? <FileSvg style={svgStyle} />
                : <FolderSvg style={Object.assign({ fill: '#f9a825' }, svgStyle)} />
          }
        </div>

        {/* task item name */}
        <div style={{ flexGrow: 1, position: 'relative' }} >
          <div style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                maxWidth: 240,
                fontSize: 14,
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
          <div>
            { this.renderSize(task) }
          </div>
        </div>

        <div style={{ width: 112 }}>
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: 6,
              marginRight: 12,
              borderRadius: 3,
              backgroundColor: pBgColor
            }}
          >
            <div style={{ backgroundColor: pColor, width: `${pWidth}%` }} />
          </div>
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', height: 24 }}>
            { this.formatSeconds(task.restTime) }
            <div style={{ flexGrow: 1 }} />
            { this.renderPercent(task) }
          </div>
        </div>

        {/* percent */}
        <div style={{ width: 120, textAlign: 'right', marginRight: 24 }}>{ this.renderSpeedOrStatus(task) }</div>

        {/* Pause, resume and delete task */}
        <div style={{ display: 'flex', alignItems: 'center', width: 96 }} >
          {
            task.state === 'failed' && (
              <LIButton onClick={this.checkError} tooltip={i18n.__('Detail')}>
                { task.errors.length ? <InfoSvg color="#F44336" /> : <WarningIcon color="#FB8C00" /> }
              </LIButton>
            )
          }
          {
            task.state !== 'failed' && !task.waiting ? (
              <LIButton iconStyle={svgStyle} onClick={this.toggleTask} tooltip={task.paused ? i18n.__('Resume') : i18n.__('Pause')}>
                { task.paused ? <PlaySvg /> : <PauseSvg /> }
              </LIButton>
            ) : <div style={{ width: 48 }} />
          }
          {
            task.paused &&
              <LIButton iconStyle={svgStyle} onClick={this.props.delete} tooltip={i18n.__('Delete')}>
                <DeleteSvg />
              </LIButton>
          }
        </div>
      </div>
    )
  }
}

export default RunningTask
