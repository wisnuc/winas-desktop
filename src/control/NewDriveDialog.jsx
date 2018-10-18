import i18n from 'i18n'
import { Divider } from 'material-ui'
import sanitize from 'sanitize-filename'
import React, { PureComponent } from 'react'
import SimpleScrollBar from '../common/SimpleScrollBar'
import { Checkbox, RSButton, TextField } from '../common/Buttons'

class NewDriveDialog extends PureComponent {
  constructor (props) {
    super(props)

    this.state = {
      loading: false,
      label: (this.props.drive && this.props.drive.label) || '',
      writelist: (this.props.drive && this.props.drive.writelist) || [],
      errorText: ''
    }

    this.isBuiltIn = this.props.drive && this.props.drive.tag === 'built-in'

    this.newDrive = () => {
      this.setState({ loading: true })
      const apis = this.props.apis
      const adminUUID = this.props.users.find(u => u.isFirstUser).uuid
      const args = {
        label: this.state.label,
        writelist: [adminUUID, ...this.state.writelist]
      }
      apis.request('adminCreateDrive', args, (err) => {
        if (!err) {
          this.props.refreshDrives()
          this.props.onRequestClose()
          this.props.openSnackBar(i18n.__('Create Drive Success'))
        } else {
          this.setState({ loading: false })
          console.error('adminCreateDrive failed', err)
          this.props.openSnackBar(i18n.__('Create Drive Failed'))
        }
      })
    }

    this.modifyDrive = () => {
      this.setState({ loading: true })
      const apis = this.props.apis
      const args = {
        uuid: this.props.drive.uuid,
        writelist: this.isBuiltIn ? undefined : this.state.writelist
      }
      if (this.state.label !== (this.props.drive && this.props.drive.label)) Object.assign(args, { label: this.state.label })
      apis.request('adminUpdateDrive', args, (err) => {
        if (!err) {
          this.props.refreshDrives()
          this.props.onRequestClose()
          this.props.openSnackBar(i18n.__('Modify Drive Success'))
        } else {
          this.setState({ loading: false })
          console.error('adminUpdateDrive failed', err)
          this.props.openSnackBar(i18n.__('Modify Drive Failed'))
        }
      })
    }

    this.fire = () => (this.props.type === 'new' ? this.newDrive() : this.modifyDrive())
  }

  updateLabel (value) {
    if (!value) {
      this.setState({ label: value, errorText: '' })
      return
    }
    const drives = this.props.drives.filter(d => d.label !== (this.props.drive && this.props.drive.label))
    const newValue = sanitize(value)
    if (drives.findIndex(drive => drive.label === value) > -1) {
      this.setState({ label: value, errorText: i18n.__('Drive Name Exist Error') })
    } else if (value !== newValue) {
      this.setState({ label: value, errorText: i18n.__('Drive Name Invalid Error') })
    } else {
      this.setState({ label: value, errorText: '' })
    }
  }

  togglecheckAll () {
    this.setState({ writelist: this.state.writelist === '*' ? [] : '*' })
  }

  handleCheck (userUUID) {
    const wl = this.state.writelist
    const index = wl.indexOf(userUUID)
    if (wl === '*') this.setState({ writelist: [userUUID] })
    else if (index === -1) this.setState({ writelist: [...wl, userUUID] })
    else this.setState({ writelist: [...wl.slice(0, index), ...wl.slice(index + 1)] })
  }

  render () {
    const { type, users } = this.props
    const activeUsers = users.filter(u => u.status === 'ACTIVE')

    return (
      <div style={{ width: 280, padding: '0 20px 20px 20px', zIndex: 2000 }}>
        <div style={{ height: 59, display: 'flex', alignItems: 'center' }} className="title">
          { type === 'new' ? i18n.__('Create New Public Drive') : i18n.__('Modify Public Drive') }
        </div>
        <Divider style={{ width: 280 }} className="divider" />
        <div style={{ height: 20 }} />
        <div
          style={{
            height: 20,
            fontSize: 14,
            color: this.state.errorText ? '#fa5353' : '#525a60',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          { this.state.errorText || i18n.__('Public Drive Name') }
        </div>

        <div style={{ marginTop: -30 }}>
          <TextField
            autoFocus
            value={this.state.label}
            onChange={e => this.updateLabel(e.target.value)}
            hintText={i18n.__('Public Drive Name Hint')}
          />
        </div>

        <div style={{ height: 20, marginTop: 10, color: '#525a60', display: 'flex', alignItems: 'center' }}>
          { i18n.__('Permissions') }
        </div>

        <SimpleScrollBar height={Math.min(activeUsers.length * 40, 200)} width={280} >
          {
            activeUsers.map(user => (
              <div style={{ width: '100%', height: 40, display: 'flex', alignItems: 'center' }} key={user.username} >
                <Checkbox
                  alt
                  label={user.isFirstUser ? i18n.__('Myself') : user.username}
                  checked={this.state.writelist === '*' ||
                      (this.state.writelist && this.state.writelist.includes(user.uuid)) || user.isFirstUser}
                  onCheck={() => this.handleCheck(user.uuid)}
                  disabled={this.isBuiltIn || user.isFirstUser}
                />
              </div>
            ))
          }
        </SimpleScrollBar>

        {/* button */}
        <div style={{ height: 40 }} />
        <div style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <RSButton
            alt
            label={i18n.__('Cancel')}
            onClick={this.props.onRequestClose}
          />
          <div style={{ width: 10 }} />
          <RSButton
            label={i18n.__('Confirm')}
            disabled={this.state.label.length === 0 || !!this.state.errorText || this.state.loading}
            onClick={this.fire}
          />
        </div>
      </div>
    )
  }
}

export default NewDriveDialog
