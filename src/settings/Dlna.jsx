import i18n from 'i18n'
import React from 'react'

import { RRButton, Toggle } from '../common/Buttons'
import CircularLoading from '../common/CircularLoading'

class Dlna extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      loading: false,
      open: this.props.dlna && !!this.props.dlna.isActive
    }

    this.singleton = false

    this.saveAsync = async (open) => {
      await this.props.apis.pureRequestAsync('updateDlna', { op: open ? 'start' : 'close' })
      await this.props.apis.requestAsync('dlna')
    }

    this.save = () => {
      this.setState({ loading: true })
      this.saveAsync(this.state.open).then(() => {
        this.props.openSnackBar(i18n.__('Operation Success'))
        this.setState({ loading: false })
      }).catch((err) => {
        console.error('dlna error', err)
        this.props.openSnackBar(i18n.__('Operation Failed'))
        this.setState({ loading: false })
      })
    }
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.dlna && !this.singleton) {
      this.singleton = true
      this.setState({ open: nextProps.dlna.isActive })
    }
  }

  renderRow ({ type, enabled, func }) {
    return (
      <div style={{ height: 40, width: '100%', display: 'flex', alignItems: 'center' }} key={type}>
        <div style={{ width: 130, textAlign: 'right', color: '#525a60' }}>
          { type }
        </div>
        <div style={{ flexGrow: 1 }} />
        <Toggle
          toggled={enabled}
          onToggle={func}
        />
      </div>
    )
  }

  renderLoading () {
    return (
      <div style={{ width: '100%', height: 'calc(100% - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} >
        <CircularLoading />
      </div>
    )
  }

  render () {
    if (!this.props.dlna) return this.renderLoading()
    const isAdmin = this.props.apis.account && this.props.apis.account.data && this.props.apis.account.data.isFirstUser
    const settings = [
      {
        type: i18n.__('Dlna'),
        enabled: this.state.open,
        func: () => isAdmin && this.setState({ open: !this.state.open })
      }
    ]
    return (
      <div style={{ width: '100%', height: '100%' }} className="flexCenter" >
        <div style={{ width: 480, paddingRight: 160, paddingBottom: 60 }}>
          <div style={{ height: 180, width: 320, paddingLeft: 160 }} className="flexCenter">
            <img
              style={{ width: 320, height: 180 }}
              src="./assets/images/pic_dlna.png"
              alt=""
            />
          </div>

          { this.renderRow(settings[0]) }

          <div style={{ width: 320, color: '#888a8c', paddingLeft: 160, height: 60, display: 'flex', alignItems: 'center' }} >
            { i18n.__('Dlna Description') }
          </div>

          <div style={{ height: 40 }} />

          {
            isAdmin &&
              <div style={{ width: 240, height: 40, margin: '0 auto', paddingLeft: 160 }}>
                <RRButton
                  label={this.state.loading ? i18n.__('Saving') : i18n.__('Save')}
                  onClick={this.save}
                  loading={this.state.loading}
                />
              </div>
          }
        </div>
      </div>
    )
  }
}

export default Dlna
