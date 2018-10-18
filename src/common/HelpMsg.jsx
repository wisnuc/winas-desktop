import i18n from 'i18n'
import React from 'react'
import { shell } from 'electron'
import { Divider } from 'material-ui'
import { ArrowIcon, SmallErrorIcon, HelpFoldIcon } from '../common/Svg'
import SimpleScrollBar from '../common/SimpleScrollBar'

class Help extends React.PureComponent {
  renderHeader (text) {
    return (
      <div>
        <div style={{ height: 60, display: 'flex', alignItems: 'center', paddingLeft: 20 }} className="title">
          { text }
        </div>
        <Divider style={{ marginLeft: 20, width: 240 }} className="divider" />
        <div style={{ height: 20 }} />
      </div>
    )
  }

  renderTitle (text) {
    return (
      <div
        style={{
          width: 240,
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          lineHeight: '30px',
          letterSpacing: '0.4px',
          color: '#505259',
          marginBottom: 5
        }}
      >
        <ArrowIcon style={{ transform: 'rotate(-90deg) scaleY(1.5)', color: '#85868c', opacity: 0.5 }} />
        <span style={{ marginLeft: -5 }}> { text } </span>
      </div>
    )
  }

  renderText (text) {
    return (
      <div
        style={{
          width: 234,
          padding: '0 23px',
          display: 'flex',
          alignItems: 'center',
          letterSpacing: '0.4px',
          color: '#85868c',
          wordBreak: 'break-all'
        }}
      >
        { text }
      </div>
    )
  }

  renderURLText (text) {
    return (
      <div
        style={{
          width: 234,
          padding: '0 23px',
          display: 'flex',
          alignItems: 'center',
          letterSpacing: '0.4px',
          color: '#31a0f5',
          cursor: 'pointer',
          textDecoration: 'underline',
          wordBreak: 'break-all'
        }}
        onClick={() => shell.openExternal(text)}
      >
        { text }
      </div>
    )
  }

  renderWarning (text) {
    return (
      <div
        style={{
          position: 'relative',
          width: 240,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          letterSpacing: '0.4px',
          color: '#85868c'
        }}
      >
        <span style={{ height: 30, top: -5, left: 12, display: 'inline', position: 'absolute' }}>
          <SmallErrorIcon style={{ color: '#85868c' }} />
        </span>
        <span style={{ textIndent: 20 }}>
          { text }
        </span>
      </div>
    )
  }

  renderHome () {
    return (
      <div>
        { this.renderHeader(i18n.__('Home Help Header')) }
        { this.renderText(i18n.__('Home Help Summary Text')) }
        <div style={{ height: 20 }} />
        { this.renderTitle(i18n.__('Upload')) }
        { this.renderText(i18n.__('Home Help Upload Text')) }
        <div style={{ height: 20 }} />
        { this.renderTitle(i18n.__('Download')) }
        { this.renderText(i18n.__('Home Help Download Text')) }
        <div style={{ height: 20 }} />
        { this.renderWarning(i18n.__('Home Help Warning Text')) }
      </div>
    )
  }

  renderPhoto () {
    return (
      <div>
        { this.renderHeader(i18n.__('Photo Help Header')) }
        { this.renderText(i18n.__('Photo Help Summary Text')) }
        <div style={{ height: 20 }} />
        { this.renderWarning(i18n.__('Photo Help Warning Text')) }
      </div>
    )
  }

  renderMusic () {
    return (
      <div>
        { this.renderHeader(i18n.__('Music Help Header')) }
        { this.renderText(i18n.__('Music Help Summary Text')) }
        <div style={{ height: 20 }} />
        { this.renderWarning(i18n.__('Music Help Warning Text')) }
      </div>
    )
  }

  renderDocs () {
    return (
      <div>
        { this.renderHeader(i18n.__('Docs Help Header')) }
        { this.renderText(i18n.__('Docs Help Summary Text')) }
        <div style={{ height: 20 }} />
        { this.renderWarning(i18n.__('Docs Help Warning Text')) }
      </div>
    )
  }

  renderVideo () {
    return (
      <div>
        { this.renderHeader(i18n.__('Video Help Header')) }
        { this.renderText(i18n.__('Video Help Summary Text')) }
        <div style={{ height: 20 }} />
        { this.renderWarning(i18n.__('Video Help Warning Text')) }
      </div>
    )
  }

