import i18n from 'i18n'
import React from 'react'
import { shell } from 'electron'
import { Divider } from 'material-ui'
import { RRButton, RSButton } from '../common/Buttons'
import SimpleScrollBar from '../common/SimpleScrollBar'
import CircularLoading from '../common/CircularLoading'

const compareVerison = (a, b) => {
  const aArray = a.split('.')
  const bArray = b.split('.')

  const len = Math.min(aArray.length, bArray.length)
  for (let i = 0; i < len; i++) {
    if (parseInt(aArray[i], 10) > parseInt(bArray[i], 10)) return 1
    if (parseInt(aArray[i], 10) < parseInt(bArray[i], 10)) return -1
  }
  if (aArray.length > bArray.length) return 1
  if (aArray.length < bArray.length) return -1
  return 0
}

class Update extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      latest: null,
      status: 'request' // request, latest, ready, error
    }

    this.newRelease = (event, result) => {
      const { rel, filePath, error } = result
      if (!rel || error) return this.setState({ status: 'error', error })
      let status = 'needUpdate'
      if (compareVerison(global.config.appVersion, rel.name) >= 0) status = 'latest'
      return this.setState({ rel, filePath, status, error: null })
    }

    this.reqLatest = () => {
      this.setState({ status: 'request', latest: null })
      this.props.phi.req('client', null, (err, res) => {
        if (err || !res || res.error !== '0' || !Array.isArray(res.result)) return this.setState({ status: 'error' })
        const platform = process.platform === 'darwin' ? 'mac' : 'windows'
        const rel = res.result.find(r => r.client_type === platform && r.newest_tag_name.startsWith('V'))
        if (!rel) return this.setState({ status: 'error' })
        const isNew = compareVerison(global.config.appVersion, rel.newest_tag_name.slice(1)) < 0
        if (isNew) return this.setState({ status: 'ready', latest: rel })
        return this.setState({ status: 'latest' })
      })
    }

    this.openWeb = () => {
      const url = 'http://www.phicomm.com/cn/support.php/Lian/software_support.html'
      // if (this.state.latest && this.state.latest.skip_url) url = this.state.latest.skip_url
      shell.openExternal(url)
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
    const text = rel.client_info.split('\r\n')
    return (
      <div style={{ width: 320, height: 180, border: 'solid 1px #eaeaea', boxSizing: 'border-box' }}>
        <div style={{ height: 40, display: 'flex', alignItems: 'center', color: '#505259', marginLeft: 10 }}>
          { i18n.__('New Version Release Time %s %s %s', time[0], time[1], time[2]) }
        </div>
        <Divider style={{ width: 320 }} />
        <SimpleScrollBar height={138} width={308} style={{ marginLeft: 10 }}>
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
    const currentVersion = global.config.appVersion.toUpperCase()
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
        ltsValue = this.state.latest.newest_tag_name && this.state.latest.newest_tag_name.slice(1)
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
          <div style={{ height: 40 }} />

          <div style={{ width: 320, height: 40, margin: '0 auto', paddingLeft: 200, display: 'flex', alignItems: 'center' }}>
            <RRButton
              label={this.state.status === 'request' ? i18n.__('Requesting Updates') : i18n.__('Retry Request Updates')}
              onClick={this.reqLatest}
              loading={this.state.status === 'request'}
            />
          </div>
        </div>
      </div>
    )
  }
}

export default Update
