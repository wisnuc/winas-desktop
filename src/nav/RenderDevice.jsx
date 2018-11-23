import React from 'react'
import i18n from 'i18n'
import prettysize from 'prettysize'

import CircularLoading from '../common/CircularLoading'
import FlatButton from '../common/FlatButton'

class Disk extends React.PureComponent {
  renderLoading () {
    return (
      <div style={{ width: 260, height: 396, display: 'flex', alignItems: 'center', justifyContent: 'center' }} >
        <CircularLoading />
      </div>
    )
  }

  render () {
    console.log('render this.props', this.props)
    const { apis, selectedDevice } = this.props
    if (!apis || !selectedDevice) return this.renderLoading()
    const { space } = selectedDevice
    const { stats } = apis
    if (!space || !stats || !stats.data || !space.data) return this.renderLoading()

    const { audio, document, image, video } = stats.data
    const other = stats.data.others || { totalSize: 0 }
    if (!audio || !document || !image || !video) return (<div />)
    const { available, used } = space.data
    const usedPercent = used / (available + used)
    const countTotal = (video.totalSize + image.totalSize + audio.totalSize + document.totalSize + other.totalSize) / usedPercent

    const videoSize = video.totalSize / countTotal
    const imageSize = image.totalSize / countTotal
    const audioSize = audio.totalSize / countTotal
    const documentSize = document.totalSize / countTotal
    const otherSize = other.totalSize / countTotal

    const data = [
      { color: '#2196f3', progress: videoSize, title: i18n.__('Video'), size: video.totalSize },
      { color: '#aa00ff', progress: imageSize, title: i18n.__('Picture'), size: image.totalSize },
      { color: '#f2497d', progress: audioSize, title: i18n.__('Music'), size: audio.totalSize },
      { color: '#ffb300', progress: documentSize, title: i18n.__('Document'), size: document.totalSize },
      { color: '#00c853', progress: otherSize, title: i18n.__('Others'), size: other.totalSize }
    ]

    return (
      <div style={{ width: 260, height: 396 }}>
        <div style={{ height: 56, position: 'relative', paddingLeft: 24, paddingTop: 16 }}>
          <div style={{ height: 24, fontSize: 18, fontWeight: 500, color: 'rgba(0,0,0,.76)' }}>
            Wisnuc Office
          </div>
          <div style={{ height: 22, fontSize: 12, color: 'rgba(14,5,10,.54)' }}>
            当前设备
          </div>
          <div style={{ position: 'absolute', top: 16, right: 8 }}>
            <FlatButton
              primary
              label={i18n.__('Change Device')}
              onClick={this.props.deviceLogout}
            />
          </div>
        </div>
        <div
          style={{
            height: 16,
            width: 212,
            backgroundColor: '#eceff1',
            borderRadius: 4,
            overflow: 'hidden',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {
            data.map(v => (
              <div style={{ backgroundColor: v.color, width: v.progress * 200, height: 16, marginRight: 3 }} key={v.color} />
            ))
          }
        </div>
        <div style={{ width: 212, margin: '0 auto', display: 'flex', alignItems: 'center' }}>
          {
            data.map(({ color, title }) => (
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 4, width: 100 }} key={title}>
                <div style={{ width: 8, height: 8, backgroundColor: color, marginTop: 2 }} />
                <div style={{ fontSize: 12, color: '#505259', marginLeft: 4 }}>
                  { title }
                </div>
              </div>
            ))
          }
        </div>
        <div style={{ width: '100%', height: 1, marginTop: 31, backgroundColor: '#e8eaed' }} />
        <div style={{ width: 212, height: 240, padding: '8px 24px' }} >
          {
            data.map(({ title, size }) => (
              <div style={{ height: 48, display: 'flex', alignItems: 'center', width: '100%' }} key={title}>
                <div style={{ fontSize: 16, fontWeight: 500, color: 'rgba(0,0,0,.76)' }}> { title }</div>
                <div style={{ flexGrow: 1 }} />
                <div style={{ fontWeight: 500, color: 'rgba(0,0,0,.76)' }}> { prettysize(size) } </div>
              </div>
            ))
          }
        </div>

      </div>
    )
  }
}

export default Disk
