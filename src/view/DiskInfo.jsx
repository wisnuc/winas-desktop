import i18n from 'i18n'
import React from 'react'
import Base from './Base'
import Disk from '../settings/Disk'

class DiskInfo extends Base {
  constructor (ctx) {
    super(ctx)

    this.state = {
    }

    this.refresh = () => {
      this.ctx.props.apis.request('boot')
      this.ctx.props.apis.request('phyDrives')
      this.ctx.props.apis.request('stats')
    }
  }

  willReceiveProps (nextProps) {
    this.handleProps(nextProps.apis, ['boot', 'phyDrives', 'stats'])
  }

  navEnter () {
    this.refresh()
  }

  navGroup () {
    return 'settings'
  }

  menuName () {
    return i18n.__('Disk Menu Name')
  }

  menuDes () {
    return i18n.__('Disk Description')
  }

  menuIcon () {
    const Pic = props => (
      <div {...props}>
        <img src="./assets/images/ic-diskinfo.png" alt="" width={44} height={45} />
      </div>
    )
    return Pic
  }

  renderContent ({ openSnackBar }) {
    return (
      <Disk
        {...this.state}
        {...this.ctx.props}
        refresh={this.refresh}
        openSnackBar={openSnackBar}
      />
    )
  }
}

export default DiskInfo
