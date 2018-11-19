import React from 'react'
import { AccountIcon } from '../common/Svg'

class Account extends React.PureComponent {
  render () {
    const { size, style, avatarUrl } = this.props
    return (
      <div style={style}>
        <div style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
          {
            avatarUrl ? <img src={avatarUrl} width={size} height={size} />
              : <AccountIcon style={{ width: size, height: size, color: 'rgba(96,125,139,.26)' }} />
          }
        </div>
      </div>
    )
  }
}

export default Account
