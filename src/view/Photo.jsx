import i18n from 'i18n'
import React from 'react'
import { ipcRenderer } from 'electron'
import { TweenMax } from 'gsap'
import { deepPurple800, pinkA200 } from 'material-ui/styles/colors'
import Home from './Home'
import sortByType from '../common/sort'
import { AlbumIcon, AlbumSelectedIcon, AddIcon, MoreIcon } from '../common/Svg'

import PhotoApp from '../photo/PhotoApp'
import { combineElement, removeElement } from '../common/array'

const getName = (photo) => {
  if (!photo.date && !photo.datetime) {
    return `IMG_UnkownDate-${photo.hash.slice(0, 5).toUpperCase()}-PC.${photo.m}`
  }
  const date = photo.date || photo.datetime
  return `IMG-${date.split(/\s+/g)[0].replace(/[:\s]+/g, '')}-${photo.hash.slice(0, 5).toUpperCase()}-PC.${photo.m}`
}

/* increase limit of listeners of EventEmitter */
ipcRenderer.setMaxListeners(1000)

class Photo extends Home {
  constructor (ctx) {
    super(ctx)
    this.state = {
      media: null,
      blacklist: null,
      selectedItems: [],
      shiftHoverItems: [],
      uploadMedia: false,
      shift: false
    }

    this.preMedia = null
    this.preBL = null
    this.value = null

    this.processMedia = (media, blacklist) => {
      // console.log('processMedia start', (new Date()).getTime() - this.timeFlag)
      /* no data */
      if (!Array.isArray(media) || !Array.isArray(blacklist)) return null

      /* data not change */
      if (media === this.preMedia && blacklist === this.preBL && this.value) return this.value

      /* store data */
      this.preMedia = media
      this.preBL = blacklist

      const removeBlacklist = (m, l) => {
        if (!m.length || !l.length) return m
        const map = new Map()
        m.filter(item => !!item.hash).forEach(d => map.set(d.hash, d))
        l.forEach(b => map.delete(b))
        return [...map.values()]
      }

      /* remove photos without hash and filter media by blacklist */
      this.value = removeBlacklist(media, blacklist)

      /* formate date */
      this.value.forEach((v) => {
        let date = v.date || v.datetime
        if (!date || date.search(/:/g) !== 4 || date.search(/^0/) > -1) date = ''
        v.date = date
      })

      /* sort photos by date */
      this.value.sort((prev, next) => next.date.localeCompare(prev.date))

      console.log('processMedia finished', (new Date()).getTime() - this.timeFlag)
      return this.value
    }

    this.memoizeValue = { currentDigest: '', currentScrollTop: 0 }
    this.firstSelect = true

    this.setAnimation = (component, status) => {
      if (component === 'NavigationMenu') {
        /* add animation to NavigationMenu */
        const transformItem = this.refNavigationMenu
        const time = 0.4
        const ease = global.Power4.easeOut
        if (status === 'In') {
          TweenMax.to(transformItem, time, { rotation: 180, opacity: 1, ease })
        }
        if (status === 'Out') {
          TweenMax.to(transformItem, time, { rotation: -180, opacity: 0, ease })
        }
      }
    }

    this.memoize = (newValue) => {
      this.memoizeValue = Object.assign(this.memoizeValue, newValue)
      return this.memoizeValue
    }

    this.requestData = eq => this.ctx.props.apis.request(eq)

    this.addListToSelection = (digests) => {
      if (this.firstSelect) {
        this.ctx.openSnackBar(i18n.__('Shift Tips'))
        this.firstSelect = false
      }
      this.setState({ selectedItems: combineElement(digests, this.state.selectedItems).sort() })
      this.lastSelect = digests.length === 1 ? digests[0] : null
    }

    this.removeListToSelection = (digests) => {
      this.setState({ selectedItems: removeElement(digests, this.state.selectedItems).sort() })
      this.lastSelect = null
    }

    this.clearSelect = () => {
      this.lastSelect = null
      this.setState({ selectedItems: [] })
    }

    this.getHoverPhoto = (digest) => {
      if (!this.state.selectedItems.length || !this.state.shift || !this.lastSelect) return
      const lastSelectIndex = this.media.findIndex(photo => photo.hash === this.lastSelect)
      const hoverIndex = this.media.findIndex(photo => photo.hash === digest)
      let shiftHoverPhotos = this.media.slice(lastSelectIndex, hoverIndex + 1)

      if (hoverIndex < lastSelectIndex) shiftHoverPhotos = this.media.slice(hoverIndex, lastSelectIndex + 1)
      this.setState({ shiftHoverItems: shiftHoverPhotos.map(photo => photo.hash) })
    }

    this.getShiftStatus = (event) => {
      if (event.shiftKey === this.state.shift) return
      this.setState({ shift: event.shiftKey })
      if (!event.shiftKey) this.setState({ shiftHoverItems: [] })
    }

    this.startDownload = () => {
      const list = this.state.selectedItems.length
        ? this.state.selectedItems
        : [this.memoizeValue.downloadDigest]

      const photos = list.map(digest => this.media.find(photo => photo.hash === digest))
        .map(photo => ({
          name: getName(photo),
          size: photo.size,
          type: 'file',
          uuid: photo.hash
        }))

      ipcRenderer.send('DOWNLOAD', { entries: photos, dirUUID: 'media' })
      this.setState({ selectedItems: [] })
    }

    this.removeMedia = () => {
      if (this.state.selectedItems.length > 0) {
        this.ctx.openSnackBar(i18n.__('Remove Media Success %s', this.state.selectedItems.length))
        this.setState({ selectedItems: [] })
      } else {
        this.ctx.openSnackBar(i18n.__('Remove Media Failed'))
      }
    }

    this.hideMedia = (show) => { // show === true ? show media : hide media
      const list = this.state.selectedItems.length
        ? this.state.selectedItems
        : [this.media.find(item => item.hash === this.memoizeValue.downloadDigest).hash]

      this.ctx.props.apis.request(show ? 'subtractBlacklist' : 'addBlacklist', list, (error) => {
        if (error) {
          this.ctx.openSnackBar(show ? i18n.__('Retrieve Media Failed') : i18n.__('Hide Media Failed'))
        } else {
          this.ctx.openSnackBar(show ? i18n.__('Retrieve Media Success %s', list.length)
            : i18n.__('Hide Media Success %s', list.length))
          this.navEnter()
          this.setState({ selectedItems: [] })
        }
      })
    }

    this.uploadMediaAsync = async () => {
      const driveUUID = this.ctx.props.apis.drives.data.find(d => d.tag === 'home').uuid
      const stationID = this.ctx.props.selectedDevice.token.data.stationID
      const data = await this.ctx.props.apis.requestAsync('mkdir', {
        driveUUID,
        dirUUID: driveUUID,
        dirname: i18n.__('Media Folder Name')
      })
      const dirUUID = stationID ? data.uuid : data[0].data.uuid
      const newData = await this.ctx.props.apis.requestAsync('mkdir', { driveUUID, dirUUID, dirname: i18n.__('Media Folder From PC') })
      const targetUUID = stationID ? newData.uuid : newData[0].data.uuid
      ipcRenderer.send('UPLOADMEDIA', { driveUUID, dirUUID: targetUUID })
    }

    this.uploadMedia = () => {
      if (!window.navigator.onLine) this.ctx.openSnackBar(i18n.__('Offline Text'))
      else {
        this.uploadMediaAsync().catch((e) => {
          console.log('uploadMedia failed', e)
          if (e && e.response && e.response.body && e.response.body.code === 'EEXIST') {
            this.ctx.openSnackBar(i18n.__('Upload Media Folder EEXIST Text'))
          } else {
            this.ctx.openSnackBar(i18n.__('Upload Media Failed'))
          }
        })
      }
    }

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

      this.force = false

      /* sort entries, reset select, stop loading */
      this.setState({
        path, loading: false, entries: [...entries].sort((a, b) => sortByType(a, b, this.state.sortType))
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
    // this.handleMediaProps(nextProps, this.type)
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

  navGroup () {
    return 'file'
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

  renderDragItems () {
  }

  renderAddAlbum ({ primaryColor }) {
    return (
      <div style={{ width: 196, height: 244, float: 'left', marginLeft: 20, cursor: 'pointer' }}>
        <div
          style={{
            width: 196,
            height: 196,
            borderRadius: 6,
            backgroundColor: '#f5f5f5',
            border: 'solid 1px #e8eaed'
          }}
          className="flexCenter"
        >
          <AddIcon style={{ color: primaryColor, height: 28, width: 28 }} />
        </div>
        <div style={{ height: 48 }}>
          <div style={{ height: 24, display: 'flex', alignItems: 'center' }}>
            { i18n.__('Create Album') }
          </div>
        </div>
      </div>
    )
  }

  renderAllPhoto ({ primaryColor }) {
    const src = 'file:///home/lxw/.config/phicomm/imagecache/2df6e7107b7efbc5da5226273de1c24f9e0d839fbc21f13a5e843e1801ec16e9'
    return (
      <div style={{ width: 196, height: 244, float: 'left', marginLeft: 20, cursor: 'pointer' }}>
        <div
          style={{
            width: 196,
            height: 196,
            borderRadius: 6,
            position: 'relative',
            backgroundColor: '#f5f5f5',
            border: 'solid 1px #e8eaed'
          }}
          className="flexCenter"
        >
          <img src={src} alt="cover" style={{ height: 196, width: 196, objectFit: 'cover' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, height: 36, width: 36 }} className="flexCenter">
            <MoreIcon onClick={e => this.setState({ openMenu: true, anchorEl: e.currentTarget })} />
          </div>
        </div>
        <div style={{ height: 48 }}>
          <div style={{ height: 24, display: 'flex', alignItems: 'center' }}>
            { i18n.__('All Photos') }
          </div>
          <div style={{ height: 24, display: 'flex', alignItems: 'center' }}>
            { i18n.__('%s Itesms', 124) }
          </div>
        </div>
      </div>
    )
  }

  renderVideos () {
    return (
      <div style={{ width: 196, height: 244, float: 'left', marginLeft: 20, cursor: 'pointer' }}>
        <div
          style={{
            width: 196,
            height: 196,
            borderRadius: 6,
            position: 'relative',
            backgroundColor: '#f5f5f5',
            border: 'solid 1px #e8eaed'
          }}
          className="flexCenter"
        />
        <div style={{ height: 48 }}>
          <div style={{ height: 24, display: 'flex', alignItems: 'center' }}>
            { i18n.__('All Videos') }
          </div>
          <div style={{ height: 24, display: 'flex', alignItems: 'center' }}>
            { i18n.__('No Content') }
          </div>
        </div>
      </div>
    )
  }

  renderAlbum ({ primaryColor }) {
    const src = 'file:///home/lxw/.config/phicomm/imagecache/0204c3b20b7761e986f5aa5f12aa07ca153290d680bf06dc02860138856cf193'
    return (
      <div style={{ width: 196, height: 244, float: 'left', marginLeft: 20, cursor: 'pointer' }}>
        <div
          style={{
            width: 196,
            height: 196,
            borderRadius: 6,
            position: 'relative',
            backgroundColor: '#f5f5f5',
            border: 'solid 1px #e8eaed'
          }}
          className="flexCenter"
        >
          <img src={src} alt="cover" style={{ height: 196, width: 196, objectFit: 'cover' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, height: 36, width: 36 }} className="flexCenter">
            <MoreIcon onClick={e => this.setState({ openMenu: true, anchorEl: e.currentTarget })} />
          </div>
        </div>
        <div style={{ height: 48 }}>
          <div style={{ height: 24, display: 'flex', alignItems: 'center' }}>
            { i18n.__('Album 001') }
          </div>
          <div style={{ height: 24, display: 'flex', alignItems: 'center' }}>
            { i18n.__('%s Itesms', 72) }
          </div>
        </div>
      </div>
    )
  }

  renderContent ({ primaryColor }) {
    return (
      <div style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 28, paddingTop: 24 }}>
        { this.renderAddAlbum({ primaryColor }) }
        { this.renderAllPhoto({ primaryColor }) }
        { this.renderVideos({ primaryColor }) }
        { this.renderAlbum({ primaryColor }) }
      </div>
    )
  }

  renderContent2 () {
    return (<PhotoApp
      media={this.media || []}
      ipcRenderer={ipcRenderer}
      apis={this.ctx.props.apis}
      requestData={this.requestData}
      setAnimation={this.setAnimation}
      memoize={this.memoize}
      removeListToSelection={this.removeListToSelection}
      addListToSelection={this.addListToSelection}
      selectedItems={this.state.selectedItems}
      clearSelect={this.clearSelect}
      primaryColor={this.groupPrimaryColor()}
      startDownload={this.startDownload}
      removeMedia={this.removeMedia}
      hideMedia={this.hideMedia}
      getHoverPhoto={this.getHoverPhoto}
      getShiftStatus={this.getShiftStatus}
      shiftStatus={{ shift: this.state.shift, items: this.state.shiftHoverItems }}
    />)
  }
}

export default Photo
