import i18n from 'i18n'
import React from 'react'
import Base from './Base'
import Cache from '../settings/Cache'

class CacheClean extends Base {
  navGroup () {
    return 'settings'
  }

  menuName () {
    return i18n.__('CacheClean Menu Name')
  }

  menuDes () {
    return i18n.__('CacheClean Description')
  }

  menuIcon () {
    const Pic = props => (
      <div {...props}>
        <img src="./assets/images/ic-cacheclean.png" alt="" width={44} height={48} />
      </div>
    )
    return Pic
  }

  renderContent ({ openSnackBar }) {
    return (
      <Cache
        {...this.ctx.props}
        openSnackBar={openSnackBar}
      />
    )
  }
}

export default CacheClean
