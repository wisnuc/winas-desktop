import i18n from 'i18n'
import React from 'react'
import sanitize from 'sanitize-filename'

class Name extends React.PureComponent {
  constructor (props) {
    super(props)

    this.value = this.props.entry && (this.props.entry.bname ? this.props.entry.bname : this.props.entry.name)

    this.state = {
      value: this.value,
      errorText: undefined
    }

    this.handleChange = (e) => {
      const value = e.target.value
      const newValue = sanitize(value)
      const entries = this.props.entries
      if (entries.findIndex(entry => entry.name === value) > -1) {
        if (value === this.value) this.setState({ value })
        else this.setState({ value, errorText: i18n.__('Name Exist Error') })
      } else if (value !== newValue) {
        this.setState({ value, errorText: i18n.__('Name Invalid Error') })
      } else {
        this.setState({ value, errorText: '' })
      }
    }

    this.fire = () => {
      if (this.fired || !this.shouldFire()) return
      this.fired = true
      const { apis, path, entry } = this.props
      const curr = path[path.length - 1]
      const args = {
        driveUUID: path[0].uuid,
        dirUUID: curr.uuid,
        entryUUID: entry.uuid,
        newName: this.state.value,
        oldName: entry.name
      }
      /* rename search results */
      if (entry.pdrv) Object.assign(args, { driveUUID: entry.pdrv, dirUUID: entry.pdir })
      const cb = (err) => {
        if (err) {
          this.setState({ errorText: i18n.__('Rename Failed') })
          this.props.openSnackBar(i18n.__('Rename Failed'))
        } else {
          this.props.refresh()
        }
      }

      const isPhy = this.props.path[0].isPhy
      const isPhyRoot = this.props.path[0].isPhyRoot
      if (isPhy || isPhyRoot) {
        let np = path.filter(p => p.type === 'directory').map(p => p.name).join('/')
        if (Array.isArray(entry.namepath)) np = entry.namepath.slice(0, entry.namepath.length - 1).join('/') // search result
        if (np) np = `${np}/`
        const phyArgs = {
          id: isPhy ? path[0].id : path[1].id,
          newPath: np + this.state.value,
          oldPath: np + entry.name
        }
        apis.request('renamePhyDirOrFile', phyArgs, cb)
      } else apis.request('renameDirOrFile', args, cb)
    }

    this.onBlur = () => {
      if (this.fired) return
      if (this.shouldFire()) this.fire()
      else if (this.state.errorText) this.props.openSnackBar(this.state.errorText)
      else this.props.refresh()
    }

    this.onKeyDown = (e) => {
      if (e.which === 13 && this.shouldFire()) this.fire()
      else if (e.which === 13 && this.state.errorText) this.props.openSnackBar(this.state.errorText)
      else if (e.which === 13) this.props.refresh()
    }

    this.reset = () => {
      this.fired = false
      this.notFirst = false
      Object.assign(this.state, { value: this.props.entry && this.props.entry.name })
    }
  }

  shouldFire () {
    return !this.state.errorText && this.state.value.length !== 0 && this.state.value !== this.value
  }

  render () {
    const { entry, modify, onMouseDown, center } = this.props
    const name = entry.bname || entry.name // for backup top directory
    if (!modify) {
      this.reset()
      return (
        <div
          style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: '#525a60', letterSpacing: 1.4 }}
          onMouseDown={onMouseDown}
        >
          { name }
        </div>
      )
    }
    return (
      <div
        onClick={(e) => { e.stopPropagation() }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation() }}
        onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        onMouseDown={(e) => { e.stopPropagation() }}
        style={{ height: '100%', width: '100%', position: 'relative', transform: 'none' }}
        className="flexCenter"
      >
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10 }}
          onMouseDown={() => (this.shouldFire() ? this.fire() : this.props.refresh())}
        />
        <input
          onMouseDown={() => this.input && this.input.selectionEnd && this.input.setSelectionRange(0, 0)}
          name="rename"
          value={this.state.value}
          onChange={this.handleChange}
          onBlur={this.onBlur}
          style={{
            position: 'relative',
            zIndex: 11,
            height: 32,
            width: '100%',
            fontSize: 14,
            color: '#525a60',
            letterSpacing: 1.4,
            backgroundColor: '#FFF',
            textAlign: center ? 'center' : undefined
          }}
          ref={(input) => { // forcus on TextField and autoselect file name without extension
            if (input && !this.notFirst) {
              this.input = input
              input.focus()
              const end = input.value.lastIndexOf('.')
              input.selectionStart = 0
              input.selectionEnd = end > -1 ? end : input.value.length
              this.notFirst = true
            }
          }}
          onKeyDown={this.onKeyDown}
        />
      </div>
    )
  }
}

export default Name
