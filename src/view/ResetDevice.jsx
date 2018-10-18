import i18n from 'i18n'
import React from 'react'
import Base from './Base'
import Reset from '../settings/Reset'

class ResetDevice extends Base {
  navGroup () {
    return 'settings'
  }

  menuName () {
    return i18n.__('ResetDevice Menu Name')
  }

  menuDes () {
    return i18n.__('ResetDevice Description')
  }

  menuIcon () {
    const Pic = props => (
      <div {...props}>
        <img src="./assets/images/ic-restore.png" alt="" width={44} height={48} />
      </div>
    )
    return Pic
  }

  renderContent ({ openSnackBar }) {
    return (
      <Reset
        {...this.ctx.props}
        openSnackBar={openSnackBar}
      />
    )
  }
}

export default ResetDevice
