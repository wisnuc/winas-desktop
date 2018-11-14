import i18n from 'i18n'
import React from 'react'
import Popover, { PopoverAnimationVertical } from 'material-ui/Popover'
import FlatButton from '../common/FlatButton'

import { AccountIcon } from '../common/Svg'

class Account extends React.Component {
  constructor (props) {
    super(props)
    this.state = { open: false, show: false, users: false }

    this.openPop = (e) => {
      e.preventDefault()
      clearTimeout(this.timer)
      this.setState({ open: true, show: false, anchorEl: e.currentTarget })
      /* hide the status of position move */
      this.timer = setTimeout(() => this.setState({ show: true }), 100)
    }

    this.openUsers = () => {
      this.setState({ open: false, show: false })
      this.props.showUsers()
    }
  }

  componetWillUnmount () {
    clearTimeout(this.timer)
  }

  renderAccountPop () {
    const { avatarUrl, nickName, mail, pn } = this.props.account.phi
    return (
      <div style={{ height: 188, width: 312, WebkitAppRegion: 'no-drag' }}>
        <div style={{ height: 140, display: 'flex', alignItems: 'center' }}>
          <div style={{ marginLeft: 32, position: 'relative' }}>
            {
              avatarUrl ? <img src={avatarUrl} width={72} height={72} />
                : (
                  <AccountIcon
                    onClick={this.changeAvatar}
                    style={{ width: 72, height: 72, color: 'rgba(96,125,139,.26)' }}
                  />
                )
            }
            <div style={{ position: 'absolute', top: 55, left: 0, height: 17, width: 72, overflow: 'hidden' }}>
              <div style={{ height: 72, width: 72, marginTop: -55, borderRadius: 36, backgroundColor: 'rgba(0,0,0,.87)' }} />
              <div style={{ color: '#FFF', marginTop: -17, height: 17 }} className="flexCenter">
                { i18n.__('Change Avatar') }
              </div>
            </div>
          </div>
          <div style={{ height: 100, marginLeft: 24, marginTop: 40 }}>
            <div style={{ height: 20, fontWeight: 500, color: 'rgba(0,0,0,.76)' }}>
              { nickName || '某某' }
            </div>
            <div style={{ height: 20, fontWeight: 500, color: 'rgba(0,0,0,.76)' }}>
              { pn }
            </div>
            <div style={{ height: 37, color: 'rgba(0,0,0,.29)' }}>
              {
                mail || (
                  <FlatButton
                    style={{ marginLeft: -16, marginTop: -6, height: 32, lineHeight: '32px' }}
                    label={i18n.__('Bind Email')}
                    onClick={() => this.setState({ open: false, bindEmail: true })}
                    primary
                  />
                )
              }
            </div>
          </div>
        </div>
        <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
          <FlatButton
            primary
            label={i18n.__('Logout')}
            onClick={this.props.logout}
            style={{ height: 32, lineHeight: '32px' }}
          />
        </div>
      </div>
    )
  }

  render () {
    if (!this.props.account || !this.props.account.phi) return <div />
    return (
      <div style={{ height: 32, display: 'flex', alignItems: 'center', cursor: 'pointer', WebkitAppRegion: 'no-drag' }} >
        <AccountIcon
          onClick={this.openPop}
          style={{
            width: 24,
            height: 24,
            color: 'rgba(96,125,139,.26)',
            WebkitAppRegion: 'no-drag',
            cursor: 'pointer'
          }}
        />
        <Popover
          open={this.state.open}
          animation={PopoverAnimationVertical}
          anchorEl={this.state.anchorEl}
          anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
          targetOrigin={{ horizontal: 'left', vertical: 'top' }}
          onRequestClose={() => this.setState({ open: false })}
          style={{
            opacity: this.state.show ? 1 : 0,
            boxShadow: '0px 5px 6.6px 0.4px rgba(96,125,139,.24), 0px 2px 9.8px 0.2px rgba(96,125,139,.16)'
          }}
        >
          { this.renderAccountPop() }
        </Popover>
      </div>
    )
  }
}

export default Account