  renderPublicContent () {
    return (
      <div>
        { this.renderHeader(i18n.__('Public Help Header')) }
        { this.renderText(i18n.__('Public Help Summary Text')) }
        <div style={{ height: 20 }} />
        { this.renderTitle(i18n.__('Upload')) }
        { this.renderText(i18n.__('Public Help Upload Text')) }
        <div style={{ height: 20 }} />
        { this.renderTitle(i18n.__('Download')) }
        { this.renderText(i18n.__('Public Help Download Text')) }
        <div style={{ height: 20 }} />
        { this.renderWarning(i18n.__('Public Help Warning Text')) }
      </div>
    )
  }

  renderAdminPublic () {
    return (
      <div>
        { this.renderHeader(i18n.__('Public Help Header For Admin User')) }

        { this.renderText(i18n.__('Public Summary Text For Admin User')) }

        <div style={{ height: 20 }} />
        { this.renderTitle(i18n.__('Add New Public Title')) }
        { this.renderText(i18n.__('Add New Public Text')) }
        { this.renderText(i18n.__('Add New Public Tip 1')) }
        { this.renderText(i18n.__('Add New Public Tip 2')) }
        { this.renderText(i18n.__('Add New Public Tip 3')) }

        <div style={{ height: 20 }} />
        { this.renderTitle(i18n.__('Modify Public Title')) }
        { this.renderText(i18n.__('Modify Public Text'))}

        <div style={{ height: 20 }} />
        { this.renderTitle(i18n.__('Delete Public Title')) }
        { this.renderText(i18n.__('Delete Public Text'))}

        <div style={{ height: 20 }} />
        { this.renderWarning(i18n.__('Public Warning Text For Admin User')) }
        { this.renderText(i18n.__('Public Warning Tip 1')) }
        { this.renderText(i18n.__('Public Warning Tip 2')) }
        { this.renderText(i18n.__('Public Warning Tip 3')) }
        <div style={{ height: 20 }} />
      </div>
    )
  }

  renderNormalPublic () {
    return (
      <div>
        { this.renderHeader(i18n.__('Public Help Header For Normal User')) }
        { this.renderText(i18n.__('Public Summary Text For Normal User')) }
      </div>
    )
  }

  renderUSB () {
    return (
      <div>
        { this.renderHeader(i18n.__('USB Help Header')) }
        { this.renderText(i18n.__('USB Help Summary Text')) }
        <div style={{ height: 20 }} />
        { this.renderTitle(i18n.__('Upload')) }
        { this.renderText(i18n.__('USB Help Upload Text')) }
        <div style={{ height: 20 }} />
        { this.renderTitle(i18n.__('Download')) }
        { this.renderText(i18n.__('USB Help Download Text')) }
        <div style={{ height: 20 }} />
        { this.renderWarning(i18n.__('USB Help Warning Text')) }
      </div>
    )
  }

  renderDownloading () {
    return (
      <div>
        { this.renderHeader(i18n.__('Downloading Help Header')) }
        { this.renderText(i18n.__('Downloading Help Summary Text')) }
        <div style={{ height: 20 }} />
        { this.renderTitle(i18n.__('Edit Downloading Tasks')) }
        { this.renderText(i18n.__('Edit Downloading Tasks Text 1')) }
        <div style={{ height: 20 }} />
        { this.renderText(i18n.__('Edit Downloading Tasks Text 2')) }
        <div style={{ height: 20 }} />
        { this.renderTitle(i18n.__('Downloading Failed')) }
        { this.renderText(i18n.__('Downloading Failed Text')) }
      </div>
    )
  }

  renderUploading () {
    return (
      <div>
        { this.renderHeader(i18n.__('Uploading Help Header')) }
        { this.renderText(i18n.__('Uploading Help Summary Text')) }
        <div style={{ height: 20 }} />
        { this.renderTitle(i18n.__('Edit Uploading Tasks')) }
        { this.renderText(i18n.__('Edit Uploading Tasks Text 1')) }
        <div style={{ height: 20 }} />
        { this.renderText(i18n.__('Edit Downloading Tasks Text 2')) }
        <div style={{ height: 20 }} />
        { this.renderTitle(i18n.__('Uploading Failed')) }
        { this.renderText(i18n.__('Uploading Failed Text')) }
      </div>
    )
  }

