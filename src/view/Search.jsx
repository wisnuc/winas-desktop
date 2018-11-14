import i18n from 'i18n'
import Home from './Home'
import sortByType from '../common/sort'

class Search extends Home {
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

  search (name) {
    if (!name) return
    const select = this.select.reset(this.state.entries.length)
    this.setState({ showSearch: name, loading: true, select })
    const types = this.types // photo, docs, video, audio
    const apis = this.ctx.props.apis
    const drives = apis && apis.drives && apis.drives.data
    if (!Array.isArray(drives)) {
      this.ctx.props.openSnackBar(i18n.__('Search Failed'))
      return
    }
    const places = types ? drives.map(d => d.uuid).join('.') // media
      : this.isPublic ? drives.filter(d => d.type === 'public').map(d => d.uuid).join('.') // public
        : drives.find(d => d.type === 'private').uuid // home
    const order = types ? 'newest' : 'find'

    this.ctx.props.apis.pureRequest('search', { name, places, order }, (err, res) => {
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
