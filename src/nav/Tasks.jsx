import React from 'react'
import i18n from 'i18n'
import { LinearProgress, Divider } from 'material-ui'
import { AutoSizer } from 'react-virtualized'
import DoneIcon from 'material-ui/svg-icons/action/done'
import ErrorBox from '../common/ErrorBox'
import { FLButton, SIButton } from '../common/Buttons'
import CircularLoading from '../common/CircularLoading'
import ScrollBar from '../common/ScrollBar'
import { CloseIcon, InfoIcon } from '../common/Svg'

class Tasks extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      error: null,
      tasks: [],
      loading: true,
      uuid: ''
    }

    this.toggleDetail = (uuid) => {
      this.setState({ uuid: this.state.uuid === uuid ? '' : uuid })
    }

    this.cancelTask = (uuid) => {
      this.props.apis.pureRequest('deleteTask', { uuid }, (err, res) => {
        if (err) console.error('deleteTask error', err)
        this.refresh()
      })
    }

    this.clearFinished = () => {
      if (!this.state.tasks || !this.state.tasks.length) return
      this.state.tasks.filter(t => !!t.finished).forEach((t) => {
        this.props.apis.pureRequest('deleteTask', { uuid: t.uuid })
      })
    }

    this.refresh = () => {
      this.props.apis.pureRequest('tasks', null, (err, res) => {
        if (err || !Array.isArray(res)) {
          this.setState({ error: 'NoData', loading: false })
        } else if (res.length) {
          this.setState({ tasks: [...res].reverse(), loading: false }, () => this.clearFinished())
        } else this.props.onRequestClose()
      })
    }

    this.handleConflict = (uuid, type, nodes) => {
      const data = {
        session: uuid,
        actionType: type,
        conflicts: nodes.map((n) => {
          const name = n.src.name
          const entryType = n.type
          const nodeUUID = n.src.uuid
          const remote = { type: n.error && n.error.xcode === 'EISDIR' ? 'directory' : 'file' }
          return ({ name, entryType, remote, nodeUUID })
        })
      }
      this.props.openMovePolicy(data)
    }

    this.onCancelAll = () => {
      if (!this.state.tasks || !this.state.tasks.length) return
      this.state.tasks.forEach((t) => {
        this.props.apis.pureRequest('deleteTask', { uuid: t.uuid })
      })
      setTimeout(() => this.refresh(), 200)
    }
  }

  componentDidMount () {
    this.refresh()
    this.timer = setInterval(() => this.state.tasks.some(t => !t.finished) && this.refresh(), 1000)
  }
  componentDidUpdate () {
    if (this.state.tasks && this.state.tasks.length && ![...this.state.tasks].filter(t => !(t.finished || t.allFinished)).length) {
      this.props.onRequestClose()
    }
  }

  componentWillUnmount () {
    this.state.tasks.filter(t => t.finished || t.allFinished).forEach((t) => {
      this.props.apis.pureRequest('deleteTask', { uuid: t.uuid })
    })
    clearInterval(this.timer)
  }

  renderLoading () {
    return <CircularLoading />
  }

  renderError () {
    return i18n.__('Failed To Load Task Data')
  }

  renderNoTask () {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} >
        { i18n.__('No Running Tasks') }
      </div>
    )
  }

  renderTask ({ style, key, task }) {
    const { uuid, type, entries, nodes, batch } = task
    const action = type === 'copy' ? i18n.__('Copying') : i18n.__('Moving')
    const conflict = batch ? [] : nodes.filter(n => n.state === 'Conflict')
    const error = batch ? [] : nodes.filter(n => n.state === 'Failed')
    const finished = batch ? task.allFinished : task.finished

    return (
      <div style={style} key={key}>
        <div style={{ height: 40, width: '100%', display: 'flex', alignItems: 'center', color: '#85868c', fontSize: 11 }}>
          {/* Progress */}
          <div style={{ flexGrow: 1 }} >
            <div style={{ width: '100%', height: 20, display: 'flex', alignItems: 'center' }} >
              { action }
              <div style={{ width: 4 }} />
              <div
                style={{
                  fontSize: 11,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  maxWidth: entries.length > 1 ? 60 : 120
                }}
              >
                { batch ? entries[0] && entries[0].name : entries[0] }
              </div>
              <div style={{ width: 4 }} />
              { entries.length > 1 && i18n.__('And Other %s Items', entries.length) }
              <div style={{ flexGrow: 1 }} />
              {
                finished ? i18n.__('Finished') : error.length ? i18n.__('Task Failed')
                  : conflict.length ? i18n.__('Task Conflict Text') : ''
              }
            </div>

            <div style={{ height: 10, width: '100%', display: 'flex', alignItems: 'center', fontSize: 11 }}>
              <LinearProgress
                mode={(finished || conflict.length > 0 || error.length > 0) ? 'determinate' : 'indeterminate'}
                value={finished ? 100 : 61.8}
                style={{ backgroundColor: '#E0E0E0' }}
              />
            </div>
          </div>

          {/* Button */}
          <div style={{ width: 8 }} />
          {
            finished ? (<SIButton onClick={() => this.cancelTask(uuid)} tooltip={i18n.__('OK')} > <DoneIcon /> </SIButton>)
              : error.length ? (
                <ErrorBox
                  style={{ display: 'flex', alignItems: 'center' }}
                  tooltip={i18n.__('Detail')}
                  iconStyle={{ color: '#db4437' }}
                  error={error}
                />
              ) : conflict.length
                ? (
                  <SIButton
                    tooltip={i18n.__('Detail')}
                    iconStyle={{ width: 24, height: 24 }}
                    onClick={() => this.handleConflict(uuid, type, conflict)}
                  >
                    <InfoIcon />
                  </SIButton>
                )
                : (<SIButton onClick={() => this.cancelTask(uuid)} tooltip={i18n.__('Cancel')} > <CloseIcon /> </SIButton>)
          }
          <div style={{ width: 16 }} />
        </div>
      </div>
    )
  }

  renderTasks (tasks) {
    const rowCount = tasks.length
    const rowHeight = 40
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <AutoSizer>
          {({ height, width }) => (
            <ScrollBar
              allHeight={rowHeight * rowCount}
              height={height}
              width={width}
              rowHeight={rowHeight}
              rowRenderer={({ style, key, index }) => this.renderTask({ style, key, task: tasks[index] })}
              rowCount={rowCount}
              overscanRowCount={3}
              style={{ outline: 'none' }}
            />
          )}
        </AutoSizer>
      </div>
    )
  }

  render () {
    const tasks = [...this.state.tasks].filter(t => !t.finished)
    const height = Math.min(Math.max(50, 10 + tasks.length * 40), 130)
    return (
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          right: 30,
          width: 312,
          minHeight: 90,
          backgroundColor: '#FFF',
          transition: 'all 175ms',
          boxShadow: '0 0 30px 0 rgba(23, 99, 207, 0.2)'
        }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      >
        <div style={{ height: 40, width: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ color: '#85868c', fontSize: 14, marginLeft: 16 }}>
            { i18n.__('Xcopy Tasks') }
          </div>
          <div style={{ flexGrow: 1 }} />
          <div style={{ marginRight: 16 }}>
            {
              this.state.error
                ? <SIButton onClick={this.props.onRequestClose} tooltip={i18n.__('Close')} > <CloseIcon /> </SIButton>
                : <FLButton label={i18n.__('Cancel All')} onClick={this.onCancelAll} />
            }
          </div>
        </div>
        <Divider style={{ marginLeft: 16, width: 280 }} className="divider" />
        <div
          style={{ height, width: 296, marginLeft: 16, padding: '5px 0', position: 'relative', fontSize: 14, color: '#85868c' }}
          className="flexCenter"
        >
          {
            this.state.loading ? this.renderLoading() : this.state.error ? this.renderError()
              : tasks.length ? this.renderTasks(tasks) : this.renderNoTask()
          }
        </div>
      </div>
    )
  }
}

export default Tasks
