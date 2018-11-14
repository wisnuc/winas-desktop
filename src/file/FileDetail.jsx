import i18n from 'i18n'
import React from 'react'
import prettysize from 'prettysize'
import { Divider } from 'material-ui'
import { LIButton } from '../common/Buttons'
import { TypeSmallIcon, LocationSmallIcon, SizeSmallIcon, ContentSmallIcon, MTimeSmallIcon, AllFileIcon, PublicIcon, CloseIcon } from '../common/Svg'
import renderFileIcon from '../common/renderFileIcon'

const phaseDate = (time) => {
  const a = new Date(time)
  const year = a.getFullYear()
  const month = a.getMonth() + 1
  const date = a.getDate()
  const hour = a.getHours()
  const min = a.getMinutes()
  if (!year) return ''
  return i18n.__('Parse Date Time %s %s %s %s %s', year, month, date, hour, min)
}

const getType = (item) => {
  const type = item && item.type
  if (item && item.isUSB) return i18n.__('USB Menu Name')
  if (type === 'public') return i18n.__('Public Drive')
  if (type === 'directory') return i18n.__('Directory')
  if (type === 'file') return i18n.__('File')
  return i18n.__('Unknown File Type')
}

const getPath = (path) => {
  const newPath = []
  path.map((item, index) => {
    if (!index) {
      newPath.push(item.type === 'publicRoot' ? i18n.__('Public Drive') : item.type === 'home' ? i18n.__('Home Title') : item.name)
    } else {
      newPath.push(item.name)
    }
    return null
  })
  return newPath.join('/')
}

const getSearchPath = (path, entry) => {
  if (!Array.isArray(path) || !path[0] || !entry || !Array.isArray(entry.namepath)) return '--'
  const r = path[0]
  const rootName = r.type === 'publicRoot' ? i18n.__('Public Drive') : r.type === 'home' ? i18n.__('Home Title') : r.name
  const newPath = [rootName, ...entry.namepath]
  newPath.length = entry.namepath.length
  return newPath.join('/')
}

class FileDetail extends React.PureComponent {
  constructor (props) {
    super(props)
    this.state = {
      loading: true,
      dirCount: 0,
      fileCount: 0,
      fileTotalSize: 0
    }

    this.reqAsync = async () => {
      this.setState({ loading: true })
      const { selected, entries, path } = this.props
      let [dirCount, fileCount, fileTotalSize] = [0, 0, 0]
      for (let i = 0; i < selected.length; i++) {
        const entry = entries[selected[i]]
        if (['directory', 'public'].includes(entry.type) || entry.isUSB) {
          if (selected.length > 1) dirCount += 1
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

  componentDidMount () {
    this.reqAsync()
      .then((content) => {
        const { dirCount, fileCount, fileTotalSize } = content
        this.setState({ dirCount, fileCount, fileTotalSize, loading: false })
      })
      .catch(e => console.error('req dir content error', e))
  }

  getSize () {
    return this.state.loading ? i18n.__('Loading') : prettysize(this.state.fileTotalSize, false, true, 2)
  }

  getContent () {
    const { loading, dirCount, fileCount } = this.state
    if (loading) return i18n.__('Loading')
    if (!dirCount) return i18n.__('File Count %s', fileCount)
    return i18n.__('Content %s %s', dirCount, fileCount)
  }

  renderList (icons, titles, values) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', width: '100%' }}>
        {
          values.map((value, index) => {
            if (!value) return (<div key={index.toString()} />)
            const Icon = icons[index]
            const title = titles[index]
            return (
              <div
                key={index.toString()}
                style={{ height: 40, color: '#525a60', display: 'flex', alignItems: 'center', width: '100%' }}
              >
                <div style={{ margin: '2px 2px 0px -5px' }}> <Icon style={{ color: '#85868c' }} /> </div>
                <div style={{ width: 70 }}> { title } </div>
                <input
                  onChange={() => {}}
                  value={value}
                  style={{
                    width: 170,
                    border: 0,
                    padding: 3,
                    fontSize: 14,
                    color: '#888a8c',
                    textAlign: 'right',
                    backgroundColor: '#FFF'
                  }}
                />
              </div>
            )
          })
        }
      </div>
    )
  }

  render () {
    const { selected, entries, path, isSearch, isUSB } = this.props
    const entry = entries[selected[0]]
    if (!entry) return <div />

    const isFile = selected.length === 1 && entry.type === 'file'
    const isMultiple = selected.length > 1

    const Icons = [
      TypeSmallIcon,
      LocationSmallIcon,
      SizeSmallIcon,
      ContentSmallIcon,
      MTimeSmallIcon
    ]

    const Titles = [
      i18n.__('Type'),
      i18n.__('Location'),
      i18n.__('Size'),
      i18n.__('Fold Content'),
      i18n.__('Date Modified')
    ]

    const Values = [
      isMultiple ? i18n.__('Multiple Items') : getType(entry),
      !isSearch ? getPath(path) : !isMultiple ? getSearchPath(path, entry) : '',
      isUSB ? '' : isFile ? prettysize(entry.size, false, true, 2) : this.getSize(),
      isUSB ? '' : !isFile ? this.getContent() : '',
      !isMultiple ? phaseDate(entry.mtime) : ''
    ]

    return (
      <div style={{ width: 320, zIndex: 200 }}>
        <div style={{ height: 60, display: 'flex', alignItems: 'center' }} >
          <div style={{ marginRight: 16, marginLeft: 24 }} className="flexCenter">
            {
              entry.type === 'public' ? <PublicIcon style={{ width: 24, height: 24, color: '#ffa93e' }} />
                : entry.type === 'file' ? renderFileIcon(entry.name, entry.metadata, 24)
                  : <AllFileIcon style={{ width: 24, height: 24, color: '#ffa93e' }} />
            }
          </div>
          <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', color: '#525a60' }} >
            <div
              style={{
                maxWidth: selected.length > 1 ? 120 : 200,
                fontSize: 21,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              { entry.name }
            </div>
            <div>
              { selected.length > 1 && i18n.__('And Other %s Items', selected.length)}
            </div>
          </div>
          <div style={{ marginRight: 8 }}>
            <LIButton onClick={this.props.onRequestClose} >
              <CloseIcon />
            </LIButton>
          </div>
        </div>
        <Divider style={{ width: 280 }} className="divider" />
        <div style={{ height: 24 }} />

        {/* data */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          { this.renderList(Icons, Titles, Values) }
        </div>
      </div>
    )
  }
}

export default FileDetail
