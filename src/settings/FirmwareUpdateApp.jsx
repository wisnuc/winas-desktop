import i18n from 'i18n'
import React from 'react'
import { Divider } from 'material-ui'
import { shell, remote } from 'electron'

import Dialog from '../common/PureDialog'
import UploadingFirmware from './UploadingFirmware'
import SimpleScrollBar from '../common/SimpleScrollBar'
import CircularLoading from '../common/CircularLoading'
import { RRButton, RSButton } from '../common/Buttons'

class Update extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      status: 'request', // request, latest, ready, error
      uploading: false
    }

    this.onChoose = () => {
      remote.dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'image', extensions: ['img'] }] }, (filePaths) => {
        if (!filePaths || !filePaths.length) return
        this.setState({ path: filePaths[0] })
      })
    }

    this.reqLatest = () => {
      this.setState({ status: 'request', latest: null })
      this.props.apis.pureRequest('firmwareFetch', null, (err, res) => {
        if (err || !res || res.error !== '0') this.setState({ status: 'error' })
        else if (res.desc === 'New firmware version exist!') this.setState({ status: 'ready', latest: res.result })
        else this.setState({ status: 'latest' }) // res.desc === 'no new version ready'
      })
    }

    this.openWeb = () => {
      shell.openExternal('http://www.phicomm.com/cn/support.php/Lian/software_support.html')
    }
  }

  componentDidMount () {
    this.reqLatest()
  }

  renderLoading () {
    return (
      <div style={{ width: '100%', height: 'calc(100% - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} >
        <CircularLoading />
      </div>
    )
  }

  renderRel (rel) {
    const time = rel.releaseTime.slice(0, 10).split('-')
    const text = rel.software_info.split('\r\n')
    return (
      <div style={{ width: 320, height: 180, border: 'solid 1px #eaeaea', boxSizing: 'border-box' }}>
        <div style={{ height: 40, display: 'flex', alignItems: 'center', color: '#505259', marginLeft: 10 }}>
          { i18n.__('New Version Release Time %s %s %s', time[0], time[1], time[2]) }
        </div>
        <Divider style={{ width: 320 }} />
        <SimpleScrollBar height={138} width={310} style={{ marginLeft: 10 }}>
          <div style={{ height: 20, marginTop: 10, color: '#505259' }}>
            { i18n.__('Update Content') }
          </div>
          <div style={{ height: 5 }} />
          {
            text.map((v, i) => (
              <div style={{ lineHeight: '20px', color: '#85868c', width: 300 }} key={i.toString()}>
                { v }
              </div>
            ))
          }
        </SimpleScrollBar>
      </div>
    )
  }

  render () {
    const { device } = this.props
    if (!device) return this.renderLoading()
    const currentVersion = device.swVersion

    let ltsValue = '--'
    let text = ''
    let showRel = false
    let color = '#525a60'

    switch (this.state.status) {
      case 'request':
        ltsValue = i18n.__('Checking')
        text = i18n.__('Checking New Version')
        break
      case 'ready':
        ltsValue = this.state.latest.tag_name
        text = i18n.__('Latest Version Ready')
        showRel = true
        color = '#ff0000'
        break
      case 'latest':
        ltsValue = currentVersion
        text = i18n.__('Already Latest Version')
        color = '#ff0000'
        break
      case 'error':
        text = i18n.__('Check New Version Failed')
        color = '#ff0000'
        break
      default:
        break
    }

    return (
      <div style={{ width: '100%', height: '100%' }} className="flexCenter" >
        <div style={{ width: 480, paddingRight: 160, paddingBottom: 60 }}>
          <div style={{ width: 320, height: 180, marginLeft: 160 }}>
            {
              showRel ? this.renderRel(this.state.latest)
                : (
                  <img
                    style={{ width: 320, height: 180 }}
                    src="./assets/images/pic_versioncheck.png"
                    alt=""
                  />
                )
            }
          </div>

          <div style={{ width: 240, height: 40, margin: '0 auto', paddingLeft: 160, color }} className="flexCenter">
            { text }
          </div>

          <div style={{ height: 40, width: '100%', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 130, textAlign: 'right', color: '#525a60' }}>
              { i18n.__('Current Version') }
            </div>
            <div style={{ width: 30 }} />
            <div style={{ width: 150, color: '#888a8c' }}>
              { currentVersion }
            </div>
          </div>

          <div style={{ height: 1, width: 320, marginLeft: 160, marginTop: -1, backgroundColor: '#bfbfbf', opacity: 0.5 }} />
          <div style={{ height: 20 }} />

          <div style={{ height: 40, width: '100%', display: 'flex', alignItems: 'center', position: 'relative' }}>
            <div style={{ width: 130, textAlign: 'right', color: '#525a60' }}>
              { i18n.__('Latest Version') }
            </div>
            <div style={{ width: 30 }} />
            <div style={{ width: 150, color: '#888a8c' }}>
              { ltsValue }
            </div>
            <div style={{ position: 'absolute', right: 0 }}>
              <RSButton
                alt
                onClick={this.openWeb}
                style={{ padding: '0 17px' }}
                labelStyle={{ height: 28 }}
                label={i18n.__('Open Web to Download Firmware')}
              />
            </div>
          </div>

          <div style={{ height: 1, width: 320, marginLeft: 160, marginTop: -1, backgroundColor: '#bfbfbf', opacity: 0.5 }} />
          <div style={{ height: 20 }} />

          <div style={{ position: 'relative', height: 40, width: '100%', display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 130, textAlign: 'right', color: '#525a60' }}>
              { i18n.__('Install Package') }
            </div>
            <div style={{ width: 30 }} />
            <input
              value={this.state.path || ''}
              onChange={() => {}}
              style={{ width: 220, color: '#888a8c', fontSize: 14 }}
            />
            <div style={{ position: 'absolute', right: 0 }}>
              <RSButton
                alt
                onClick={this.onChoose}
                label={i18n.__('Choose')}
                labelStyle={{ height: 28, width: 40 }}
              />
            </div>
          </div>

          <div style={{ height: 1, width: 320, marginLeft: 160, marginTop: -1, backgroundColor: '#bfbfbf', opacity: 0.5 }} />
          <div style={{ height: 40 }} />

          <div style={{ width: 320, height: 40, margin: '0 auto', paddingLeft: 200, display: 'flex', alignItems: 'center' }}>
            <RRButton
              label={i18n.__('Update Immediately')}
              onClick={() => this.setState({ uploading: true })}
              disabled={!this.state.path}
            />
          </div>
        </div>
        <Dialog open={!!this.state.uploading} onRequestClose={() => this.setState({ uploading: false })} modal transparent >
          {
            !!this.state.uploading &&
              <UploadingFirmware
                {...this.props}
                absPath={this.state.path}
                onRequestClose={() => this.setState({ uploading: false })}
              />
          }
        </Dialog>
      </div>
    )
  }
}

export default Update