  renderFinished () {
    return (
      <div>
        { this.renderHeader(i18n.__('Finished Help Header')) }
        { this.renderText(i18n.__('Finished Help Summary Text')) }
        <div style={{ height: 20 }} />
        { this.renderTitle(i18n.__('Edit Finished Tasks')) }
        { this.renderText(i18n.__('Edit Finished Tasks Text')) }
      </div>
    )
  }

  renderDevice () {
    return (
      <div>
        { this.renderHeader(i18n.__('Device Help Header')) }
        { this.renderText(i18n.__('Device Help Summary Text')) }
      </div>
    )
  }

  renderDiskInfo () {
    return (
      <div>
        { this.renderHeader(i18n.__('DiskInfo Help Header')) }
        { this.renderText(i18n.__('DiskInfo Help Summary Text')) }
        <div style={{ height: 20 }} />
        { this.renderTitle(i18n.__('Remove Data')) }
        { this.renderText(i18n.__('Remove Data Help Text')) }
        <div style={{ height: 20 }} />
        { this.renderWarning(i18n.__('DiskInfo Help Warning Text')) }
      </div>
    )
  }

  renderSleep () {
    return (
      <div>
        { this.renderHeader(i18n.__('Sleep Help Header')) }
        { this.renderText(i18n.__('Sleep Help Summary Text')) }
        <div style={{ height: 20 }} />
        { this.renderWarning(i18n.__('Sleep Help Warning Text')) }
      </div>
    )
  }

  renderCacheClean () {
    return (
      <div>
        { this.renderHeader(i18n.__('CacheClean Help Header')) }
        { this.renderText(i18n.__('CacheClean Help Summary Text')) }
      </div>
    )
  }

  renderSamba () {
    return (
      <div>
        { this.renderHeader(i18n.__('Samba Help Header')) }
        { this.renderText(i18n.__('Samba Help Summary Text 1')) }
        <div style={{ height: 20 }} />
        { this.renderText(i18n.__('Samba Help Summary Text 2')) }
        <div style={{ height: 20 }} />
        { this.renderWarning(i18n.__('Samba Help Warning Text')) }
      </div>
    )
  }

  renderDLNA () {
    return (
      <div>
        { this.renderHeader(i18n.__('DLNA Help Header')) }
        { this.renderText(i18n.__('DLNA Help Summary Text')) }
        <div style={{ height: 20 }} />
        { this.renderWarning(i18n.__('DLNA Help Warning Text')) }
      </div>
    )
  }

  renderClientUpdate () {
    return (
      <div>
        { this.renderHeader(i18n.__('ClientUpdate Help Header')) }
        { this.renderText(i18n.__('ClientUpdate Help Summary Text 1')) }
        <div style={{ height: 20 }} />
        { this.renderText(i18n.__('ClientUpdate Help Summary Text 2')) }
        <div style={{ height: 20 }} />
        { this.renderText(i18n.__('ClientUpdate Help Summary Text 3')) }
        <div style={{ height: 20 }} />
        { this.renderURLText(i18n.__('ClientUpdate Help Summary Text 4')) }
      </div>
    )
  }

  renderFirmwareUpdate () {
    return (
      <div>
        { this.renderHeader(i18n.__('FirmwareUpdate Help Header')) }
        { this.renderText(i18n.__('FirmwareUpdate Help Summary Text')) }
        <div style={{ height: 20 }} />
        { this.renderTitle(i18n.__('Update FirmwareUpdate Auto')) }
        { this.renderText(i18n.__('Update FirmwareUpdate Auto Text')) }
        <div style={{ height: 20 }} />
        { this.renderTitle(i18n.__('Update FirmwareUpdate Manually')) }
        { this.renderText(i18n.__('Update FirmwareUpdate Manually Text')) }
        <div style={{ height: 20 }} />
        { this.renderWarning(i18n.__('FirmwareUpdate Help Warning Text')) }
        <div style={{ height: 10 }} />
        { this.renderText(i18n.__('FirmwareUpdate Help Warning Tip 1')) }
        { this.renderText(i18n.__('FirmwareUpdate Help Warning Tip 2')) }
        { this.renderText(i18n.__('FirmwareUpdate Help Warning Tip 3')) }
      </div>
    )
  }

