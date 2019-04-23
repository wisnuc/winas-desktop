import i18n from 'i18n'
import React from 'react'
import { Checkbox } from 'material-ui'
import Dialog from '../common/PureDialog'
import FlatButton from '../common/FlatButton'

class ConfirmDialog extends React.PureComponent {
  /**
   * @param {object} props
   * @param {bool} props.open
   * @param {function} props.onCancel
   * @param {function} props.onConfirm
   * @param {string} props.title
   * @param {*} props.text content text, function or string
   * @param {string} props.checkText  text of Checkbox
   * @param {string} props.workingText text when working
   */
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
    const { open, onCancel, title, text, checkText, workingText } = this.props
    const content = !open ? '' : (typeof text === 'function' && open) ? text() : text
    return (
      <Dialog open={open} onRequestClose={onCancel} modal >
        {
          open && (
            <div style={{ width: 320 }} >
              <div style={{ height: 60, display: 'flex', alignItems: 'center', paddingLeft: 20, fontSize: 20 }}>
                { title }
              </div>
              <div style={{ height: 20 }} />
              <div
                style={{
                  width: 280,
                  padding: '0 20px',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'rgba(0,0,0,.54)'
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
              <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <FlatButton label={i18n.__('Cancel')} primary onClick={onCancel} />
                <FlatButton
                  primary
                  onClick={this.onFire}
                  disabled={this.state.fired}
                  label={(this.state.fired && workingText) ? workingText : i18n.__('Confirm')}
                />
              </div>
            </div>
          )
        }
      </Dialog>
    )
  }
}

export default ConfirmDialog
