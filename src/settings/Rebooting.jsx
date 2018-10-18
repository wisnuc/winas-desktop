import i18n from 'i18n'
import React from 'react'
import CheckIcon from 'material-ui/svg-icons/navigation/check'
import { RSButton } from '../common/Buttons'
import CircularLoading from '../common/CircularLoading'

class Loading extends React.PureComponent {
  render () {
    const { status, onSuccess, type, error, onFailed } = this.props

    let [text, img, label, color, func] = ['', '', '', '#31a0f5', () => {}]
    switch (status) {
      case 'busy':
        color = '#31a0f5'
        img = <CircularLoading />
        text = type === 'reboot' ? i18n.__('Reboot Busy Text') : i18n.__('Shutdown Busy Text')
        break
      case 'success':
        color = '#31a0f5'
        label = i18n.__('OK')
        func = () => onSuccess()
        img = <CheckIcon color="#31a0f5" style={{ width: 52, height: 52 }} />
        text = type === 'reboot' ? i18n.__('Reboot Success Text') : i18n.__('Shutdown Success Text')
        break
      case 'error':
        color = '#fa5353'
        label = i18n.__('OK')
        func = () => onFailed()
        img = <img src="./assets/images/pic-loadingfailed.png" width={52} height={52} />
        text = typeof error === 'string' ? error : (type === 'reboot' ? i18n.__('Reboot Error Text') : i18n.__('Shutdown Error Text'))
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
export default Loading
