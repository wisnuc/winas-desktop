import i18n from 'i18n'
import React from 'react'
import Base from './Base'
import UpdateApp from '../settings/ClientUpdateApp'

class Update extends Base {
  navGroup () {
    return 'settings'
  }

  menuName () {
    return i18n.__('ClientUpdate Menu Name')
  }

  menuDes () {
    return i18n.__('ClientUpdate Description')
  }

  menuIcon () {
    const Pic = props => (
      <div {...props}>
        <img src="./assets/images/ic-update.png" alt="" width={44} height={48} />
      </div>
    )
    return Pic
  }

  renderContent ({ openSnackBar }) {
    return (
      <UpdateApp
        {...this.ctx.props}
        openSnackBar={openSnackBar}
      />
    )
  }
}

export default Update
