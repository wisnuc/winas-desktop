import i18n from 'i18n'
import React from 'react'
import { IconButton } from 'material-ui'
import DateIcon from 'material-ui/svg-icons/action/today'
import ImageIcon from 'material-ui/svg-icons/image/image'
import CameraIcon from 'material-ui/svg-icons/image/camera'
import FileIcon from 'material-ui/svg-icons/editor/insert-drive-file'
import LoactionIcon from 'material-ui/svg-icons/communication/location-on'
import Map from '../common/map'
import prettySize from '../common/prettySize'
import { EditIcon, CloseIcon } from '../common/Svg'
import SimpleScrollBar from '../common/SimpleScrollBar'

const week = () => [i18n.__('Sunday'), i18n.__('Monday'), i18n.__('Tuesday'), i18n.__('Wednesday'), i18n.__('Thursday'), i18n.__('Friday'), i18n.__('Saturday')]

const phaseDate = (time, type) => {
  const a = new Date(time)
  const year = a.getFullYear()
  const month = a.getMonth() + 1
  const date = a.getDate()
  const hour = a.getHours()
  const min = a.getMinutes()
  if (type === 'date') return i18n.__('Parse Date %s %s %s', year, month, date)
  if (type === 'week') return week()[a.getDay()]
  if (type === 'time') return `${hour} : ${min}`
  return a
}

const parseExifTime = (time, type) => {
  const a = time.replace(/\s+/g, ':').split(':')
  const date = new Date()
  date.setFullYear(a[0], a[1] - 1, a[2])
  if (type === 'date') return i18n.__('Parse Date %s %s %s', a[0], a[1], a[2])
  if (type === 'time') return `${a[3]} : ${a[4]}`
  if (type === 'week') return week()[date.getDay()]
  return `${i18n.__('Parse Date %s %s %s', a[0], a[1], a[2])} ${week()[date.getDay()]} ${a[3]} : ${a[4]}`
}

const getResolution = (height, width) => {
  let res = height * width
  if (res > 100000000) {
    res = Math.ceil(res / 100000000)
    return i18n.__('Get 100 Million Resolution {{res}} {{alt}}}', { res, alt: res * 100, height, width })
  } else if (res > 10000) {
    res = Math.ceil(res / 10000)
    return i18n.__('Get 0.01 Million Resolution {{res}} {{alt}}', { res, alt: res / 100, height, width })
  }
  return i18n.__('Get Resolution {{res}}', { res, height, width })
}

const convertGPS = (gps) => {
  let result = { latitude: null, longitude: null }
  const array = gps && gps.split(', ').map(a => a.split(' ')).map(b => b.map(c => (/^[0-9]/.test(c) ? parseFloat(c, 10) : c)))

  if (!array || array.length !== 2) return result
  array.forEach((a) => {
    const value = Math.round((a[0] + a[2] / 60 + a[3] / 3600) * 1000) / 1000
    switch (a[4]) {
      case 'N':
        result.latitude = value
        break
      case 'E':
        result.longitude = value
        break
      case 'S':
        result.latitude = -1 * value
        break
      case 'W':
        result.longitude = -1 * value
        break
      default:
        result = { latitude: null, longitude: null }
    }
  })
  return result
}

class DetailInfo extends React.PureComponent {
  renderLine (Icon, primaryText, secondaryText) {
    const lineStyle = { height: 72, display: 'flex', alignItems: 'center', marginLeft: 24 }
    return (
      <div style={lineStyle} key={primaryText + secondaryText}>
        <Icon color="rgba(0,0,0,0.54)" />
        <div style={{ marginLeft: 32 }}>
          <div style={{ color: 'rgba(0,0,0,0.87)', lineHeight: '24px', maxWidth: 176 }} className="text">
            { primaryText }
          </div>
          <div style={{ color: 'rgba(0,0,0,0.54)', fontSize: 14, lineHeight: '20px' }}>
            { secondaryText }
          </div>
        </div>
      </div>
    )
  }

  render () {
    const { name, size, hash } = this.props.entry
    const mtime = this.props.entry.bmtime || this.props.entry.mtime
    const metadata = this.props.entry.metadata || {}
    const { date, gps, h, w, make, model } = metadata

    const { latitude, longitude } = convertGPS(gps)
    const lineStyle = { height: 72, display: 'flex', alignItems: 'center', marginLeft: 24 }

    const lines = [
      [
        FileIcon,
        name,
        prettySize(size)
      ],
      [
        EditIcon,
        phaseDate(mtime, 'date'),
        `${phaseDate(mtime, 'week')} ${phaseDate(mtime, 'time')} (${i18n.__('Date Modified')})`
      ]
    ]
    if (date) {
      lines.push([
        DateIcon,
        parseExifTime(date, 'date'),
        `${parseExifTime(date, 'week')} ${parseExifTime(date, 'time')} (${i18n.__('Date Taken')})`
      ])
    }
    if (h && w) lines.push([ImageIcon, getResolution(h, w), `${h} x ${w}`])
    if (make && model) lines.push([CameraIcon, model, make])

    return (
      <div style={{ WebkitAppRegion: 'no-drag' }}>
        <div style={{ fontSize: 18, height: 48, display: 'flex', alignItems: 'center', marginLeft: 24 }}>
          { i18n.__('Info') }
          <div style={{ flexGrow: 1 }} />
          <IconButton tooltip={i18n.__('Close')} onClick={this.props.toggleDetail} iconStyle={{ color: 'rgba(0,0,0,.54)' }}>
            <CloseIcon />
          </IconButton>
          <div style={{ width: 8 }} />
        </div>
        <div style={{ height: 'calc(100% - 48px)', width: '100%', position: 'absolute' }}>
          <SimpleScrollBar height="100%" width={280}>
            <div>
              { lines.map(([Icon, primaryText, secondaryText]) => this.renderLine(Icon, primaryText, secondaryText)) }
              {/* location */}
              {
                gps && longitude !== null && latitude !== null &&
                  <div style={lineStyle}>
                    <LoactionIcon color="rgba(0,0,0,0.54)" />
                    <div style={{ marginLeft: 32 }}>
                      <div style={{ color: 'rgba(0,0,0,0.87)', lineHeight: '24px', height: 24 }} id={`map_${hash}`} />
                      <div style={{ color: 'rgba(0,0,0,0.54)', fontSize: 14, lineHeight: '20px' }}>
                        { `${longitude}, ${latitude}` }
                      </div>
                    </div>
                  </div>
              }

              {/* map */}
              {
                gps && longitude !== null && latitude !== null &&
                <div style={{ width: 280, height: 280 }}>
                  <Map
                    longitude={longitude}
                    latitude={latitude}
                    resultId={`map_${hash}`}
                    unknownRegionText={i18n.__('Unknown Region')}
                  />
                </div>
              }
            </div>
          </SimpleScrollBar>
        </div>
      </div>
    )
  }
}

export default DetailInfo
