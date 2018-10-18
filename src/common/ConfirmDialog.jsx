import i18n from 'i18n'
import React from 'react'
import { Checkbox, Divider } from 'material-ui'
import { RSButton } from '../common/Buttons'
import Dialog from '../common/PureDialog'

class ConfirmDialog extends React.PureComponent {
  constructor (props) {
    super(props)
    this.state = { check: false, fired: false }
    this.handleCheck = () => this.setState({ check: !this.state.check })
    this.onFire = () => {
      this.setState({ fired: true }, () => this.props.onConfirm(this.state.check))
    }
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.open && !this.props.open) this.setState({ fired: false })
  }

  render () {
    const { open, onCancel, title, text, checkText } = this.props
    const content = !open ? '' : (typeof text === 'function' && open) ? text() : text
    return (
      <Dialog open={open} onRequestClose={onCancel} modal >
        {
          open && (
            <div style={{ width: 320 }} >
              <div style={{ height: 60, display: 'flex', alignItems: 'center', paddingLeft: 20 }} className="title">
                { title }
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
                { content }
              </div>
              {
                !!checkText && (
                  <div style={{ height: 40, width: 280, marginLeft: 20, display: 'flex', alignItems: 'center' }}>
                    <Checkbox
                      label={checkText}
                      disableTouchRipple
                      style={{ width: 280 }}
                      iconStyle={{ height: 18, width: 18, marginTop: 2, fill: this.state.check ? '#31a0f5' : 'rgba(0,0,0,.25)' }}
                      labelStyle={{ fontSize: 14, color: '#85868c', marginLeft: -9 }}
                      checked={this.state.check}
                      onCheck={() => this.handleCheck()}
                    />
                  </div>
                )
              }
              <div style={{ height: 20 }} />
              <div style={{ height: 34, width: 'calc(100% - 40px)', display: 'flex', alignItems: 'center', padding: 20 }}>
                <div style={{ flexGrow: 1 }} />
                <RSButton label={i18n.__('Cancel')} onClick={onCancel} alt />
                <div style={{ width: 10 }} />
                <RSButton label={i18n.__('Confirm')} onClick={this.onFire} disabled={this.state.fired} />
              </div>
            </div>
          )
        }
      </Dialog>
    )
  }
}

export default ConfirmDialog
