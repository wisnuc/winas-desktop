import React from 'react'
import i18n from 'i18n'
import Base from './Base'
import SleepMode from '../settings/SleepMode'

class Sleep extends Base {
  constructor (ctx) {
    super(ctx)

    this.refresh = () => {
      this.ctx.props.apis.request('sleep')
    }
  }

  navGroup () {
    return 'settings'
  }

  menuName () {
    return i18n.__('SleepMode Menu Name')
  }

  menuDes () {
    return i18n.__('SleepMode Description')
  }

  menuIcon () {
    const Pic = props => (
      <div {...props}>
        <img src="./assets/images/ic-sleepmode.png" alt="" width={44} height={48} />
      </div>
    )
    return Pic
  }

  willReceiveProps (nextProps) {
    this.handleProps(nextProps.apis, ['sleep'])
  }

  navEnter () {
    this.refresh()
  }

  navLeave () {
    this.setState({ sleep: null })
  }

  renderContent ({ openSnackBar }) {
    return (
      <SleepMode
        {...this.state}
        {...this.ctx.props}
        openSnackBar={openSnackBar}
      />
    )
  }
}

export default Sleep
