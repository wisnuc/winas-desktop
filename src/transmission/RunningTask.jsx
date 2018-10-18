import i18n from 'i18n'
import React from 'react'

import { LIButton } from '../common/Buttons'
import renderFileIcon from '../common/renderFileIcon'
import { FolderIcon, TaskStartIcon, TaskPauseIcon, TaskDeleteIcon,
  MultiDownloadIcon, MultiUploadIcon, TransErrorIcon } from '../common/Svg'

class RunningTask extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      isSelected: false
    }

    this.updateDom = (isSelected) => {
      this.setState({ isSelected })
    }

    this.toggleTask = () => {
      const task = this.props.task
      if (task.paused && !task.waiting) this.props.resume(task.uuid)
      else this.props.pause(task.uuid)
    }

    this.checkError = () => {
      const errors = this.props.task.errors || []
      const warnings = this.props.task.warnings || []
      this.props.openErrorDialog([...errors, ...warnings], this.props.task.finishCount)
    }
  }

  statusOrSpeed (task) {
    if (task.state === 'failed') return i18n.__('Task Failed')
    if (task.waiting) return i18n.__('Task Waiting')
    if (task.paused) return i18n.__('Task Paused')
    if (task.state === 'uploading' || task.state === 'downloading') return this.formatSpeed(task.speed)
    if (task.state === 'visitless') return i18n.__('Task Visitless')
    if (task.state === 'hashing') return i18n.__('Task Hashing')
    if (task.state === 'diffing') return i18n.__('Task Diffing')
    if (task.state === 'uploadless') return i18n.__('Task Uploadless')
    if (task.state === 'downloadless') return i18n.__('Task Downloadless')
    if (task.state === 'finish') return i18n.__('Task Finished')
    // if (task.state === 'downloading') return i18n.__('Task Downloading')
    // if (task.state === 'uploading') return i18n.__('Task Uploading')
    return i18n.__('Task Unknown State')
  }

  formatSize (s) {
    const size = parseFloat(s, 10)
    if (!size) return `${0} KB`
    if (size < 1024) return `${size.toFixed(2)} B`
    else if (size < (1024 * 1024)) return `${(size / 1024).toFixed(2)} KB`
    else if (size < (1024 * 1024 * 1024)) return `${(size / 1024 / 1024).toFixed(2)} MB`
    return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`
  }

  formatSpeed (size) {
    return `${this.formatSize(size)}/s`
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

  renderPercent (task) {
    if (!task.size) return '0%'
    const percent = (Math.min(task.completeSize / task.size, 1) * 100).toFixed(2)
    return `${percent}%`
  }

  render () {
    const { index, task } = this.props
    const pColor = task.paused ? 'rgba(0,0,0,.12)' : '#31a0f5'
    let pWidth = task.completeSize / task.size * 100
    if (pWidth === Infinity || !pWidth) pWidth = 0
    const backgroundColor = this.state.isSelected ? '#f4f4f4' : index % 2 ? '#fafbfc' : '#FFF'

    const finishCount = task.finishCount > 0 ? task.finishCount : 0
    const finishedSize = task.count === 1
      ? `${this.formatSize(task.completeSize)}/${this.formatSize(task.size)}`
      : `${this.formatSize(task.completeSize)}/${this.formatSize(task.size)}（${finishCount}/${task.count}）`

    const isRunning = task.paused && !task.waiting

    return (
      <div style={{ display: 'flex', alignItems: 'center', height: 60, backgroundColor }} >
        {/* task item type */}
        <div style={{ width: 33, paddingLeft: 17, display: 'flex', alignItems: 'center' }}>
          {
            task.entries.length > 1 ? (task.trsType === 'download' ? <MultiDownloadIcon /> : <MultiUploadIcon />)
              : task.taskType === 'file' ? renderFileIcon(task.name, null, 30)
                : <FolderIcon style={{ width: 30, height: 30 }} />
          }
        </div>

        {/* task item name */}
        <div style={{ width: 'calc(100% - 516px)', padding: '10px 0 10px 12px' }} >
          <div style={{ display: 'flex', alignItems: 'center', height: 20, color: '#525a60', letterSpacing: 1.4 }} >
            <div
              style={{ maxWidth: task.entries.length > 1 ? 'calc(100% - 200px)' : '100%' }}
              className="text"
            >
              { task.name }
            </div>
            <div>
              { task.entries.length > 1 && i18n.__('And Other %s Items', task.entries.length)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', height: 20, fontSize: 12, letterSpacing: 1.2, color: '#888a8c' }} >
            { finishedSize }
          </div>
        </div>

        {/* progress bar */}
        <div style={{ width: 280, padding: '10px 0' }} >
          <div style={{ display: 'flex', alignItems: 'center', height: 20 }} >
            <div style={{ display: 'flex', width: 280, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,.05)' }} >
              <div style={{ backgroundColor: pColor, width: `${pWidth}%` }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', height: 20, fontSize: 12, letterSpacing: 1.2, color: '#888a8c' }} >
            <div>
              { this.statusOrSpeed(task) }
            </div>
            <div style={{ flexGrow: 1 }} />
            <div>
              { this.formatSeconds(task.restTime) }
            </div>
          </div>
        </div>

        {/* Pause, resume and delete task */}
        <div
          style={{ width: 174, display: 'flex', alignItems: 'center' }}
          onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          <div style={{ width: 44 }} />
          {
            task.state === 'failed'
              ? (
                <LIButton onClick={this.checkError} tooltip={i18n.__('Detail')} >
                  <TransErrorIcon />
                </LIButton>
              )
              : (
                <LIButton onClick={this.toggleTask} tooltip={isRunning ? i18n.__('Resume') : i18n.__('Pause')} >
                  { isRunning ? <TaskStartIcon /> : <TaskPauseIcon /> }
                </LIButton>
              )
          }
          <LIButton
            onClick={() => this.props.delete([task])}
            tooltip={i18n.__('Delete')}
          >
            <TaskDeleteIcon />
          </LIButton>
          <div style={{ width: 30 }} />
        </div>
      </div>
    )
  }
}

export default RunningTask
