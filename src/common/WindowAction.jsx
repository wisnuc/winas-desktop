import React from 'react'
import { ipcRenderer, remote } from 'electron'
import EventListener from 'react-event-listener'
import { IconButton } from 'material-ui'
import { WinMiniIcon, WinFullIcon, WinNormalIcon, CloseIcon } from '../common/Svg'

const styles = {
  smallIcon: {
    width: 18,
    height: 18,
    color: '#000000'
  },
  small: {
    width: 18,
    height: 18,
    padding: 0,
    opacity: 0.38,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}

class WindowAction extends React.PureComponent {
  constructor () {
    super()

    this.hide = () => ipcRenderer.send('HIDE')
    this.toggleMax = () => ipcRenderer.send('TOGGLE_MAX')
    this.minimize = () => ipcRenderer.send('MINIMIZE')
    this.handleResize = () => this.forceUpdate()
  }

  render () {
    const isMaximized = remote.getCurrentWindow().isMaximized()
    const buttonProps = {
      tabIndex: -1,
      style: styles.small,
      iconStyle: styles.smallIcon,
      hoveredStyle: { opacity: 1 }
    }
    return (
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          alignItems: 'center',
          WebkitAppRegion: 'no-drag',
          zIndex: 1000
        }}
      >
        <EventListener target="window" onResize={this.handleResize} />
        <IconButton {...buttonProps} onClick={this.minimize} >
          <WinMiniIcon />
        </IconButton>
        <div style={{ width: 12 }} />
        {
          !this.props.noResize &&
            <IconButton {...buttonProps} onClick={this.toggleMax} >
              { !isMaximized ? <WinFullIcon /> : <WinNormalIcon /> }
            </IconButton>
        }
        { !this.props.noResize && <div style={{ width: 12 }} /> }
        <IconButton {...buttonProps} onClick={this.hide} >
          <CloseIcon />
        </IconButton>
      </div>
    )
  }
}

export default WindowAction
