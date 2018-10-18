import i18n from 'i18n'
import React from 'react'
import { ipcRenderer } from 'electron'
import { AutoSizer } from 'react-virtualized'

import RunningTask from './RunningTask'
import FinishedTask from './FinishedTask'
import ErrorDialogInTrans from './ErrorDialogInTrans'

import ScrollBar from '../common/ScrollBar'
import { LIButton } from '../common/Buttons'
import PureDialog from '../common/PureDialog'
import ConfirmDialog from '../common/ConfirmDialog'
import { StartAllIcon, PauseAllIcon, DeleteAllIcon } from '../common/Svg'

class TrsContainer extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      x: 0,
      y: 0,
      ctrl: false,
      shift: false,
      play: true,
      pause: true,
      menuShow: false,
      tasks: [],
      userTasks: [],
      finishTasks: [],
      clearRunningDialog: false,
      clearFinishedDialog: false,
      finished: false,
      errors: null
    }

    this.taskSelected = []
    this.finishSelected = []

    this.toggleDialog = op => this.setState({ [op]: !this.state[op] })

    /* ipc communication */
    this.pause = (uuid) => {
      ipcRenderer.send('PAUSE_TASK', [uuid])
    }

    this.resume = (uuid) => {
      ipcRenderer.send('RESUME_TASK', [uuid])
    }

    this.ignore = (uuid) => {
      ipcRenderer.send('FINISH_TASK', [uuid])
    }

    this.delete = (tasks) => {
      this.setState({ deleteRunningDialog: true, tasks })
    }

    /* type: 'PAUSE', 'RESUME', 'DELETE' */
    this.handleAll = (tasks, type) => {
      ipcRenderer.send(`${type}_TASK`, tasks.map(t => t.uuid))
    }

    this.open = (task) => {
      ipcRenderer.send('OPEN_TRANSMISSION', task.downloadPath)
    }

    this.openInDrive = (task) => {
      const { driveUUID, dirUUID } = task
      this.props.navToDrive(driveUUID, dirUUID)
    }

    this.openErrorDialog = (errors, finished) => {
      this.setState({ errors, finished })
    }

    this.updateTransmission = (e, userTasks, finishTasks) => {
      const { type } = this.props
      if (type === 'u') {
        this.setState({ userTasks: userTasks.filter(u => u.trsType === 'upload') })
      } else if (type === 'd') {
        this.setState({ userTasks: userTasks.filter(u => u.trsType === 'download') })
      } else if (type === 'f') {
        this.setState({ finishTasks })
      }
    }
  }

  componentDidMount () {
    ipcRenderer.on('UPDATE_TRANSMISSION', this.updateTransmission)
  }

  componentWillUnmount () {
    ipcRenderer.removeListener('UPDATE_TRANSMISSION', this.updateTransmission)
  }

  formatSize (s) {
    const size = parseFloat(s, 10)
    if (!size) return `${0} KB`
    if (size < 1024) return `${size.toFixed(2)} B`
    else if (size < (1024 * 1024)) return `${(size / 1024).toFixed(2)} KB`
    else if (size < (1024 * 1024 * 1024)) return `${(size / 1024 / 1024).toFixed(2)} MB`
    return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`
  }

  calcTotalProcess () {
    let [completeSize, size, speed] = [0, 0, 0]
    this.state.userTasks.forEach((task) => {
      completeSize += task.completeSize
      size += task.size
      speed += task.paused ? 0 : task.speed
    })

    const percent = (Math.min(completeSize / size || 0, 1) * 100).toFixed(2)
    return ({ percent, speed: `${this.formatSize(speed)}/s` })
  }

  renderProcessSum ({ allPaused, type, userTasks }) {
    const pColor = allPaused ? '#9da1a6' : '#31a0f5'
    const bColor = 'rgba(0,0,0,.05)'
    const { percent, speed } = this.calcTotalProcess()

    return (
      <div style={{ height: 50, width: 'calc(100% - 20px)', display: 'flex', alignItems: 'center', backgroundColor: '#fafbfc' }}>
        <div style={{ width: 100, marginLeft: 20, color: '#525a60', letterSpacing: 1.4 }}>
          { type === 'u' ? i18n.__('Uploading Process Summary') : i18n.__('Downloading Process Summary')}
        </div>
        {/* progress bar */}
        <div style={{ display: 'flex', width: 320, height: 6, borderRadius: 3, backgroundColor: bColor }} >
          <div style={{ backgroundColor: pColor, width: `${percent}%`, borderRadius: 3 }} />
        </div>

        <div style={{ width: 14 }} />
        {/* total speed */}
        <div style={{ fontSize: 14, letterSpacing: 1.4, color: '#888a8c' }}>
          { allPaused ? '--' : speed }
        </div>
        <div style={{ flexGrow: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {
            allPaused
              ? (
                <LIButton
                  disabled={!userTasks.length}
                  onClick={() => this.handleAll(userTasks, 'RESUME')}
                  tooltip={i18n.__('Resume All')}
                >
                  <StartAllIcon />
                </LIButton>
              )
              : (
                <LIButton
                  disabled={!userTasks.length}
                  onClick={() => this.handleAll(userTasks, 'PAUSE')}
                  tooltip={i18n.__('Pause All')}
                >
                  <PauseAllIcon />
                </LIButton>
              )
          }
          <LIButton
            disabled={!userTasks.length}
            onClick={() => this.toggleDialog('clearRunningDialog')}
            tooltip={i18n.__('Clear All')}
          >
            <DeleteAllIcon />
          </LIButton>
          <div style={{ width: 30 }} />
        </div>
      </div>
    )
  }

  renderFinishedSum ({ finishTasks }) {
    return (
      <div style={{ height: 50, width: 'calc(100% - 20px)', display: 'flex', alignItems: 'center', backgroundColor: '#fafbfc' }}>
        <div style={{ marginLeft: 20, color: '#525a60', letterSpacing: 1.4 }}>
          { i18n.__('Finished Task Summary %s', finishTasks.length)}
        </div>
        <div style={{ flexGrow: 1 }} />
        <LIButton
          disabled={!finishTasks.length}
          onClick={() => this.toggleDialog('clearFinishedDialog')}
          tooltip={i18n.__('Clear All Record')}
        >
          <DeleteAllIcon />
        </LIButton>
        <div style={{ width: 30 }} />
      </div>
    )
  }

  renderEmpty () {
    const { type } = this.props
    const imgName = this.props.type === 'u' ? 'uploadlistempty' : type === 'd' ? 'downloadlistempty' : 'donelistempty'
    return (
      <div style={{ width: '100%', height: '100%' }} className="flexCenter">
        <img
          width={320}
          height={180}
          src={`./assets/images/pic_${imgName}.png`}
        />
      </div>
    )
  }

  render () {
    const { type } = this.props
    const { userTasks, finishTasks } = this.state

    if ((type === 'f' && !finishTasks.length) || (['u', 'd'].includes(type) && !userTasks.length)) return this.renderEmpty()

    /* show resumeAll button when allPaused = true */
    let allPaused = true
    userTasks.forEach((task) => {
      if (!task.paused) {
        allPaused = false
      }
    })

    const list = []

    if (type === 'd' || type === 'u') {
      /* running task list */
      list.push(...userTasks.map((task, index) => (
        <RunningTask
          key={task.uuid}
          trsType={task.trsType}
          index={index}
          task={task}
          pause={this.pause}
          resume={this.resume}
          delete={this.delete}
          openErrorDialog={this.openErrorDialog}
        />
      )))
    } else if (type === 'f') {
      /* finished task list */
      list.push(...finishTasks.map((task, index) => (
        <FinishedTask
          key={task.uuid}
          index={index}
          task={task}
          handleAll={this.handleAll}
          open={this.open}
          openInDrive={this.openInDrive}
          openErrorDialog={this.openErrorDialog}
        />
      )))
    }

    list.push(<div style={{ height: 60 }} />)

    /* rowCount */
    const rowCount = list.length

    /* rowHeight */
    const rowHeight = 60

    /* rowRenderer */
    const rowRenderer = ({ key, index, style }) => (
      <div key={key} style={Object.assign({ display: 'flex' }, style)}>
        <div style={{ height: '100%', width: 'calc(100% - 20px)' }}> { list[index] } </div>
        <div style={{ width: 20, height: '100%' }} />
      </div>
    )

    return (
      <div
        style={{
          height: '100%',
          width: '100%',
          padding: '20px 0px 0px 20px',
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        {/* Process Summary */}
        { (type === 'd' || type === 'u') && this.renderProcessSum({ allPaused, type, userTasks }) }
        { (type === 'f') && this.renderFinishedSum({ finishTasks }) }

        <AutoSizer>
          {({ height, width }) => (
            <ScrollBar
              allHeight={rowHeight * rowCount}
              height={height - 50}
              width={width}
              rowHeight={rowHeight}
              rowRenderer={rowRenderer}
              rowCount={rowCount}
              overscanRowCount={3}
              style={{ outline: 'none' }}
            />
          )}
        </AutoSizer>

        {/* Delete Running Tasks Dialog */}
        <ConfirmDialog
          open={!!this.state.deleteRunningDialog}
          onCancel={() => this.setState({ deleteRunningDialog: false })}
          onConfirm={() => {
            this.toggleDialog('deleteRunningDialog')
            this.handleAll(this.state.tasks, 'DELETE')
          }}
          title={i18n.__('Delete Running Task Title')}
          text={i18n.__('Delete Running Task Text')}
        />

        {/* clear all Running Tasks dialog */}
        <ConfirmDialog
          open={!!this.state.clearRunningDialog}
          onCancel={() => this.setState({ clearRunningDialog: false })}
          onConfirm={() => {
            this.toggleDialog('clearRunningDialog')
            this.handleAll(userTasks, 'DELETE')
          }}
          title={i18n.__('Clear Running Task Title')}
          text={i18n.__('Clear Running Task Text')}
        />

        {/* clear all Finished Tasks dialog */}
        <ConfirmDialog
          open={!!this.state.clearFinishedDialog}
          onCancel={() => this.setState({ clearFinishedDialog: false })}
          onConfirm={() => {
            this.toggleDialog('clearFinishedDialog')
            this.handleAll(this.state.finishTasks, 'DELETE')
          }}
          title={i18n.__('Clear Finished Task Title')}
          text={i18n.__('Clear Finished Task Text')}
        />

        {/* error dialog */}
        <PureDialog open={!!this.state.errors} onRequestClose={() => this.setState({ errors: null })} >
          {
            this.state.errors &&
              <ErrorDialogInTrans
                errors={this.state.errors}
                resume={this.resume}
                ignore={this.ignore}
                finished={this.state.finished}
                onRequestClose={() => this.setState({ errors: null })}
              />
          }
        </PureDialog>
      </div>
    )
  }
}

export default TrsContainer
