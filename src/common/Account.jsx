import i18n from 'i18n'
import React from 'react'
import { shell } from 'electron'
import { Popover, MenuItem } from 'material-ui'
import ADD from 'material-ui/svg-icons/navigation/arrow-drop-down'

import { PersonIcon, UsersIcon, LogoutIcon, AvatarOnlineIcon, AvatarOfflineIcon } from '../common/Svg'

const phicommUrl = 'https://sohon2test.phicomm.com/v1/ui/index'

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

  render () {
    const { user, device, logout } = this.props
    if (!user) return (<div />)
    const { name, phicommUserId } = user

    const color = 'rgba(255, 255, 255, 0.7)'

    const iconStyle = { marginLeft: 30, marginTop: 5, width: 30, height: 30, color: '#7d868f' }
    const items = []
    /* phi account */
    if (phicommUserId) {
      items.push({
        primaryText: i18n.__('Account Settings'),
        leftIcon: <PersonIcon style={iconStyle} />,
        onClick: () => { shell.openExternal(phicommUrl); this.setState({ open: false }) }
      })
    }
    /* device logged */
    if (phicommUserId && device && device.mdev && device.mdev.type === 'owner') {
      items.push({
        primaryText: i18n.__('Users Management'),
        leftIcon: <UsersIcon style={iconStyle} />,
        onClick: () => this.openUsers()
      })
    }
    /* return phiLogin */
    items.push({
      primaryText: i18n.__('Log Out'),
      leftIcon: <LogoutIcon style={iconStyle} />,
      onClick: logout
    })

    return (
      <div
        style={{
          height: 30,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          WebkitAppRegion: 'no-drag'
        }}
        onClick={this.openPop}
      >

        <div style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.2)' }}>
          { phicommUserId ? <AvatarOnlineIcon style={{ color: '#FFF' }} /> : <AvatarOfflineIcon style={{ color: '#FFF' }} /> }
        </div>
        <div style={{ paddingLeft: 10, color }}>
          { name }
        </div>

        <div
          style={{
            width: 26,
            height: 26,
            padding: 4,
            margin: '0 8px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ADD color={color} />
        </div>

        <div style={{ height: 12, width: 1, backgroundColor: color, opacity: 0.3 }} />
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: this.state.open ? '' : 'none',
            WebkitAppRegion: 'no-drag'
          }}
        />
        <Popover
          open={this.state.open}
          anchorEl={this.state.anchorEl}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          targetOrigin={{ horizontal: 'right', vertical: 'top' }}
          onRequestClose={() => this.setState({ open: false })}
          style={{ boxShadow: '0 0 20px 0 rgba(23, 99, 207, 0.1)', opacity: this.state.show ? 1 : 0, marginLeft: -20 }}
        >
          <div style={{ width: 125, maxWidth: 125, height: items.length * 40, overflow: 'hidden' }} >
            {
              items.map((props, index) => (
                <MenuItem
                  {...props}
                  key={index.toString()}
                  style={{
                    marginLeft: -24,
                    marginTop: 0,
                    fontSize: 14,
                    color: '#505259',
                    height: 40,
                    minHeight: 40,
                    lineHeight: '40px'
                  }}
                />
              ))
            }
            <div style={{ height: 5, width: '100%' }} />
          </div>
        </Popover>
      </div>
    )
  }
}

export default Account
