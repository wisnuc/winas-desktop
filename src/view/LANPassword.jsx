import React from 'react'
import i18n from 'i18n'
import Base from './Base'
import LANPassword from '../settings/LANPassword'

class LAN extends Base {
  navGroup () {
    return 'settings'
  }

  menuName () {
    return i18n.__('LANPassword Menu Name')
  }

  menuDes () {
    const isLAN = !!this.ctx.props.account.lan
    return isLAN ? i18n.__('LANPassword Modify Description') : i18n.__('LANPassword Reset Description')
  }

  menuIcon () {
    const Pic = props => (
      <div {...props}>
        <img src="./assets/images/ic-offlinepassword.png" alt="" width={42} height={49} />
      </div>
    )
    return Pic
  }

  renderContent ({ openSnackBar }) {
    return (
      <LANPassword
        {...this.ctx.props}
        isLAN={!!this.ctx.props.account.lan}
        openSnackBar={openSnackBar}
      />
    )
  }
}

export default LAN