  renderLANPassword () {
    return (
      <div>
        { this.renderHeader(i18n.__('LANPassword Help Header')) }
        { this.renderText(i18n.__('LANPassword Help Summary Text 1')) }
        <div style={{ height: 20 }} />
        { this.renderText(i18n.__('LANPassword Help Summary Text 2')) }
      </div>
    )
  }

  renderPT () {
    return (
      <div>
        { this.renderHeader(i18n.__('PT Help Header')) }
        { this.renderText(i18n.__('PT Help Summary Text 1')) }
        <div style={{ height: 20 }} />
        { this.renderText(i18n.__('PT Help Summary Text 2')) }
        <div style={{ height: 20 }} />
        { this.renderURLText(i18n.__('PT Help Summary Text 3')) }
        <div style={{ height: 20 }} />
        { this.renderWarning(i18n.__('PT Help Warning Text')) }
      </div>
    )
  }

  renderPower () {
    return (
      <div>
        { this.renderHeader(i18n.__('Power Help Header')) }
        { this.renderText(i18n.__('Power Help Summary Text')) }
        <div style={{ height: 20 }} />
        { this.renderWarning(i18n.__('Power Help Warning Text')) }
        <div style={{ height: 10 }} />
        { this.renderText(i18n.__('Power Help Warning Tip 1')) }
        { this.renderText(i18n.__('Power Help Warning Tip 2')) }
      </div>
    )
  }

  renderResetDevice () {
    return (
      <div>
        { this.renderHeader(i18n.__('ResetDevice Help Header')) }
        { this.renderText(i18n.__('ResetDevice Help Summary Text 1')) }
        <div style={{ height: 20 }} />
        { this.renderText(i18n.__('ResetDevice Help Summary Text 2')) }
        <div style={{ height: 20 }} />
        { this.renderText(i18n.__('ResetDevice Help Summary Text 3')) }
        <div style={{ height: 20 }} />
        { this.renderWarning(i18n.__('ResetDevice Help Warning Text')) }
      </div>
    )
  }

  render () {
    let content = null
    switch (this.props.nav) {
      case 'home':
        content = this.renderHome()
        break
      case 'photo':
        content = this.renderPhoto()
        break
      case 'music':
        content = this.renderMusic()
        break
      case 'docs':
        content = this.renderDocs()
        break
      case 'video':
        content = this.renderVideo()
        break
      case 'public':
        if (this.props.isPublicContent) content = this.renderPublicContent()
        else if (this.props.isAdmin) content = this.renderAdminPublic()
        else content = this.renderNormalPublic()
        break
      case 'usb':
        content = this.renderUSB()
        break
      case 'downloading':
        content = this.renderDownloading()
        break
      case 'uploading':
        content = this.renderUploading()
        break
      case 'finished':
        content = this.renderFinished()
        break
      case 'device':
        content = this.renderDevice()
        break
      case 'diskInfo':
        content = this.renderDiskInfo()
        break
      case 'sleep':
        content = this.renderSleep()
        break
      case 'cacheClean':
        content = this.renderCacheClean()
        break
      case 'samba':
        content = this.renderSamba()
        break
      case 'dlna':
        content = this.renderDLNA()
        break
      case 'clientUpdate':
        content = this.renderClientUpdate()
        break
      case 'firmwareUpdate':
        content = this.renderFirmwareUpdate()
        break
      case 'lanPassword':
        content = this.renderLANPassword()
        break
      case 'pt':
        content = this.renderPT()
        break
      case 'power':
        content = this.renderPower()
        break
      case 'resetDevice':
        content = this.renderResetDevice()
        break
      default:
        break
    }
    return (
      <div style={{ width: 280, height: '100%', position: 'relative' }}>
        <SimpleScrollBar height={'100%'} width={280} >
          { content }
        </SimpleScrollBar>
        <div style={{ width: 30, height: '100%', position: 'absolute', left: -5, top: 0 }} className="flexCenter">
          <HelpFoldIcon style={{ color: '#85868c', cursor: 'pointer' }} onClick={this.props.onClose} />
        </div>
      </div>
    )
  }
}

export default Help
