import i18n from 'i18n'
import React from 'react'
import prettysize from 'prettysize'
import { Divider } from 'material-ui'
import ContentCopyIcon from 'material-ui/svg-icons/content/content-copy'
import { remote, ipcRenderer } from 'electron'
import renderFileIcon from '../common/renderFileIcon'
import { RSButton } from '../common/Buttons'
import { FolderIcon } from '../common/Svg'
import Dialog from '../common/PureDialog'

class DownloadDialog extends React.PureComponent {
  constructor (props) {
    super(props)
    this.state = { fired: false }

    this.onFire = () => {
      const { entries, path } = this.props.data
      const downloadPath = global.config.global.downloadPath || global.config.defaultDownload
      this.setState({ fired: true }, () => this.props.onConfirm({ entries, path, downloadPath }))
    }

    this.openDialog = () => {
      remote.dialog.showOpenDialog({ properties: ['openDirectory'] }, (filePaths) => {
        if (!filePaths || !filePaths.length) return
        const path = filePaths[0]
        ipcRenderer.send('SETCONFIG', { downloadPath: path })
      })
    }

    this.reqAsync = async (nextProps) => {
      this.setState({ loading: true })
      if (!nextProps || !nextProps.data) return ({})
      const { entries, path } = nextProps.data
      let [dirCount, fileCount, fileTotalSize] = [0, 0, 0]
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        if (['directory', 'public'].includes(entry.type)) {
          if (entries.length > 1) dirCount += 1
          const driveUUID = entry.type === 'public' ? entry.uuid : path[0].uuid
          const dirUUID = entry.uuid
          const res = await this.props.apis.pureRequestAsync('content', { driveUUID, dirUUID })
          dirCount += res.dirCount
          fileCount += res.fileCount
          fileTotalSize += res.fileTotalSize
        } else {
          fileCount += 1
          fileTotalSize += entry.size
        }
      }

      return ({ dirCount, fileCount, fileTotalSize })
    }
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.open && !this.props.open) {
      this.reqAsync(nextProps)
        .then((content) => {
          const { dirCount, fileCount, fileTotalSize } = content
          this.setState({ dirCount, fileCount, fileTotalSize, loading: false })
        })
        .catch(e => console.error('req dir content error', e))

      this.setState({ fired: false })
    }
  }

  contentOrSize (data) {
    if (!data || !data.entries || !Array.isArray(data.entries) || !data.entries.length) return ''
    const isTask = data.entries.length > 1
    const entry = (data && data.entries && data.entries[0]) || {}
    if (!isTask && entry.type === 'file') return i18n.__('File Size %s', prettysize(entry.size))

    const { loading, dirCount, fileCount, fileTotalSize } = this.state
    if (loading) return i18n.__('Loading')
    if (!dirCount) return i18n.__('File Count %s, Size: %s', fileCount, prettysize(fileTotalSize, false, true, 2))
    return i18n.__('Content %s %s, Size: %s', dirCount, fileCount, prettysize(fileTotalSize, false, true, 2))
  }

  render () {
    const { open, onCancel, data } = this.props
    const entryNum = data && data.entries && data.entries.length
    const isTask = entryNum > 1
    const entry = (data && data.entries && data.entries[0]) || {}
    const downloadPath = global.config.global.downloadPath || global.config.defaultDownload

    return (
      <Dialog open={open} onRequestClose={onCancel} modal >
        {
          open && (
            <div style={{ width: 380, padding: '0 20px' }}>
              <div style={{ height: 60, display: 'flex', alignItems: 'center' }} className="title">
                { i18n.__('Download') }
              </div>
              <Divider style={{ width: 380 }} className="divider" />
              <div style={{ height: 20 }} />
              <div style={{ height: 60, width: 380, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 60, height: 60, display: 'flex', alignItems: 'center', margin: '0 6px 0 -6px' }}>
                  {
                    isTask ? <ContentCopyIcon style={{ width: 60, height: 60, color: 'rgba(0,0,0,.54)' }} />
                      : entry.type === 'directory' ? <FolderIcon style={{ width: 60, height: 60, color: '#ffa93e' }} />
                        : renderFileIcon(entry.name, null, 60)
                  }
                </div>
                <div style={{ display: 'flex', alignItems: 'center', width: 'calc(100% - 60px)' }}>
                  <div style={{ width: '100%' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        height: 20,
                        color: '#525a60'
                      }}
                    >
                      <div
                        style={{ maxWidth: isTask ? 'calc(100% - 100px)' : '100%' }}
                        className="text"
                      >
                        { entry.name }
                      </div>
                      <div>
                        { isTask && i18n.__('And Other %s Items', entryNum)}
                      </div>
                    </div>
                    <div style={{ color: '#85868c', width: '100%' }}>
                      { this.contentOrSize(data) }
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', height: 20, color: '#525a60', marginTop: 10 }} >
                { i18n.__('Download To') }
              </div>

              <div style={{ display: 'flex', alignItems: 'center', height: 40 }}>
                <input
                  value={downloadPath}
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
              <Divider style={{ width: 380 }} className="divider" />

              <div style={{ height: 40 }} />
              <div style={{ height: 34, width: '100%', display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ flexGrow: 1 }} />
                <RSButton label={i18n.__('Cancel')} onClick={onCancel} alt />
                <div style={{ width: 10 }} />
                <RSButton label={i18n.__('Confirm')} onClick={this.onFire} disabled={this.state.fired} />
              </div>
            </div>
          )
        }
      </Dialog>
    )
  }
}

export default DownloadDialog
