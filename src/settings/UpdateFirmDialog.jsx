import i18n from 'i18n'
import React from 'react'
import { Divider } from 'material-ui'

import { CloseIcon } from '../common/Svg'
import UploadingFirmware from './UploadingFirmware'
import { RSButton, LIButton } from '../common/Buttons'
import SimpleScrollBar from '../common/SimpleScrollBar'

class Update extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      confirmed: false
    }

    this.fire = () => {
      if (this.state.fired) return
      this.setState({ confirmed: true })
    }
  }

  renderUpdating () {
    return (
      <UploadingFirmware
        {...this.props}
        jumpToUpgrade
        onRequestClose={() => this.setState({ uploading: false })}
      />
    )
  }

  renderConfirm () {
    const { rel, device, onRequestClose } = this.props
    const text = (rel.software_info && rel.software_info.split('\r\n')) || []
    const time = rel.releaseTime.slice(0, 10).split('-')
    const currentVersion = device.swVersion
    const ltsVersion = rel.tag_name

    return (
      <div style={{ padding: '0 20px', backgroundColor: '#FFF' }}>
        <div style={{ height: 60, display: 'flex', alignItems: 'center' }} className="title">
          { i18n.__('Firmware Update Title') }
          <div style={{ flexGrow: 1 }} />
          <div style={{ marginRight: -10 }}>
            <LIButton onClick={onRequestClose}> <CloseIcon /> </LIButton>
          </div>
        </div>
        <div
          style={{
            width: 280,
            height: 150,
            border: 'solid 1px #eaeaea',
            boxSizing: 'border-box',
            overflowX: 'hidden',
            overflowY: 'auto'
          }}
        >
          <div style={{ height: 40, display: 'flex', alignItems: 'center', color: '#505259', marginLeft: 10 }}>
            { i18n.__('New Version Release Time %s %s %s', time[0], time[1], time[2]) }
          </div>
          <Divider style={{ width: 280 }} />
          <SimpleScrollBar height={108} width={268} style={{ marginLeft: 10 }}>
            <div style={{ height: 20, marginTop: 10, color: '#505259' }}>
              { i18n.__('Update Content') }
            </div>
            <div style={{ height: 5 }} />
            {
              text.map((v, i) => (
                <div style={{ lineHeight: '20px', color: '#85868c', width: 260 }} key={i.toString()}>
                  { v }
                </div>
              ))
            }
          </SimpleScrollBar>
        </div>

        <div style={{ height: 20, width: '100%', display: 'flex', alignItems: 'center', marginTop: 10 }}>
          { i18n.__('Current Version') }
        </div>
        <div style={{ width: 150, color: '#888a8c', height: 40, display: 'flex', alignItems: 'center' }}>
          { currentVersion }
        </div>
        <Divider style={{ width: 280 }} />

        <div style={{ height: 20, width: '100%', display: 'flex', alignItems: 'center', marginTop: 10 }}>
          { i18n.__('Latest Version') }
        </div>
        <div style={{ width: 150, color: '#888a8c', height: 40, display: 'flex', alignItems: 'center' }}>
          { ltsVersion }
        </div>
        <Divider style={{ width: 280 }} />

        <div style={{ height: 20 }} />

        <div style={{ height: 34, width: '100%', display: 'flex', alignItems: 'center', padding: '20px 0' }}>
          <div style={{ flexGrow: 1 }} />
          <RSButton label={i18n.__('Update Now')} onClick={this.fire} disabled={this.state.fired} />
        </div>
      </div>
    )
  }

  render () {
    const view = this.state.confirmed ? this.renderUpdating() : this.renderConfirm()
    return (
      <div style={{ width: this.state.confirmed ? 240 : 320 }}>
        { view }
      </div>
    )
  }
}

export default Update
