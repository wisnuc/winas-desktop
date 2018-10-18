import i18n from 'i18n'
import React from 'react'
import Base from './Base'

class Settings extends Base {
  navGroup () {
    return 'settings'
  }

  menuName () {
    return i18n.__('Settings Menu Name')
  }

  renderContent () {
    return (<div />)
  }
}

export default Settings
