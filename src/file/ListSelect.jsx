import EventEmitter from 'eventemitter3'

class ListSelect extends EventEmitter {
  constructor () {
    super()
    this.dragging = []
    this.state = {
      selected: [],

      // put functions here is better to put
      // functions on parent component
      keyEvent: this.keyEvent.bind(this),
      mouseEnter: this.mouseEnter.bind(this),
      mouseLeave: this.mouseLeave.bind(this),
      touchTap: this.touchTap.bind(this),
      ctrlLeftClick: this.ctrlLeftClick.bind(this),
      rowColor: this.rowColor.bind(this),
      rowLeading: this.rowLeading.bind(this),
      rowCheck: this.rowCheck.bind(this),
      rowDrop: this.rowDrop.bind(this),
      rowBorder: this.rowBorder.bind(this),
      toggleDrag: this.toggleDrag.bind(this),
      isDrop: this.isDrop.bind(this),
      addByArray: this.addByArray.bind(this),
      putSelect: this.putSelect.bind(this),
      setModify: this.setModify.bind(this)
    }
  }

  setState (props) {
    this.state = Object.assign({}, this.state, props)
    this.emit('updated', this.state)
  }

  putSelect (selected) {
    this.setState({ selected })
  }

  // this function does NOT emit !!!
  reset (size) {
    this.state = Object.assign({}, this.state, {
      size,
      ctrl: false,
      shift: false,
      hover: -1,
      specified: -1,
      modify: -1,
      selected: []
    })

    return this.state
  }

  setModify (index) {
    this.setState({ selected: [index], modify: index })
  }

  addByArray (array, session) {
    if (this.state.shift) {
      const set = new Set([...array, ...this.state.selected])
      this.setState({ selected: [...set] })
    } else if (this.state.ctrl && session) {
      const isSameBox = this.session === session
      this.session = session
      if (!isSameBox) this.preArray = this.state.selected
      const set = new Set([...array, ...this.preArray])
      array.forEach(i => this.preArray.includes(i) && set.delete(i))
      this.setState({ selected: [...set] })
    } else this.setState({ selected: array })
  }

  keyEvent (ctrl, shift) {
    if (ctrl === this.state.ctrl && shift === this.state.shift) return
    this.setState({ ctrl, shift })
  }

  mouseEnter (index) {
    if (index !== this.state.hover) {
      clearTimeout(this.hoverTimer)
      this.setState({ hover: index, longHover: -1 })
      this.hoverTimer = setTimeout(() => this.setState({ longHover: index }), 1000)
    }
  }

  mouseLeave (index) {
    if (index === this.state.hover) {
      clearTimeout(this.hoverTimer)
      this.setState({ hover: -1, longHover: -1 })
    }
  }

  // select and specify one
  leftClick (index) {
    /* handle modify name status */
    clearTimeout(this.timer)
    let modify = -1

    /* not double click, the only selected item clicked */
    if (this.isDClick !== index && this.state.selected && this.state.selected.length === 1 && this.state.selected[0] === index) {
      modify = index
    }

    this.isDClick = index

    this.timer = setTimeout(() => {
      this.isDClick = -1
      this.setState({ modify })
    }, 1000)

    this.setState({
      modify: -1,
      specified: index !== -1 ? index : this.state.specified,
      selected: index === -1 ? [] : [index]
    })
  }

  // toggle select and (sort of) specified
  ctrlLeftClick (index) {
    if (index === -1) { // click outside
      // this.setState({ selected: [], specified: -1, hover: -1 })
    } else {
      const idx = this.state.selected.indexOf(index)
      if (idx !== -1) {
        this.setState({
          selected: [...this.state.selected.slice(0, idx), ...this.state.selected.slice(idx + 1)],
          specified: -1
        })
      } else {
        this.setState({
          selected: [...this.state.selected, index],
          specified: index
        })
      }
    }
  }

  // 1. if not specified, specify and select
  // 2. range select if specified, and unspecify
  shiftLeftClick (index) {
    const { specified, selected } = this.state

    if (index === -1) { // click outside
      // this.setState({ selected: [], specified: -1, hover: -1 })
    } else if (specified === -1) {
      if (!selected.includes(index)) {
        this.setState({ selected: [...selected, index], specified: index })
      } else {
        this.setState({ specified: index })
      }
    } else {
      const arr = []
      for (let i = Math.min(specified, index); i <= Math.max(specified, index); i++) { arr.push(i) }

      this.setState({
        selected: Array.from(new Set([...selected, ...arr])),
        specified: -1
      })
    }
  }

