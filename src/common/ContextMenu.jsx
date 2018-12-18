import React, { PureComponent } from 'react'

class ContextMenu extends PureComponent {
  constructor () {
    super()
    this.out = 195
    this.state = { stage: 0 }
  }

  componentDidMount () {
    this.preChildren = this.props.children
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.open === true && this.props.open === false) {
      this.setState({
        stage: 1,
        top: nextProps.top,
        left: nextProps.left
      })
      setTimeout(() => this.setState({ stage: 2 }))
    }
    if (nextProps.open === false && this.props.open === true) {
      this.setState({ stage: 3 })
      setTimeout(() => this.setState({ stage: 0 }), this.out)
    }
  }

  componentDidUpdate () {
    this.preChildren = this.props.children
  }

  // top, left, onRequestClose
  render () {
    if (this.state.stage === 0) return null

    const overlayStyle = {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 998
    }

    const innerStyle = {
      position: 'relative',
      left: this.state.left,
      width: 240,
      paddingTop: 8,
      paddingBottom: 8,
      backgroundColor: 'white',
      overflow: 'hidden',
      transition: 'all 125ms cubic-bezier(0.0, 0.0, 0.2, 1)'
    }

    const boxShadow = 
      '0px 5px 5px -3px rgba(0, 0, 0, 0.2), ' +
      '0px 8px 10px 1px rgba(0, 0, 0, 0.14), ' +
      '0px 3px 14px 2px rgba(0, 0, 0, 0.12)'

    switch (this.state.stage) {
      case 1:
        Object.assign(innerStyle, {
          top: this.state.top - 8,
          maxHeight: 0,
          opacity: 0,
          transition: 'all 125ms cubic-bezier(0.0, 0.0, 0.2, 1)'
        })
        break
      case 2:
        Object.assign(innerStyle, {
          top: this.state.top,
          maxHeight: 384,
          opacity: 1,
          boxShadow,
          transition: 'all 125ms cubic-bezier(0.0, 0.0, 0.2, 1)'
        })
        break
      case 3:
        Object.assign(innerStyle, {
          top: this.state.top,
          maxHeight: 384,
          opacity: 0,
          boxShadow,
          transition: `all ${this.out}ms cubic-bezier(0.4, 0.0, 1, 1)`
        })
        break
      case 0:
      default:
        break
    }

    return (
      <div style={overlayStyle} onClick={this.props.onRequestClose} onContextMenu={this.props.onRequestClose}>
        <div style={innerStyle}>
          { this.state.stage !== 3 ? this.props.children : this.preChildren}
        </div>
      </div>
    )
  }
}

export default ContextMenu
