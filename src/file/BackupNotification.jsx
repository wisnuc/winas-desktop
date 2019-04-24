import i18n from 'i18n'
import React from 'react'
import { ipcRenderer } from 'electron'
import SocialNotifications from 'material-ui/svg-icons/social/notifications'
import { LIButton } from '../common/Buttons'
import SimpleScrollBar from '../common/SimpleScrollBar'
import { FolderIcon, CloseIcon } from '../common/Svg'
import DialogOverlay from '../common/PureDialog'
import convert from '../transmission/convertCode'
import FlatButton from '../common/FlatButton'

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

    this.forceBackup = (entry) => {
      const index = this.state.list.indexOf(entry)
      if (index > -1) {
        const list = [...this.state.list]
        list.splice(index, 1)
        this.setState({ list })
      }
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

    console.log('render', this.state, this.props)
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

                <div style={{
                  height: 40, color: 'rgba(0,0,0,.54)', fontSize: 12, display: 'flex', alignItems: 'center'
                }}>
                  <div style={{ marginLeft: 24 }}> { i18n.__('Name') } </div>
                  <div style={{ width: 360 }} />
                  <div> { i18n.__('Reason') } </div>
                </div>

                <SimpleScrollBar width={640} height={height} >
                  {
                    list.map(l => (
                      <div key={l.entry || l.files[0].entry} style={{ height: 56, width: '100%', display: 'flex', alignItems: 'center' }} >
                        <div style={{ width: 24, marginLeft: 24 }} className="flexCenter" >
                          <FolderIcon style={{ color: '#f9a825', width: 24, height: 24 }} />
                        </div>
                        <div style={{ width: 16 }} />

                        <div style={{ width: 344, height: 56 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            margin: l.entry ? '12px 0 4px 0' : '18px 0 0 0'
                          }}>
                            {/* entry name */}
                            <div
                              style={{
                                marginRight: 4,
                                color: 'rgba(0,0,0,.76)',
                                maxWidth: l.files && l.files.length > 1 ? 200 : 320
                              }}
                              className="text"
                            >
                              { l.name || (Array.isArray(l.files) && l.files[0] && l.files[0].name) }
                            </div>

                            <div>
                              { l.files && l.files.length > 1 && i18n.__('And Other %s Items', l.files.length)}
                            </div>
                          </div>
                          {/* local path */}
                          <div style={{ color: 'rgba(0,0,0,.54)', fontSize: 12 }} className="text">
                            { l.entry }
                          </div>
                        </div>
                        <div
                          style={{
                            width: 136,
                            height: 56,
                            color: 'rgba(0,0,0,.54)',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          { !!l.error && convert(l.error.code) }
                        </div>

                        <FlatButton
                          label={l.isWarning ? i18n.__('Force Backup') : i18n.__('Retry')}
                          primary
                          onClick={() => this.forceBackup(l)}
                        />

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