  // if there is no selection and index === -1, contextmenu
  // if there is no selection and index !== -1, select and contextmenu
  // if there is single selection and index === -1, clear selection and context menu
  // if there is single selection and index !== -1, update select and context menu
  // if there is multiple selection, context menu
  rightClick (index) {
    if (this.state.selected.length <= 1) this.leftClick(index)
    clearTimeout(this.timer)
  }

  ctrlRightClick (index) {
    // no action
  }

  shiftRightClick (index) {
    // no action
  }

  touchTap (button, index) {
    switch (button) {
      case 0:
        return this.state.shift
          ? this.shiftLeftClick(index)
          : this.state.ctrl
            ? this.ctrlLeftClick(index)
            : this.leftClick(index)

      case 2:
        return this.state.shift
          ? this.shiftRightClick(index)
          : this.state.ctrl
            ? this.ctrlRightClick(index)
            : this.rightClick(index)

      default:
        return null
    }
  }

  shiftInRange (index) {
    const { shift, specified, hover } = this.state

    if (!shift) return false
    if (specified === -1 || hover === -1) return false
    const min = Math.min(specified, hover)
    const max = Math.max(specified, hover)
    return index >= min && index <= max
  }

  rowColor (index) {
    if (this.state.selected.includes(index)) return 'rgba(0,150,136,.04)'
    else if (this.shiftInRange(index) || (index === this.state.hover && !this.dragging.length)) return '#FFF'
    return '#FFF'
  }

  rowBorder (index) {
    const dColor = 'rgba(0,150,136,.38)'
    const lColor = 'rgba(0,150,136,.26)'
    let [borderColor, borderTopColor, borderRightColor, borderBottomColor, borderLeftColor] = [dColor, dColor, dColor, dColor, dColor]
    const { selected, specified, hover } = this.state

    /* not selected, not specified, not hover */
    if (!selected.includes(index) && specified !== index && hover !== index) return ({})
    else if (!selected.includes(index) && specified !== index && hover === index) {
      [borderColor, borderTopColor, borderRightColor, borderBottomColor, borderLeftColor] = [lColor, lColor, lColor, dColor, dColor]
    } else {
      borderColor = dColor
      if (selected.includes(index - 1) && selected.includes(index + 1)) {
        [borderTopColor, borderBottomColor] = ['transparent', 'transparent']
      } else if (selected.includes(index - 1) && !selected.includes(index + 1)) {
        borderTopColor = 'transparent'
      } else if (!selected.includes(index - 1) && selected.includes(index + 1)) {
        borderBottomColor = 'transparent'
      } else if (!selected.includes(index - 1) && !selected.includes(index + 1)) {
        borderColor = dColor
      }
    }
    return ({ borderColor, borderTopColor, borderRightColor, borderBottomColor, borderLeftColor })
  }

  rowLeading (index) {
    if (this.state.shift) {
      if (this.shiftInRange(index)) { return 'fullOn' } else if (index === this.state.hover) { return 'activeHint' }
      return 'none'
    } else if (this.ctrl) {
    //  if (index === this.specified)
    //    return 'activeHint'
    //  else if (index === this.hover)
    //    return 'inactiveHint'
    //  else
      return 'none'
    }
    // return index === this.specified ? 'inactiveHint' : 'none'
    return 'none'
  }

  rowCheck (index) {
    if (this.state.shift) {
      if (this.state.selected.includes(index)) return 'checked'
      else if (this.shiftInRange(index) || index === this.state.hover) return 'checking'
      return 'none'
    } else if (this.state.ctrl) {
      if (this.state.selected.includes(index)) return 'checked'
      else if (index === this.state.hover) return 'checking'
      return 'none'
    }

    if (this.state.selected.length > 1 && this.state.selected.includes(index)) return 'checked'
    return 'none'
  }

  rowDrop (index) {
    return index === this.state.hover && this.dragging.length && !this.dragging.includes(index)
  }

  isDrop () {
    return this.dragging.length
  }

  toggleDrag (arr) {
    this.dragging = arr
  }
}

export default ListSelect
