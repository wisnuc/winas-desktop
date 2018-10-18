import i18n from 'i18n'
import React from 'react'

import { RRButton, Toggle } from '../common/Buttons'
import CircularLoading from '../common/CircularLoading'

class PT extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      loading: false,
      open: this.props.pt && this.props.pt.status === 'on'
    }

    this.singleton = false

    this.saveAsync = async (open) => {
      await this.props.apis.pureRequestAsync('updatePT', { status: this.state.open })
    }

    this.save = () => {
      this.setState({ loading: true })
      this.saveAsync(this.state.open).then(() => {
        this.props.openSnackBar(i18n.__('Operation Success'))
        this.setState({ loading: false })
      }).catch((err) => {
        console.error('pt error', err)
        this.props.openSnackBar(i18n.__('Operation Failed'))
        this.setState({ loading: false })
      })
    }
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.pt && !this.singleton) {
      this.singleton = true
      this.setState({ open: nextProps.pt.status === 'on' })
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
    if (!this.props.pt) return this.renderLoading()
    const isAdmin = this.props.apis.account && this.props.apis.account.data && this.props.apis.account.data.isFirstUser
    const settings = [
      {
        type: i18n.__('PT'),
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
              src="./assets/images/pic_platinumplan.png"
              alt=""
            />
          </div>

          { this.renderRow(settings[0]) }

          <div style={{ width: 320, color: '#888a8c', paddingLeft: 160, height: 46, paddingTop: 14 }} >
            { i18n.__('PT Description') }
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

export default PT
