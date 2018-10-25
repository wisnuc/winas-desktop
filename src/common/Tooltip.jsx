import React from 'react'

class Tooltip extends React.PureComponent {
  constructor (props) {
    super(props)
    this.distance = 8
    this.dur = 120

    this.marginLeft = 0

    this.state = {
      status: 'closed' // opening, open, closing, closed
    }

    this.leave = () => {
      if (['closing', 'closed'].includes(this.state.status)) return
      clearTimeout(this.timer)
      this.setState({ status: 'closing' })
      this.timer = setTimeout(() => this.setState({ status: 'closed' }), this.dur)
    }

    this.enter = () => {
      if (['opening', 'open'].includes(this.state.status)) return
      clearTimeout(this.timer)
      this.setState({ status: 'opening' })
      this.timer = setTimeout(() => this.setState({ status: 'open' }), this.dur)
    }
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.disabled && this.state.status !== 'closed') this.setState({ status: 'closed' })
  }

  componentDidUpdate () {
    if (this.tooltipRef && this.rootRef) {
      this.marginLeft = (this.rootRef.offsetWidth - this.tooltipRef.offsetWidth) / 2
      this.tooltipRef.style.marginLeft = this.marginLeft
    }
  }

  render () {
    const status = this.state.status

    const style = Object.assign({
      position: 'absolute',
      pointerEvents: 'none', // ignore all mouse event, important
      width: 'max-content', // important
      top: (status === 'opening' || status === 'closing') ? -this.distance : 0,
      zIndex: 100,
      fontSize: 12,
      color: '#FFF',
      marginTop: 50,
      marginLeft: this.marginLeft,
      backgroundColor: '#000000',
      borderRadius: 4,
      border: 'solid 1px #d9d9d9',
      padding: '4px 10px',
      opacity: (['opening', 'closing', 'closed'].includes(status)) ? 0 : 1,
      transition: status === 'opening'
        ? `top ${this.dur}ms cubic-bezier(0.0, 0.0, 0.2, 1), opacity ${this.dur}ms cubic-bezier(0.0, 0.0, 0.2, 1)`
        : `top ${this.dur}ms cubic-bezier(0.4, 0.0, 1, 1), opacity ${this.dur}ms cubic-bezier(0.4, 0.0, 1, 1)`
    }, this.props.style)

    const listeners = {
      onMouseMove: this.enter,
      onMouseLeave: this.leave
    }

    return (
      <div ref={ref => (this.rootRef = ref)} style={{ position: 'relative' }}>
        {
          this.props.tooltip && !this.props.disabled &&
            <div style={style} ref={ref => (this.tooltipRef = ref)}>
              { this.props.tooltip }
            </div>
        }
        { React.cloneElement(this.props.children, listeners) }
      </div>
    )
  }
}

export default Tooltip
