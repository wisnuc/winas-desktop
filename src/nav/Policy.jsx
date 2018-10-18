import i18n from 'i18n'
import React from 'react'
import { Checkbox, RadioButtonGroup, RadioButton, Divider } from 'material-ui'
import { RSButton } from '../common/Buttons'
import renderFileIcon from '../common/renderFileIcon'
import { AllFileIcon, PublicIcon } from '../common/Svg'

class PolicyDialog extends React.PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      value: '',
      checked: true,
      current: 0
    }

    this.response = []

    this.toggleCheck = () => this.setState({ checked: !this.state.checked })

    this.fire = () => {
      const session = this.props.data.session
      const response = this.response

      if (this.props.data.actionType) this.props.handleTask(session, response, this.props.data.conflicts)
      else this.props.ipcRenderer.send('resolveConflicts', { session, response, conflicts: this.props.data.conflicts })

      this.props.onRequestClose()
    }

    this.cancel = () => {
      const session = this.props.data.session
      if (!this.props.data.actionType) this.props.ipcRenderer.send('resolveConflicts', { session, response: null })
      this.props.onRequestClose()
    }

    this.next = () => {
      let current = this.state.current + 1
      const c = this.props.data.conflicts
      this.response[this.state.current] = this.state.value
      if (this.state.checked) {
        while (c[current] && c[current].type === c[current - 1].type) {
          this.response[current] = this.state.value
          current += 1
        }
      }
      if (current === c.length) this.fire()
      else this.setState({ current, value: '' })
    }

    this.handleChange = (value) => {
      this.response[this.state.current] = value
      this.setState({ value })
    }
  }

  renderChoice () {
    const { name, entryType, remote } = this.props.data.conflicts[this.state.current]
    const type = entryType === 'directory' ? i18n.__('Directory') : i18n.__('File')
    const remoteType = remote.type === 'directory' ? i18n.__('Directory') : i18n.__('File')
    let action = i18n.__('Uploading')
    if (this.props.data.actionType === 'copy') action = i18n.__('Copying')
    if (this.props.data.actionType === 'move') action = i18n.__('Moving')
    /* file => file */
    const choices = [
      { value: 'rename', label: i18n.__('Rename Text {{type}} {{action}}', { type, action }) },
      { value: 'replace', label: i18n.__('Replace Text {{type}} {{remoteType}} {{action}}', { type, remoteType, action }) },
      { value: 'skip', label: i18n.__('Skip Text {{type}} {{action}}', { type, action }) }
    ]

    /* directory => directory */
    if (entryType === 'directory' && entryType === remote.type) {
      choices.splice(
        0, 2,
        { value: 'merge', label: i18n.__('Merge Text {{action}}', { action }) },
        { value: 'overwrite', label: i18n.__('Overwrite Text {{action}}', { action }) }
      )
    }

    let text = i18n.__('Default Conflict Title {{type}} {{name}} {{action}}', { type, name, action })

    /* directory => file || file => directory */
    if (entryType !== remote.type) {
      text = i18n.__('Alt Conflict Title {{type}} {{name}} {{remoteType}} {{action}}', { type, name, remoteType, action })
    }

    /* default: choose the first option */
    if (!this.state.value) Object.assign(this.state, { value: choices[0].value })
    return (
      <div>
        {/* title */}
        <div style={{ height: 60, display: 'flex', alignItems: 'center' }} >
          <div style={{ marginRight: 4, marginLeft: -6 }} className="flexCenter">
            {
              type === 'public' ? <PublicIcon style={{ width: 60, height: 60, color: '#ffa93e' }} />
                : type === 'directory' ? <AllFileIcon style={{ width: 60, height: 60, color: '#ffa93e' }} />
                  : renderFileIcon(name, null, 60)
            }
          </div>
          <div style={{ wordBreak: 'break-all', color: '#85868c' }}> { text } </div>
        </div>
        <div style={{ height: 10 }} />

        {/* choice */}
        <RadioButtonGroup
          key={this.state.current}
          onChange={(e, value) => this.handleChange(value)}
          defaultSelected={choices[0].value}
          name="policy"
        >
          {
            choices.map(c => (
              <RadioButton
                disableTouchRipple
                key={c.value}
                style={{ margin: '16px 0', height: 24 }}
                labelStyle={{ color: '#505259', fontSize: 14, marginLeft: -4 }}
                iconStyle={{ fill: this.state.value === c.value ? '#31a0f5' : '#85868c', width: 16 }}
                value={c.value}
                label={c.label}
              />
            ))
          }
        </RadioButtonGroup>
      </div>
    )
  }

  render () {
    const c = this.props.data.conflicts
    const leftCount = c.filter((conflict, index) => index > this.state.current && conflict.type === c[this.state.current].type).length

    return (
      <div style={{ width: 380, padding: '0 20px' }}>
        <div style={{ height: 60, display: 'flex', alignItems: 'center' }} className="title">
          { i18n.__('Name Conflict') }
        </div>
        <Divider style={{ width: 380 }} className="divider" />
        <div style={{ height: 20 }} />

        { this.renderChoice() }
        <div style={{ height: 10 }} />
        {
          leftCount > 0 &&
            <div style={{ height: 40, display: 'flex', alignItems: 'center' }} >
              <Checkbox
                label={i18n.__('Apply All Text %d', leftCount)}
                disableTouchRipple
                style={{ width: 380 }}
                iconStyle={{ height: 18, width: 18, marginTop: 2, fill: this.state.checked ? '#31a0f5' : 'rgba(0,0,0,.25)' }}
                labelStyle={{ fontSize: 14, color: '#85868c', marginLeft: -9 }}
                checked={this.state.checked}
                onCheck={this.toggleCheck}
              />
            </div>
        }
        <div style={{ height: 74, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <div style={{ flexGrow: 1 }} />
          <RSButton label={i18n.__('Cancel')} onClick={this.cancel} alt />
          <div style={{ width: 10 }} />
          <RSButton label={i18n.__('Confirm')} onClick={this.next} disabled={this.state.fired} />
        </div>
      </div>
    )
  }
}

export default PolicyDialog
