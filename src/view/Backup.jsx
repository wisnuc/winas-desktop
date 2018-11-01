import i18n from 'i18n'
import React from 'react'
import Base from './Base'
import { LIButton } from '../common/Buttons'
import { BackupIcon, SettingsIcon, InfoIcon, PCIcon, MobileIcon } from '../common/Svg'

class Backup extends Base {
  constructor (ctx) {
    super(ctx)
    this.title = () => i18n.__('Backup')
  }

  navGroup () {
    return 'file'
  }

  menuName () {
    return this.title()
  }

  menuIcon () {
    return BackupIcon
  }

  menuSelectedIcon () {
    return BackupIcon
  }

  renderTitle () {
    return (
      <div
        style={{
          height: 24,
          marginBottom: 24,
          marginLeft: 56,
          fontSize: 12,
          color: 'rgba(0,0,0,.54)',
          display: 'flex',
          alignItems: ' center'
        }}
      >
        { '备份空间' }
      </div>
    )
  }

  renderToolBar ({ style, openDetail }) {
    return (
      <div style={style}>
        <div style={{ flexGrow: 1 }} />
        <LIButton onClick={() => {}} tooltip={i18n.__('More')} >
          <SettingsIcon />
        </LIButton>
        <LIButton onClick={openDetail} tooltip={i18n.__('Info')} >
          <InfoIcon />
        </LIButton>
        <div style={{ width: 8 }} />
      </div>
    )
  }

  renderContent ({ openSnackBar }) {
    const devices = [
      { type: 'PC', name: 'M-PC', finishedDate: '2018-10-17 15:34' },
      { type: 'PC', name: 'Macbook Air', finishedDate: '2018-10-17 15:34' },
      { type: 'Mobile', name: 'iPhone X', finishedDate: '' }
    ]
    return (
      <div style={{ height: '100%', width: '100%', boxSizing: 'border-box', paddingLeft: 32 }}>
        <div style={{ height: 48, display: 'flex', alignItems: 'center', marginLeft: 16 }}>
          本机
        </div>
        <div
          style={{
            height: 80,
            backgroundColor: 'rgba(224, 247, 250, 0.26)',
            borderTop: '1px solid #009688',
            borderBottom: '1px solid #009688',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <div style={{ width: 40, marginLeft: 16 }}>
            <PCIcon />
          </div>
          <div style={{ width: 196, marginLeft: 16 }}>
            <div style={{ height: 16, marginBottom: 8, fontSize: 16, fontWeight: 500, color: '#009688' }}>
              M-PC
            </div>
            <div style={{ height: 6, backgroundColor: 'rgba(0,105,92,.08)', width: 196, borderRadius: 3 }}>
              <div style={{ height: 6, backgroundColor: '#00897b', width: 46, borderRadius: 3 }} />
            </div>
            <div style={{ height: 16, marginTop: 8, color: '#009688' }}>
              正在备份212个（共4567）
            </div>
          </div>
          <div style={{ flexGrow: 1 }} />
          <div style={{ marginRight: 24, color: '#009688' }}>
            <div style={{ height: 16 }}>
              2018-10-17 15:34
            </div>
            <div style={{ height: 16 }}>
              备份完成
            </div>
          </div>
        </div>
        <div style={{ height: 48, display: 'flex', alignItems: 'center', margin: '16px 0px 4px 16px' }}>
          其他设备
        </div>
        {
          devices.map(({ type, name, finishedDate }) => (
            <div
              key={name}
              style={{
                height: 56,
                backgroundColor: 'rgba(232, 234, 237, 0.26)',
                borderTop: '1px solid #e8eaed',
                borderBottom: '1px solid #e8eaed',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <div style={{ width: 40, marginLeft: 16 }}>
                { type === 'PC' ? <PCIcon /> : <MobileIcon /> }
              </div>
              <div style={{ height: 16, marginBottom: 8, fontSize: 16, fontWeight: 500, marginLeft: 16 }}>
                { name }
              </div>
              <div style={{ flexGrow: 1 }} />
              <div style={{ marginRight: 24, color: 'rgba(0,0,0,.54)' }}>
                {
                  finishedDate &&
                  <div style={{ height: 16 }}>
                    { finishedDate }
                  </div>
                }
                <div style={{ height: 16, textAlign: 'right' }}>
                  { finishedDate ? '备份完成' : '未备份' }
                </div>
              </div>
            </div>
          ))
        }
      </div>
    )
  }
}

export default Backup
