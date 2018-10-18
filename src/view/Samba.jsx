import React from 'react'
import i18n from 'i18n'
import Base from './Base'
import Samba from '../settings/Samba'

class SambaApp extends Base {
  constructor (ctx) {
    super(ctx)

    this.refresh = () => {
      this.ctx.props.apis.request('samba')
      this.ctx.props.apis.request('drives')
    }
  }

  willReceiveProps (nextProps) {
    this.handleProps(nextProps.apis, ['samba', 'drives'])
  }

  navEnter () {
    this.refresh()
  }

  navLeave () {
    this.setState({ samba: null, drives: null })
  }

  navGroup () {
    return 'settings'
  }

  menuName () {
    return i18n.__('Samba Menu Name')
  }

  menuDes () {
    return i18n.__('Samba Description')
  }

  menuIcon () {
    const Pic = props => (
      <div {...props}>
        <img src="./assets/images/ic-samba.png" alt="" width={44} height={48} />
      </div>
    )
    return Pic
  }

  renderContent ({ openSnackBar }) {
    return (
      <Samba
        {...this.ctx.props}
        {...this.state}
        refresh={this.refresh}
        openSnackBar={openSnackBar}
      />
    )
  }
}

export default SambaApp
