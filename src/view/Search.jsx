import i18n from 'i18n'
import Home from './Home'
import sortByType from '../common/sort'

class Search extends Home {
  constructor (ctx) {
    super(ctx)
    this.type = 'search'
    this.title = () => i18n.__('Search Results')
    this.name = ''
    this.isSearch = true
    this.types = []
    this.refresh = () => {
      this.search(this.name, this.types)
    }

    const userConfig = Array.isArray(window.config.users) && window.config.users.find(u => u.userUUID === this.userUUID)
    const gridView = userConfig && userConfig[`gridViewIn${this.type}`]

    this.state = Object.assign(this.state, { gridView })
  }

  willReceiveProps () {
    /* set force === true  to update sortType forcely */
    if (!this.force) return
    this.force = false
    this.setState({
      entries: [...this.state.entries].sort((a, b) => sortByType(a, b, this.state.sortType))
    })
  }

  navEnter () {
    console.log('navEnter Search', this.state, this.props)
    const path = [{ name: i18n.__('Search'), uuid: 'fake-UUID', type: 'search' }]
    this.setState({ showSearch: true, path })
  }

  clearSearch () {
    this.setState({ entries: [], showSearch: true, searchContent: undefined })
  }

  search (name, types) {
    console.log('search', name, types)
    this.name = name
    this.types = types

    // turn off search mode when user clear all input
    if (!name && (!types || !types.length)) {
      this.clearSearch()
      return
    }
    const select = this.select.reset(this.state.entries.length)
    this.setState({ showSearch: name, loading: true, select, searchContent: { name, types } })
    const apis = this.ctx.props.apis
    const drives = apis && apis.drives && apis.drives.data
    if (!Array.isArray(drives)) {
      this.ctx.props.openSnackBar(i18n.__('Search Failed'))
      return
    }
    console.log('search', apis)
    const places = drives.map(d => d.uuid).join('.')
    const order = types ? 'newest' : 'find'
    const typesString = Array.isArray(types) && types.map((t) => {
      switch (t) {
        case 'pdf':
          return 'PDF'
        case 'word':
          return 'DOCX.DOC'
        case 'excel':
          return 'XLSX.XLS'
        case 'ppt':
          return 'PPTX.PPT'
        case 'image':
          return 'JPEG.PNG.JPG.GIF.BMP.RAW'
        case 'video':
          return 'RM.RMVB.WMV.AVI.MP4.3GP.MKV.MOV.FLV'
        case 'audio':
          return 'WAV.MP3.APE.WMA.FLAC'
        default:
          return ''
      }
    }).join('.')

    this.ctx.props.apis.pureRequest('search', { name, places, order, types: typesString }, (err, res) => {
      if (err || !res || !Array.isArray(res)) this.setState({ error: true, loading: false })
      else {
        const pdrives = places.split('.')

        let entries = res.map((l) => {
          const pdrv = pdrives[l.place]
          const drive = drives.find(d => d.uuid === pdrv)
          // tag: home/built-in
          const loc = drive.tag || 'backup'
          const driveLabel = drive.label
          const entry = Object.assign({ pdrv, loc, driveLabel }, l)
          return entry
        })
        if (types) entries = entries.filter(e => e.hash).map(e => Object.assign({ type: 'file' }, e))
        this.setState({
          loading: false,
          entries: entries.sort((a, b) => sortByType(a, b, this.state.sortType))
        })
      }
    })
  }
}

export default Search
