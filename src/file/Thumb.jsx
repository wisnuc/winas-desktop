import UUID from 'uuid'
import React from 'react'

import renderFileIcon from '../common/renderFileIcon'

class Thumb extends React.PureComponent {
  constructor (props) {
    super(props)

    this.path = ''

    this.updatePath = (event, session, path) => {
      if (this.session === session) {
        this.path = path
        this.thumb = false
        this.forceUpdate()
      }
    }

    this.onFailed = (event, session) => {
      if (this.session === session) {
        this.thumb = true
        this.forceUpdate()
      }
    }
  }

  componentDidMount () {
    this.session = UUID.v4()
    this.props.ipcRenderer.send('mediaShowThumb', this.session, this.props.digest, 200, 200, this.props.station)
    this.props.ipcRenderer.on('getThumbSuccess', this.updatePath)
    this.props.ipcRenderer.on('getThumbFailed', this.onFailed)
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.digest !== this.props.digest) {
      this.session = UUID.v4()
      this.props.ipcRenderer.send('mediaShowThumb', this.session, nextProps.digest, 200, 200, this.props.station)
    }
  }

  componentWillUnmount () {
    this.props.ipcRenderer.removeListener('getThumbSuccess', this.updatePath)
    this.props.ipcRenderer.removeListener('getThumbFailed', this.onFailed)
    this.props.ipcRenderer.send('mediaHideThumb', this.session)
  }

  render () {
    const style = Object.assign(
      { objectFit: this.props.full ? 'contain' : 'cover', transition: 'all 225ms cubic-bezier(0.0, 0.0, 0.2, 1)' },
      this.props.imgStyle || {}
    )
    return (
      <div style={{ width: '100%', height: '100%', backgroundColor: this.props.bgColor || '#FFF' }}>
        {
          this.path &&
            <img
              src={this.path}
              alt="img"
              height={this.props.height}
              width={this.props.width}
              style={style}
              draggable={false}
            />
        }
        {
          this.thumb &&
            <div style={{ width: '100%', height: '100%' }} className="flexCenter">
              { renderFileIcon(this.props.name, this.props.metadata, 50) }
            </div>
        }
      </div>
    )
  }
}
export default Thumb
