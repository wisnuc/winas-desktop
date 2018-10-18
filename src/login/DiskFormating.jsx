import i18n from 'i18n'
import React from 'react'
import CheckIcon from 'material-ui/svg-icons/navigation/check'
import { RSButton } from '../common/Buttons'
import CircularLoading from '../common/CircularLoading'

class DiskFormating extends React.PureComponent {
  render () {
    const { status, onRequestClose, onSuccess, type } = this.props

    let [text, img, label, color, func] = ['', '', '', '#31a0f5', () => {}]
    switch (status) {
      case 'busy':
        color = '#31a0f5'
        img = <CircularLoading />
        text = type === 'recover' ? i18n.__('Recover Disk Busy Text')
          : type === 'repair' ? i18n.__('Repair Disk Busy Text') : i18n.__('Disk Format Busy Text')
        break
      case 'success':
        color = '#31a0f5'
        label = i18n.__('OK')
        func = () => onSuccess()
        img = <CheckIcon color="#31a0f5" style={{ width: 52, height: 52 }} />
        text = type === 'recover' ? i18n.__('Recover Disk Success Text')
          : type === 'repair' ? i18n.__('Repair Disk Success Text') : i18n.__('Disk Format Success Text')
        break
      case 'error':
        color = '#fa5353'
        label = i18n.__('OK')
        func = () => onRequestClose()
        img = <img src="./assets/images/pic-loadingfailed.png" width={52} height={52} />
        text = type === 'recover' ? i18n.__('Recover Disk Error Text')
          : type === 'repair' ? i18n.__('Repair Disk Error Text') : i18n.__('Disk Format Error Text')
        break
      default:
        break
    }

    return (
      <div style={{ width: 240, height: 214, backgroundColor: 'transparent', paddingTop: 54 }}>
        <div style={{ height: status !== 'busy' ? 214 : 160, backgroundColor: '#FFF', transition: 'height 175ms' }}>
          <div style={{ height: 40 }} />
          <div style={{ width: '100%', height: 60 }} className="flexCenter">
            { img }
          </div>
          <div style={{ fontSize: 14, color, height: 20 }} className="flexCenter">
            { text }
          </div>
          <div style={{ height: 40 }} />
          <div style={{ height: 34, opacity: status !== 'busy' ? 1 : 0, transition: 'opacity 175ms 175ms' }} className="flexCenter" >
            <RSButton
              label={label}
              onClick={func}
              style={{ width: 152, height: 34 }}
            />
          </div>
          <div style={{ height: 20 }} />
        </div>
      </div>
    )
  }
}
export default DiskFormating
