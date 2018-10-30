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
    return (
      <div
        style={{
          position: 'fixed',
          top: 8,
          right: 8,
          display: 'flex',
          alignItems: 'center',
          WebkitAppRegion: 'no-drag',
          zIndex: 1000
        }}
      >
        <EventListener target="window" onResize={this.handleResize} />
        <IconButton style={styles.small} iconStyle={styles.smallIcon} onClick={this.minimize} hoveredStyle={{ opacity: 1 }}>
          <WinMiniIcon />
        </IconButton>
        <div style={{ width: 12 }} />
        <IconButton style={styles.small} iconStyle={styles.smallIcon} onClick={this.toggleMax} hoveredStyle={{ opacity: 1 }}>
          { !isMaximized ? <WinFullIcon /> : <WinNormalIcon /> }
        </IconButton>
        <div style={{ width: 12 }} />
        <IconButton style={styles.small} iconStyle={styles.smallIcon} onClick={this.hide} hoveredStyle={{ opacity: 1 }}>
          <CloseIcon />
        </IconButton>
      </div>
    )
  }
}

export default WindowAction
