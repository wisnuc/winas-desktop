import i18n from 'i18n'
import React from 'react'
import { Divider } from 'material-ui'

import Dialog from '../common/PureDialog'
import { CloseIcon } from '../common/Svg'
import { RSButton, LIButton } from '../common/Buttons'

class ConfirmDialog extends React.PureComponent {
  constructor (props) {
    super(props)

    this.onConfirm = (accept) => {
      const deviceSN = this.props.dev && this.props.dev.mdev.deviceSN
      this.props.phi.req('invitation', { deviceSN, accept }, (err, res) => {
        let msg = ''
        if (!err && res && res.error === '0') {
          msg = accept === 'yes' ? i18n.__('Accept Invitation Success') : i18n.__('Reject Invitation Success')
          this.props.openSnackBar(msg)
          this.props.refresh()
        } else {
          console.error('confirm invitation error', err, res)
          msg = accept === 'yes' ? i18n.__('Accept Invitation Failed') : i18n.__('Reject Invitation Failed')
          if (err && err.error && err.msg) msg = msg.concat('：').concat(err.msg)
        }
        this.props.openSnackBar(msg)
        this.props.onClose()
        this.props.refresh()
      })
    }
  }

  getStationName () {
    if (!this.props.dev) return 'N2'
    const { mdev } = this.props.dev
    if (mdev && mdev.stationName) return mdev.stationName
    const mac = mdev && mdev.mac
    if (mac) return `N2-${mac.slice(-2)}`
    return 'N2'
  }

  render () {
    const { open, onClose } = this.props
    const stationName = this.getStationName()
    return (
      <Dialog open={open} onRequestClose={onClose} modal >
        {
          open && (
            <div style={{ width: 320 }} >
              <div style={{ height: 60, display: 'flex', alignItems: 'center', paddingLeft: 20 }} className="title">
                { i18n.__('Confirm Invitation Title') }
                <div style={{ flexGrow: 1 }} />
                <LIButton tooltip={i18n.__('Close')} onClick={onClose}> <CloseIcon /> </LIButton>
                <div style={{ width: 10 }} />
              </div>
              <Divider style={{ marginLeft: 20, width: 280 }} className="divider" />
              <div style={{ height: 20 }} />
              <div
                style={{
                  width: 280,
                  padding: '0 20px',
                  display: 'flex',
                  alignItems: 'center',
                  lineHeight: '30px',
                  color: 'var(--grey-text)'
                }}
              >
                { i18n.__('%s Confirm Invitation Text', stationName) }
              </div>
              <div style={{ height: 20 }} />
              <div style={{ height: 34, width: 'calc(100% - 40px)', display: 'flex', alignItems: 'center', padding: 20 }}>
                <div style={{ flexGrow: 1 }} />
                <RSButton label={i18n.__('Reject')} onClick={() => this.onConfirm('no')} alt />
                <div style={{ width: 10 }} />
                <RSButton label={i18n.__('Accept')} onClick={() => this.onConfirm('yes')} />
              </div>
            </div>
          )
        }
      </Dialog>
    )
  }
}

export default ConfirmDialog
