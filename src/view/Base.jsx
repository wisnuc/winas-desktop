import React from 'react'
import i18n from 'i18n'
import { teal500, pinkA200 } from 'material-ui/styles/colors'
import NavigationMenu from 'material-ui/svg-icons/navigation/menu'
import { IconButton } from 'material-ui'
import EventEmitter from 'eventemitter3'

import ConfirmDialog from '../common/ConfirmDialog'
import convertCode from '../transmission/convertCode'

class Base extends EventEmitter {
  constructor (ctx) {
    super()
    this.ctx = ctx
    this.state = {}

    this.handleProps = (apis, keys) => {
      /* waiting */
      if (!apis || keys.findIndex(key => !apis[key] || apis[key].isPending()) > -1) return

      /* handle rejected */
      const rejected = keys.find(key => apis[key].isRejected())
      const reason = rejected && apis[rejected].reason()
      if (rejected && reason !== this.state.error) this.setState({ error: reason })
      else if (!rejected) {
        /* now all keys are fulfilled */
        keys.forEach((key) => {
          const value = apis[key].value()
          if (this.state[key] !== value) this.setState({ [key]: value, error: null })
        })
      }
    }
  }

  setState (props) {
    this.state = Object.assign({}, this.state, props)
    this.emit('updated', this.state)
  }

  forceUpdate () {
    this.emit('updated', this.state)
  }

  willReceiveProps (nextProps) {
  }

  navEnter () {
  }

  navLeave () {
  }

  navRoot () {
  }

  navGroup () {
    return 'unfiled'
  }

  groupPrimaryColor () {
    return teal500
  }

  groupAccentColor () {
    return pinkA200
  }

  menuName () {
  }

  menuDes () {
    return this.menuName()
  }

  menuIcon () {
  }

  menuSelectedIcon () {
    return this.menuIcon()
  }

  quickName () {
    return this.menuName()
  }

  quickIcon () {
    return this.menuIcon()
  }

  hasQuickNav () {
    return true
  }

  // 'light' or 'transparent', no appBarColor required
  // 'colored' or 'dark', should further provide appBarColor
  appBarStyle () {
    return 'light'
  }

  appBarColor () {
    return this.groupPrimaryColor()
  }

  primaryColor () {
    return this.groupPrimaryColor()
  }

  accentColor () {
    return this.groupAccentColor()
  }

  prominent () {
    return false
  }

  showQuickNav () {
    return true
  }

  hasDetail () {
    return false
  }

  detailEnabled () {
    return true
  }

  detailWidth () {
    return 360
  }

  detailIcon () {
    return null
  }

  renderTitle ({ style }) {
    return <div style={style}>{this.menuName()}</div>
  }

  renderNavigationMenu ({ style, onClick }) {
    return (
      <div style={style}>
        <IconButton onClick={onClick}>
          <NavigationMenu color="#FFF" />
        </IconButton>
      </div>
    )
  }

  renderToolBar ({ style }) {
    return <div style={style} />
  }

  renderSnackBar ({ style }) {
    return <div style={style} />
  }

  renderDetail ({ style }) {
    return <div style={style} />
  }

  renderDragItems () {
    return <div />
  }

  renderDefaultError () {
    const res = this.state.error.response
    const isDirNotFound = res && res.body && res.body.message === 'dir not found'
    const isUnauthorized = this.state.error.status === 401
    const code = this.state.error.code || (this.state.error.response && this.state.error.response.code)
    const textViaCode = code ? convertCode(code) : i18n.__('Error in Base Text')
    console.log(this.state, code)
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} >
        <div>
          <img
            width={260}
            height={160}
            src={`./assets/images/${isDirNotFound ? 'pic_nofile.png'
              : isUnauthorized ? 'pic_nodevice.png' : 'pic_network_failed.png'}`}
          />
          <div style={{ textAlign: 'center' }} >
            { !window.navigator.onLine ? i18n.__('Offline Text') : isUnauthorized ? i18n.__('Token Expired')
              : isDirNotFound ? i18n.__('Folder Not Found') : textViaCode }
          </div>
          {/* show dialog when token expired */}
          <ConfirmDialog
            open={isUnauthorized}
            onConfirm={() => this.ctx.props.logout()}
            title={i18n.__('Token Expired')}
            text={i18n.__('Token Expired Text')}
          />
        </div>
      </div>
    )
  }

  renderContent () {
    return <div>placeholder</div>
  }

  /* render error or content */
  render (props) {
    if (this.state.error) return this.renderDefaultError(props)
    return this.renderContent(props)
  }
}

export default Base
