import i18n from 'i18n'
import React from 'react'
import { ipcRenderer } from 'electron'
import SocialNotifications from 'material-ui/svg-icons/social/notifications'
import { LIButton } from '../common/Buttons'
import SimpleScrollBar from '../common/SimpleScrollBar'
import { FolderIcon, CloseIcon } from '../common/Svg'
import DialogOverlay from '../common/PureDialog'
import convert from '../transmission/convertCode'

class BackupNotification extends React.PureComponent {
  constructor (props) {
    super(props)
    this.state = {
      list: [],
      open: false
    }

    this.onRes = (event, data) => {
      const { currentErrors, currentWarnings } = data
      console.log('currentErrors, currentWarnings', currentErrors, currentWarnings)
      this.setState({ list: [...currentErrors, ...currentWarnings] })
    }
  }

  componentDidMount () {
    ipcRenderer.on('BACKUP_RES', this.onRes)
    ipcRenderer.send('BACKUP_REQ')
  }

  componentWillUnmount () {
    ipcRenderer.removeAllListeners('BACKUP_RES')
  }

  renderButton () {
    return (
      <LIButton
        onClick={() => this.setState({ open: !this.state.open })}
        tooltip={i18n.__('Notifications')}
      >
        <SocialNotifications />
      </LIButton>
    )
  }

  render () {
    const { list } = this.state
    if (!list.length) return (<div />)

    const height = Math.min(list.length * 56, 336)
    return (
      <div>
        { this.renderButton() }
        <DialogOverlay open={!!this.state.open}>
          {
            !!this.state.open && (
              <div style={{ width: 640, overflow: 'hidden' }} >
                <div style={{ height: 64, display: 'flex', alignItems: 'center' }} >
                  <div style={{ fontSize: 16, marginLeft: 24 }}>
                    { i18n.__('BackupNotification Dialog Title %s', list.length) }
                  </div>
                  <div style={{ flexGrow: 1 }} />
                  <LIButton
                    onClick={() => this.setState({ open: false })}
                    iconStyle={{ width: 24, height: 24, color: 'rgba(0,0,0,0.54)' }}
                  >
                    <CloseIcon />
                  </LIButton>
                </div>
                <div style={{ height: 1, width: '100%', backgroundColor: '#e8eaed' }} />

                <div style={{ height: 40, color: 'rgba(0,0,0,.54)', fontSize: 12, display: 'flex', alignItems: 'center' }}>
                  <div style={{ marginLeft: 24 }}> { i18n.__('Name') } </div>
                  <div style={{ width: 360 }} />
                  <div> { i18n.__('Reason') } </div>
                </div>

                <SimpleScrollBar width={640} height={height} >
                  {
                    list.map(l => (
                      <div key={l.entry} style={{ height: 56, width: '100%', display: 'flex', alignItems: 'center' }} >
                        <div style={{ width: 24, marginLeft: 24 }} className="flexCenter" >
                          <FolderIcon style={{ color: '#f9a825', width: 24, height: 24 }} />
                        </div>
                        <div style={{ width: 16 }} />

                        <div style={{ width: 344, height: 56 }}>
                          <div style={{ margin: '12px 0 4px 0', color: 'rgba(0,0,0,.76)' }} className="text">
                            { l.name }
                          </div>
                          <div style={{ color: 'rgba(0,0,0,.54)', fontSize: 12 }} className="text">
                            { l.entry }
                          </div>
                        </div>
                        <div style={{ width: 136, height: 56, color: 'rgba(0,0,0,.54)', fontSize: 12, display: 'flex', alignItems: 'center' }}>
                          { l.error && convert(l.error.code) }
                        </div>
                      </div>
                    ))
                  }
                </SimpleScrollBar>
                <div style={{ height: 24 }} />
              </div>
            )
          }
        </DialogOverlay>
      </div>
    )
  }
}

export default BackupNotification
