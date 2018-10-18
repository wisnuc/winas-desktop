import i18n from 'i18n'
import React from 'react'
import { Divider } from 'material-ui'
import { RRButton, Checkbox } from '../common/Buttons'

class ConfirmPT extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      checked: true
    }

    this.fire = () => {
      this.setState({ loading: true })
      const deviceSN = this.props.loginData.dev.mdev.deviceSN
      this.props.phi.req('updatePT', { status: !!this.state.checked, deviceSN }, (err) => {
        if (err) console.error('updatePT error', err)
        this.props.deviceLogin(this.props.loginData)
        this.setState({ loading: false })
      })
    }

    this.handleCheck = () => {
      this.setState({ checked: !this.state.checked })
    }
  }

  render () {
    return (
      <div style={{ width: 320, zIndex: 200, position: 'relative' }} className="paper" >
        <div
          style={{ height: 59, display: 'flex', alignItems: 'center', paddingLeft: 19 }}
          className="title"
        >
          { i18n.__('PT Plan') }
        </div>
        <Divider style={{ marginLeft: 20, width: 280 }} className="divider" />
        <div style={{ height: 150, paddingBottom: 30 }} className="flexCenter">
          <img
            style={{ width: 280, height: 150 }}
            src="./assets/images/pic-plantiumplan.png"
            alt=""
          />
        </div>

        <div style={{ width: 280, color: '#888a8c', paddingLeft: 20, height: 46, paddingTop: 5 }} >
          { i18n.__('PT Description') }
        </div>
        <div style={{ width: '100%', height: 30 }} className="flexCenter">
          <div style={{ marginTop: -4 }}>
            <Checkbox
              onCheck={this.handleCheck}
              checked={this.state.checked}
            />
          </div>
          <div style={{ color: '#505259', fontSize: 13, marginLeft: -10 }} >
            { i18n.__('Join PT') }
          </div>
        </div>

        <div style={{ height: 20 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RRButton
            label={this.state.loading ? i18n.__('Saving') : i18n.__('Save')}
            onClick={this.fire}
            loading={this.state.loading}
          />
        </div>
        <div style={{ height: 30 }} />
      </div>
    )
  }
}

export default ConfirmPT
