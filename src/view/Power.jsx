import React from 'react'
import i18n from 'i18n'
import Base from './Base'
import PowerApp from '../settings/PowerApp'

class Power extends Base {
  navGroup () {
    return 'settings'
  }

  menuName () {
    return i18n.__('Power Menu Name')
  }

  menuDes () {
    return i18n.__('Power Description')
  }

  menuIcon () {
    const Pic = props => (
      <div {...props}>
        <img src="./assets/images/ic-restart.png" alt="" width={44} height={48} />
      </div>
    )
    return Pic
  }

  renderContent ({ openSnackBar }) {
    return (
      <PowerApp
        {...this.ctx.props}
        openSnackBar={openSnackBar}
      />
    )
  }
}

export default Power
