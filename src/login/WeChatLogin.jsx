import i18n from 'i18n'
import React from 'react'
import { FailedIcon, BackwardIcon } from '../common/Svg'
import { LIButton } from '../common/Buttons'

/*
  http://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js
*/

class WeChatLogin extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      error: ''
    }

    this.intiWxScript = () => {
      this.wxiframe = null
      this.WxLogin = (a) => {
        let c = 'default'
        a.self_redirect === !0 ? c = 'true' : a.self_redirect === !1 && (c = 'false')
        const d = document.createElement('iframe')
        this.wxiframe = d
        let e = `https://open.weixin.qq.com/connect/qrconnect?appid=${a.appid}&scope=${a.scope}&redirect_uri=${a.redirect_uri}&state=${a.state}&login_type=jssdk&self_redirect=${c}`
        e += a.style ? `&style=${a.style}` : ''
        e += a.href ? `&href=${a.href}` : ''
        d.src = e
        d.frameBorder = '0'
        d.allowTransparency = 'true'
        d.scrolling = 'no'
        d.width = '300px'
        d.height = '400px'
      }
    }

    this.intiWxScript()

    this.initWXLogin = () => {
      this.setState({ error: '' }, () => {
        this.WxLogin({
          id: 'login_container',
          appid: 'wxd7e08af781bea6a2',
          scope: 'snsapi_login',
          redirect_uri: 'http%3A%2F%2Fwxlogin.siyouqun.com',
          state: 'uuid',
          language: 'zh_CN',
          style: '',
          href: ''
        })
        const f = document.getElementById('login_container')
        const d = this.wxiframe

        if (f) f.innerHTML = ''
        if (!window.navigator.onLine) {
          this.setState({ error: i18n.__('WeChat Login NetWork Error Text') })
        } else {
          d.onload = () => {
            if (!d.contentDocument.head || !d.contentDocument.title) {
              this.setState({ error: i18n.__('WeChat Login Token Error Text') })
            }
          }
          f.appendChild(d)
        }
      })
    }

    this.getWXCode = (code) => {
      /* init wx_code */
      this.wxiframe.contentWindow.wx_code = null

      const clientId = window.config && window.config.machineId && window.config.machineId.slice(0, 8)

      this.props.phi.req('wechatToken', { code, clientId }, (err, data) => {
        if (err || !data || 1) {
          this.setState({ error: i18n.__('WeChat Login Error Text') })
        } else if (!data.user) {
          this.setState({ error: i18n.__('WeChat Login No User Error Text') })
        } else {
          const { username, id, avatarUrl, nickName } = data
          const phi = window.config && window.config.global && window.config.global.phi
          const accounts = (phi && phi.accounts) || []
          if (accounts.every(user => user.pn !== username)) {
            accounts.push({ pn: username, avatarUrl, nickName })
          }
          this.props.phi.req('stationList', null, (e, r, cookie) => {
            if (e || !r) {
              this.setState({ error: i18n.__('WeChat Get Station List Error Text') })
            } else {
              const user = {
                cookie,
                accounts,
                pn: username,
                winasUserId: id,
                autoLogin: false,
                token: null
              }
              const list = r.ownStations
              this.props.onSuccess({ list, phonenumber: username, winasUserId: id, phi: user })
            }
          })
        }
      })
    }
  }

  componentDidMount () {
    this.initWXLogin()

    /* catch CODE of wechat login */
    window.onbeforeunload = () => {
      if (this.wxiframe && this.wxiframe.contentWindow.wx_code) {
        console.log(this.wxiframe.contentWindow.wx_code)
        setImmediate(() => this.getWXCode(this.wxiframe.contentWindow.wx_code))
        return false // This will stop the redirecting.
      }
      return null
    }
  }

  renderFailed () {
    return (
      <div style={{ width: 380, height: 360, backgroundColor: '#FFF', zIndex: 100, margin: '0 auto' }} key="failed">
        <div style={{ height: 80, paddingTop: 128 }} className="flexCenter">
          <FailedIcon style={{ color: '#f44336', height: 58, width: 58 }} />
        </div>

        <div style={{ fontSize: 14, color: '#f44336' }} className="flexCenter">
          { this.state.error }
        </div>
      </div>
    )
  }

  renderQR () {
    return (
      <div style={{ marginTop: 24 }} key="QR">
        <div style={{ width: 300, margin: '0 auto', position: 'relative', backgroundColor: '#FFF' }} >
          <div
            id="login_container"
            className="flexCenter"
            style={{ height: 406, width: 300, margin: 'auto', transform: 'scale(0.8)' }}
          />

          {/* overlay text */}
          <div style={{ position: 'absolute', top: 32, left: 0, height: 48, width: '100%', backgroundColor: '#FFF' }} />
        </div>
      </div>
    )
  }

  render () {
    return (
      <div style={{ width: '100%' }}>
        <div style={{ marginTop: 46, height: 24, display: 'flex', alignItems: 'center' }}>
          <LIButton style={{ marginLeft: 16 }} onClick={this.props.backToLogin}>
            <BackwardIcon />
          </LIButton>
        </div>
        { this.state.error ? this.renderFailed() : this.renderQR() }

        {/* Title */}
        <div style={{ position: 'absolute', top: 116, left: 80, fontSize: 28, display: 'flex', alignItems: 'center' }}>
          { i18n.__('Login via WeChat') }
        </div>

        {/* footer */}
        <div
          className="flexCenter"
          style={{ position: 'absolute', bottom: 0, height: 40, width: '100%', fontSize: 12, color: 'rgba(0,0,0,.38)' }}
        >
          <div> { `©${new Date().getFullYear()}${i18n.__('Copyright Info')}` } </div>
          <div style={{ marginLeft: 20 }}>
            { i18n.__('Client Version %s', global.config && global.config.appVersion) }
          </div>
        </div>
      </div>
    )
  }
}

export default WeChatLogin
