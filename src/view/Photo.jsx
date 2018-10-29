import i18n from 'i18n'
import React from 'react'
import { ipcRenderer } from 'electron'
import { deepPurple800, pinkA200 } from 'material-ui/styles/colors'
import Home from './Home'
import Search from '../common/Search'
import sortByType from '../common/sort'
import { AlbumIcon, AlbumSelectedIcon } from '../common/Svg'

class Photo extends Home {
  constructor (ctx) {
    super(ctx)

    this.state = Object.assign(this.state, { gridView: true, isMedia: true })

    this.title = () => i18n.__('Photo Menu Name')

    this.isMedia = true // flag to disable toolbars or menuItems

    this.type = 'photos'

    this.types = 'JPEG.PNG.JPG.GIF.BMP.RAW'

    this.refresh = (op) => {
      const apis = this.ctx.props.apis
      this.places = apis && apis.drives && apis.drives.data && apis.drives.data.filter(d => d.type === 'private').map(d => d.uuid).join('.')
      this.ctx.props.apis.request(this.type, { places: this.places })
      if (op) this.setState({ scrollTo: op.fileName || op.uuid, loading: !op.noloading }) // fileName for files, uuid for drives
      else this.setState({ loading: true })
    }

    this.handleMediaProps = (nextProps, type) => {
      this.preValue = this.state[type]
      this.handleProps(nextProps.apis, [type])

      /* set force === true  to update sortType forcely */
      if (this.preValue === this.state[type] && !this.force) return

      if (this.state.showSearch && this.force) { // sort search result
        this.force = false
        this.setState({ entries: [...this.state.entries].sort((a, b) => sortByType(a, b, this.state.sortType)) })
        return
      }

      const pdrives = (this.places && this.places.split('.')) || []
      const entries = this.state[type].filter(e => e.hash).map(e => Object.assign({ type: 'file', pdrv: pdrives[e.place] }, e))

      const path = [{ name: this.title(), uuid: null, type: 'mediaRoot' }]
      const select = this.select.reset(entries.length)

      this.force = false

      /* sort entries, reset select, stop loading */
      this.setState({
        path, select, loading: false, entries: [...entries].sort((a, b) => sortByType(a, b, this.state.sortType))
      })
    }

    this.download = () => {
      const selected = this.state.select.selected
      const entries = selected.map(index => this.state.entries[index])
      const path = this.state.path
      this.setState({ onDownload: { selected, entries, path } })
    }

    this.downloadFire = ({ selected, entries, path, downloadPath }) => {
      const apis = this.ctx.props.apis
      const places = apis && apis.drives && apis.drives.data && apis.drives.data.map(d => d.uuid)
      const entriesByDir = entries.sort((a, b) => a.pdir.localeCompare(b.pdir)).reduce((acc, cur) => {
        if (!acc[0]) acc.push([cur])
        else if (acc.slice(-1)[0][0].pdir === cur.pdir) acc.slice(-1)[0].push(cur)
        else acc.push([cur])
        return acc
      }, [])
      entriesByDir.forEach((arr) => {
        const place = arr[0].place
        const driveUUID = places[place]
        const dirUUID = arr[0].pdir
        ipcRenderer.send('DOWNLOAD', { entries: arr, dirUUID, driveUUID })
      })
      this.setState({ onDownload: null })
    }
  }

  willReceiveProps (nextProps) {
    this.handleMediaProps(nextProps, this.type)
  }

  navEnter (target) {
    this.isNavEnter = true
    const apis = this.ctx.props.apis
    if (!apis || !apis.drives || !apis.drives.data) return
    this.refresh()
  }

  groupPrimaryColor () {
    return deepPurple800
  }

  groupAccentColor () {
    return pinkA200
  }

  menuName () {
    return this.title()
  }

  menuIcon () {
    return AlbumIcon
  }

  menuSelectedIcon () {
    return AlbumSelectedIcon
  }

  renderTitle ({ style }) {
    return (
      <div style={style}>
        <div style={{ fontSize: 12, color: 'var(--black-54)', height: 28, marginLeft: 48, display: 'flex', alignItems: 'center' }}>
          { this.menuName() }
        </div>
      </div>
    )
  }

  renderContent ({ openSnackBar, navTo, pin }) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      </div>
    )
  }
}

export default Photo
