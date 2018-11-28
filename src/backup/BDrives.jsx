import i18n from 'i18n'
import React from 'react'
import { RSButton } from '../common/Buttons'
import { PCIcon, MobileIcon } from '../common/Svg'

class Backup extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      drives: null,
      localPath: ''
    }
  }

  renderNoBackupDrives () {
    return (
      <div style={{ height: '100%', width: '100%' }}>
        No Backup Drives
      </div>
    )
  }

  renderLoading () {
    return (
      <div style={{ height: '100%', width: '100%' }}>
        Loading
      </div>
    )
  }

  renderCurrentDrive (drive) {
    const { label, client } = drive
    const defaultLabel = window.config && window.config.hostname
    let lastFinishTime = ''
    if (client && client.lastBackupTime) {
      const t = new Date(client.lastBackupTime)
      lastFinishTime = `${t.toLocaleDateString()} ${t.toLocaleTimeString()}`
    }
    return (
      <div
        style={{
          height: 80,
          backgroundColor: 'rgba(224, 247, 250, 0.26)',
          borderTop: '1px solid #009688',
          borderBottom: '1px solid #009688',
          display: 'flex',
          alignItems: 'center'
        }}
        onClick={() => this.props.enterDrive(drive)}
      >
        <div style={{ width: 40, marginLeft: 16 }}>
          <PCIcon />
        </div>
        {
          label && lastFinishTime ? (
            <div style={{ width: 196, marginLeft: 16 }}>
              <div style={{ height: 16, marginBottom: 8, fontSize: 16, fontWeight: 500, color: '#009688' }}>
                { label }
              </div>
              <div style={{ height: 6, backgroundColor: 'rgba(0,105,92,.08)', width: 196, borderRadius: 3 }}>
                <div style={{ height: 6, backgroundColor: '#00897b', width: 46, borderRadius: 3 }} />
              </div>
              <div style={{ height: 16, marginTop: 8, color: '#009688' }}>
                正在备份212个（共4567）
              </div>
            </div>
          ) : (
            <div style={{ width: 196, marginLeft: 16 }}>
              { defaultLabel }
            </div>
          )
        }
        <div style={{ flexGrow: 1 }} />
        <div style={{ marginRight: 24, color: '#009688' }}>
          {
            label ? (
              <div>
                {
                  !!lastFinishTime &&
                    <div style={{ height: 16 }}>
                      { lastFinishTime }
                    </div>
                }
                <div style={{ height: 16, textAlign: 'right' }}>
                  { lastFinishTime ? '备份完成' : '未备份' }
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', height: 40 }}>
                <input
                  value={this.state.localPath || ''}
                  onChange={() => {}}
                  style={{ width: 300, color: '#444' }}
                />
                <RSButton
                  alt
                  label={i18n.__('Browse')}
                  onClick={this.openDialog}
                  style={{ height: 30, padding: '0 24px' }}
                  labelStyle={{ height: 30 }}
                />
              </div>
            )
          }
        </div>
      </div>
    )
  }

  render () {
    const drives = this.props.apis && this.props.apis.drives && this.props.apis.drives.data
    if (!drives) return this.renderLoading()
    const machineId = window.config && window.config.machineId && window.config.machineId.slice(-8)
    const bDrives = drives.filter(d => d.type === 'backup')
    const currentDrive = bDrives.find(d => d.client && d.client.id === machineId) || {}
    const otherDrive = bDrives.filter(d => d.client && d.client.id !== machineId)
    console.log('render bDrives', bDrives)
    return (
      <div style={{ height: '100%', width: '100%', boxSizing: 'border-box', paddingLeft: 32 }}>
        <div style={{ height: 48, display: 'flex', alignItems: 'center', marginLeft: 16 }}>
          { i18n.__('Current Device') }
        </div>
        { this.renderCurrentDrive(currentDrive) }
        <div style={{ height: 48, display: 'flex', alignItems: 'center', margin: '16px 0px 4px 16px' }}>
          { i18n.__('Other Device') }
        </div>
        {
          otherDrive.map((drive) => {
            const { uuid, label, client } = drive
            return (
              <div
                key={uuid}
                style={{
                  height: 56,
                  backgroundColor: 'rgba(232, 234, 237, 0.26)',
                  borderTop: '1px solid #e8eaed',
                  borderBottom: '1px solid #e8eaed',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onClick={() => this.props.enterDrive(drive)}
              >
                <div style={{ width: 40, marginLeft: 16 }}>
                  { client.type === 'PC' ? <PCIcon /> : <MobileIcon /> }
                </div>
                <div style={{ height: 16, marginBottom: 8, fontSize: 16, fontWeight: 500, marginLeft: 16 }}>
                  { label }
                </div>
                <div style={{ flexGrow: 1 }} />
                <div style={{ marginRight: 24, color: 'rgba(0,0,0,.54)' }}>
                  {
                    !!client.lastBackupTime &&
                    <div style={{ height: 16 }}>
                      { client.lastBackupTime }
                    </div>
                  }
                  <div style={{ height: 16, textAlign: 'right' }}>
                    { client.lastBackupTime ? '备份完成' : '未备份' }
                  </div>
                </div>
              </div>
            )
          })
        }
      </div>
    )
  }
}

export default Backup
