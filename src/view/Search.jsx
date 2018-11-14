import i18n from 'i18n'
import Home from './Home'
import sortByType from '../common/sort'

class Search extends Home {
  constructor (ctx) {
    super(ctx)
    this.title = () => i18n.__('Search Results')
    this.name = ''
    this.types = []
    this.refresh = () => {
      this.search(this.name, this.types)
    }
  }

  willReceiveProps () {
  }

  navEnter () {
    console.log('navEnter Search', this.state, this.props)
    const path = [{ name: i18n.__('Search'), uuid: 'fake-UUID', type: 'search' }]
    this.setState({ showSearch: true, path })
  }

  clearSearch () {
    this.setState({ entries: [], showSearch: true })
  }

  search (name, types) {
    this.name = name
    this.types = types
    if (!name && (!types || !types.length)) {
      this.clearSearch()
      return
    }
    const select = this.select.reset(this.state.entries.length)
    this.setState({ showSearch: name, loading: true, select })
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
          return 'XLXS.XLS'
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
        let entries = res.map(l => Object.assign({ pdrv: pdrives[l.place] }, l))
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
