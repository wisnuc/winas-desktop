import i18n from 'i18n'
import React from 'react'
import Base from './Base'
import PT from '../settings/PT'

class PTApp extends Base {
  constructor (ctx) {
    super(ctx)

    this.refresh = () => {
      this.ctx.props.apis.request('pt')
    }
  }

  willReceiveProps (nextProps) {
    this.handleProps(nextProps.apis, ['pt'])
  }

  navEnter () {
    this.refresh()
  }

  navLeave () {
    this.setState({ pt: null })
  }

  navGroup () {
    return 'settings'
  }

  menuName () {
    return i18n.__('PT Menu Name')
  }

  menuDes () {
    return i18n.__('PT Summary')
  }

  menuIcon () {
    const Pic = props => (
      <div {...props}>
        <img src="./assets/images/icon_platiumplan.png" alt="" width={44} height={48} />
      </div>
    )
    return Pic
  }

  renderContent ({ openSnackBar }) {
    return (
      <PT
        {...this.ctx.props}
        {...this.state}
        openSnackBar={openSnackBar}
      />
    )
  }
}

export default PTApp
