import React from 'react'
import { ipcRenderer } from 'electron'

class TransCount extends React.PureComponent {
  constructor () {
    super()
    this.state = {
      num: 0
    }

    this.updateTransmission = (e, userTasks, finishedTasks) => {
      let length = 0
      if (!this.props.type) length = userTasks.length
      else if (this.props.type === 'finished') length = finishedTasks.length
      else if (this.props.type === 'uploading') length = userTasks.filter(t => t.trsType === 'upload').length
      else if (this.props.type === 'downloading') length = userTasks.filter(t => t.trsType === 'download').length
      const num = Math.min(length, 100)
      if (num !== this.state.num) {
        this.setState({ num })
      }
    }
  }

  componentDidMount () {
    ipcRenderer.on('UPDATE_TRANSMISSION', this.updateTransmission)
  }

  componentWillUnmount () {
    ipcRenderer.removeListener('UPDATE_TRANSMISSION', this.updateTransmission)
  }

  render () {
    const { num } = this.state
    const width = num < 10 ? 16 : num < 100 ? 25 : 30
    if (this.props.type) {
      return (
        <div style={{ color: '#505259', fontSize: 16, opacity: !num ? 0 : 1 }}> {`(${num < 1000 ? num : '999+'})`}
        </div>
      )
    }
    return (
      <div
        style={{ position: 'relative', width: '100%', height: '100%' }}
        className="flexCenter"
      >
        <div
          style={{
            width,
            height: 16,
            borderRadius: 8,
            backgroundColor: '#e63939',
            fontSize: 12,
            color: '#FFF',
            opacity: !num ? 0 : 1,
            transition: 'all 225ms'
          }}
          className="flexCenter"
        >
          { num < 100 ? num : '99+' }
        </div>
      </div>
    )
  }
}

export default TransCount
