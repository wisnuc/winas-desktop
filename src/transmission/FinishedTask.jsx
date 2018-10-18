import i18n from 'i18n'
import React from 'react'
import { LIButton } from '../common/Buttons'
import renderFileIcon from '../common/renderFileIcon'
import { FolderIcon, OpenFolderIcon, TaskDeleteIcon, ArrowIcon, MultiDownloadIcon, MultiUploadIcon } from '../common/Svg'

class FinishedTask extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      isSelected: false
    }

    this.createDate = new Date()

    this.openFileLocation = (task) => {
      if (this.props.task.trsType === 'download') setImmediate(() => this.props.open(task))
      else setImmediate(() => this.props.openInDrive(task))
    }
  }

  shouldComponentUpdate (nextProps, nextState) {
    return (this.state !== nextState)
  }

  formatSize (s) {
    const size = parseFloat(s, 10)
    if (!size) return `${0} KB`
    if (size < 1024) return `${size.toFixed(2)} B`
    else if (size < (1024 * 1024)) return `${(size / 1024).toFixed(2)} KB`
    else if (size < (1024 * 1024 * 1024)) return `${(size / 1024 / 1024).toFixed(2)} MB`
    return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`
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
    const { index, task } = this.props
    const backgroundColor = this.state.isSelected ? '#f4f4f4' : index % 2 ? '#fafbfc' : '#FFF'

    return (
      <div
        style={{ display: 'flex', alignItems: 'center', height: 60, backgroundColor }}
        onDoubleClick={() => this.openFileLocation(task)}
      >
        {/* task item type */}
        <div style={{ width: 33, paddingLeft: 17, display: 'flex', alignItems: 'center' }}>
          {
            task.entries.length > 1 ? (task.trsType === 'download' ? <MultiDownloadIcon /> : <MultiUploadIcon />)
              : task.taskType === 'file' ? renderFileIcon(task.name, null, 30)
                : <FolderIcon style={{ width: 30, height: 30 }} />
          }
        </div>

        {/* task item name */}
        <div style={{ width: 'calc(100% - 683px)', padding: '20px 0 20px 12px', display: 'flex', alignItems: 'center', height: 60 }} >
          <div
            style={{
              position: 'relative',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              height: 20,
              color: '#525a60',
              letterSpacing: 1.4
            }}
          >
            <div
              style={{ maxWidth: task.entries.length > 1 ? 'calc(100% - 100px)' : '100%' }}
              className="text"
            >
              { task.name }
            </div>
            <div>
              { task.entries.length > 1 && i18n.__('And Other %s Items', task.entries.length)}
            </div>
          </div>
        </div>

        <div style={{ width: 200, color: '#888a8c', fontSize: 12 }} >
          { this.formatSize(task.size) }
        </div>

        <div style={{ width: 50 }} className="flexCenter">
          <ArrowIcon
            style={task.trsType === 'upload' ? { color: '#8a69ed', transform: 'rotate(180deg)', width: 50, height: 50 } : { color: '#4dbc72', width: 50, height: 50 }}
          />
        </div>

        <div style={{ width: 200, color: '#888a8c', fontSize: 12 }} >
          { this.getFinishDate(task.finishDate) }
        </div>

        <div
          style={{ width: 170, display: 'flex', alignItems: 'center' }}
          onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          <div style={{ width: 40 }} />
          <LIButton onClick={() => this.openFileLocation(task)} tooltip={i18n.__('Open In Folder')} >
            <OpenFolderIcon />
          </LIButton>
          <LIButton
            onClick={() => this.props.handleAll([task], 'DELETE')}
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

export default FinishedTask
