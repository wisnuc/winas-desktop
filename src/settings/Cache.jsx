import i18n from 'i18n'
import React from 'react'
import { ipcRenderer } from 'electron'
import prettysize from 'prettysize'
import { RRButton } from '../common/Buttons'
import ConfirmDialog from '../common/ConfirmDialog'

class ResetDevice extends React.Component {
  constructor (props) {
    super(props)

    this.state = { confirm: false }

    this.showConfirm = () => this.setState({ confirm: true })

    this.cleanCache = () => {
      this.setState({ loading: true, confirm: false })
      ipcRenderer.send('CleanCache')
    }

    this.getCacheSize = (event, result) => {
      this.setState({ cacheSize: prettysize(result.size) })
    }

    this.getCleanCacheResult = (event, error) => {
      this.setState({ loading: false })
      ipcRenderer.send('GetCacheSize')
      if (!error) this.props.openSnackBar(i18n.__('Clean Cache Success'))
      else this.props.openSnackBar(i18n.__('Clean Cache Failed'))
    }
  }

  componentDidMount () {
    ipcRenderer.send('GetCacheSize')
    ipcRenderer.on('CacheSize', this.getCacheSize)
    ipcRenderer.on('CleanCacheResult', this.getCleanCacheResult)
  }

  componentWillUnmount () {
    ipcRenderer.removeListener('CacheSize', this.getCacheSize)
    ipcRenderer.removeListener('CleanCacheResult', this.getCleanCacheResult)
  }

  render () {
    return (
      <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', paddingBottom: 60 }} className="flexCenter" >
        <div style={{ width: 320 }}>
          <div style={{ height: 180, width: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              style={{ width: 320, height: 180 }}
              src="./assets/images/pic_clean.png"
              alt=""
            />
          </div>
          <div style={{ height: 40 }} />
          <div style={{ color: '#888a8c', marginBottom: 40, height: 40, display: 'flex', alignItems: 'center' }}>
            { i18n.__('Clean Cache Text %s', this.state.cacheSize) }
          </div>
          <div style={{ width: 240, height: 40, margin: '0 auto' }}>
            <RRButton
              label={i18n.__('Clean Cache Menu Name')}
              onClick={this.showConfirm}
            />
          </div>
          <div style={{ height: 40 }} />
        </div>
        <ConfirmDialog
          open={this.state.confirm}
          onCancel={() => this.setState({ confirm: false })}
          onConfirm={() => this.cleanCache()}
          title={i18n.__('Confirm Clean Cache Title')}
          text={i18n.__('Confirm Clean Cache Text')}
        />
      </div>
    )
  }
}

export default ResetDevice
