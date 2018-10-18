import i18n from 'i18n'
import React from 'react'
import { Divider } from 'material-ui'
import sanitize from 'sanitize-filename'
import { RSButton, TextField } from '../common/Buttons'

class NewFolderDialog extends React.PureComponent {
  constructor (props) {
    super(props)
    this.state = {
      value: '',
      errorText: '',
      loading: false
    }

    this.handleChange = (value) => {
      const newValue = sanitize(value)
      const entries = this.props.entries
      if (entries.findIndex(entry => entry.name === value) > -1) {
        this.setState({ value, errorText: i18n.__('Name Exist Error') })
      } else if (value !== newValue) {
        this.setState({ value, errorText: i18n.__('Name Invalid Error') })
      } else {
        this.setState({ value, errorText: '' })
      }
    }

    this.mkdir = () => {
      const { apis, path } = this.props
      const curr = path[path.length - 1]
      const args = {
        driveUUID: path[0].uuid,
        dirUUID: curr.uuid,
        dirname: this.state.value
      }
      apis.request('mkdir', args, (err) => {
        if (err) {
          console.error('mkdir error', err, err.code)
          this.setState({ errorText: i18n.__('Mkdir Failed'), loading: false })
        } else {
          this.props.onRequestClose(true)
          this.props.openSnackBar(i18n.__('Mkdir Success'))
          this.props.refresh({ fileName: this.state.value })
        }
      })
    }

    this.mkPhyDir = () => {
      const { apis, path } = this.props

      const args = {
        id: [...path].pop().id,
        path: path.filter(p => p.type === 'directory').map(p => p.name).join('/'),
        dirname: this.state.value
      }
      apis.request('mkPhyDir', args, (err) => {
        if (err) {
          console.error('mkdir error', err, err.code)
          this.setState({ errorText: i18n.__('Mkdir Failed'), loading: false })
        } else {
          this.props.onRequestClose(true)
          this.props.openSnackBar(i18n.__('Mkdir Success'))
          this.props.refresh({ fileName: this.state.value })
        }
      })
    }

    this.fire = () => {
      this.setState({ loading: true })
      if (this.props.path[0].uuid) this.mkdir()
      else this.mkPhyDir()
    }

    this.onKeyDown = (e) => {
      if (e.which === 13 && !this.state.errorText && this.state.value.length !== 0) this.fire()
    }
  }

  render () {
    return (
      <div style={{ width: 280, padding: '0 20px 20px 20px', zIndex: 2000 }}>
        <div style={{ height: 59, display: 'flex', alignItems: 'center' }} className="title">
          { i18n.__('Create New Folder') }
        </div>
        <Divider style={{ width: 280 }} className="divider" />
        <div style={{ height: 60 }}>
          <TextField
            autoFoucus
            hintText={i18n.__('Mkdir Hint')}
            errorText={this.state.errorText}
            value={this.state.value}
            onKeyDown={this.onKeyDown}
            onChange={e => this.handleChange(e.target.value)}
            disabled={this.state.loading}
          />
        </div>
        <div style={{ height: 40 }} />
        <div style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <RSButton
            alt
            label={i18n.__('Cancel')}
            onClick={this.props.onRequestClose}
          />
          <div style={{ width: 10 }} />
          <RSButton
            label={i18n.__('Create')}
            disabled={this.state.value.length === 0 || !!this.state.errorText || this.state.loading}
            onClick={this.fire}
          />
        </div>
      </div>
    )
  }
}

export default NewFolderDialog
