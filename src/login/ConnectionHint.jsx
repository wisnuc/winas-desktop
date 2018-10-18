import i18n from 'i18n'
import React from 'react'
import { Divider } from 'material-ui'
import { RSButton } from '../common/Buttons'
import { RefreshIcon, AddDeviceIcon } from '../common/Svg'

class ConnectionHint extends React.PureComponent {
  renderOnlineText () {
    const iconStyle = { color: '#85868c', verticalAlign: 'middle', width: 21, height: 21 }
    return (
      <div style={{ width: 300 }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 60, marginLeft: 20 }}>
          <div style={{ color: 'var(--grey-text)' }}>
            { i18n.__('Try Refresh Hint Part 1') }
            <RefreshIcon style={iconStyle} />
            { i18n.__('Try Refresh Hint Part 2') }
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', height: 60, marginLeft: 20 }}>
          <div style={{ color: 'var(--grey-text)' }}>
            { i18n.__('Try Rebind Hint Part 1') }
            <AddDeviceIcon style={iconStyle} />
            { i18n.__('Try Rebind Hint Part 2') }
          </div>
        </div>
      </div>
    )
  }

  renderLANText () {
    const texts = [
      i18n.__('Device Connection Text 1'),
      i18n.__('Device Connection Text 2')
    ]
    return (
      <div style={{ width: 300 }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 60, marginLeft: 20 }}>
          <div style={{ color: 'var(--grey-text)' }}>
            { i18n.__('LAN Mode Hint') }
          </div>
        </div>
        {
          texts.map(text => (
            <div style={{ display: 'flex', alignItems: 'center', height: 40, marginLeft: 20 }} key={text}>
              <div style={{ height: 6, width: 6, borderRadius: 3, backgroundColor: 'var(--grey-text)', marginRight: 6 }} />
              <div style={{ color: 'var(--grey-text)' }}> { text }</div>
            </div>
          ))
        }
      </div>
    )
  }

  renderAddText () {
    const texts = [
      i18n.__('Add Device Connection Text 1'),
      i18n.__('Add Device Connection Text 2'),
      i18n.__('Add Device Connection Text 3')
    ]
    return (
      <div style={{ width: 300 }}>
        {
          texts.map(text => (
            <div style={{ display: 'flex', alignItems: 'center', height: 40, marginLeft: 20 }} key={text}>
              <div style={{ height: 6, width: 6, borderRadius: 3, backgroundColor: 'var(--grey-text)', marginRight: 6 }} />
              <div style={{ color: 'var(--grey-text)' }}> { text }</div>
            </div>
          ))
        }
      </div>
    )
  }

  render () {
    const { onRequestClose, isLAN, isAdd } = this.props
    const imgName = (isLAN || isAdd) ? 'pic-help-connect-offline.png' : 'pic-help-connect-online.png'
    return (
      <div style={{ width: 320, backgroundColor: '#FFF' }} >
        <div style={{ height: 59, width: '100%', display: 'flex', alignItems: 'center' }}>
          <div style={{ marginLeft: 20 }} className="title">
            { (isLAN || isAdd) ? i18n.__('Offline Device Connection Title') : i18n.__('Online Device Connection Title') }
          </div>
        </div>
        <Divider style={{ marginLeft: 20, width: 'calc(100% - 40px)' }} />
        <div style={{ height: 150, width: '100%' }} className="flexCenter" >
          <img src={`./assets/images/${imgName}`} alt={imgName} width={280} height={150} />
        </div>
        <div style={{ height: 20 }} />
        { isAdd ? this.renderAddText() : isLAN ? this.renderLANText() : this.renderOnlineText() }
        <div style={{ height: 70, width: 'calc(100% - 40px)', display: 'flex', alignItems: 'center', padding: '0 20px' }}>
          <div style={{ flexGrow: 1 }} />
          <RSButton label={i18n.__('Got It')} onClick={onRequestClose} />
        </div>
      </div>
    )
  }
}

export default ConnectionHint
