import React from 'react'
import EventListener from 'react-event-listener'

class ScrollBar extends React.PureComponent {
  constructor (props) {
    super(props)
    this.state = {
      scrollHeight: 0,
      mouseDown: false
    }

    this.updateScrollHeight = () => {
      if (this.refRoot) this.setState({ scrollHeight: this.refRoot.scrollHeight, clientHeight: this.refRoot.clientHeight })
    }

    this.scrollTop = 0

    this.onMouseDown = (event) => {
      event.preventDefault()
      event.stopPropagation()
      this.setState({ mouseDown: true })
      this.startY = event.clientY
      this.startScrollTop = this.scrollTop
    }

    this.onMouseUp = () => this.setState({ mouseDown: false })

    this.onMouseMove = (event) => {
      if (!this.refBar || !this.state.mouseDown || !this.state.scrollHeight) return
      const { scrollHeight, clientHeight } = this.state
      const barH = Math.max(clientHeight * clientHeight / scrollHeight, 48)
      const diff = event.clientY - this.startY
      const percent = diff / (clientHeight - barH)
      const scrollTop = Math.min(scrollHeight - clientHeight, Math.max(0, percent * (scrollHeight - clientHeight) + this.startScrollTop))
      this.scrollToPosition(scrollTop)
      this.onHover()
    }

    this.onHover = () => {
      this.setState({ hover: true })
      clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        this.setState({ hover: false })
      }, 1000)
    }

    this.onScroll = (e) => {
      if (e.target.scrollHeight) {
        const { scrollTop, scrollHeight, clientHeight } = e.target
        this.scrollTop = scrollTop
        const barH = Math.max(clientHeight * clientHeight / scrollHeight, 48) || 48
        const top = (clientHeight - barH) * scrollTop / (scrollHeight - clientHeight)
        this.refBar.style.top = `${top}px`
      }

      if (e.target.scrollHeight !== this.state.scrollHeight) this.setState({ scrollHeight: e.target.scrollHeight })
    }

    this.handleResize = () => setTimeout(() => this.updateScrollHeight(), 100)
  }

  componentDidMount () {
    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('mouseup', this.onMouseUp)
    setTimeout(() => this.updateScrollHeight(), 100)
  }

  componentWillReceiveProps () {
    setTimeout(() => this.updateScrollHeight(), 100)
  }

  componentWillUnmount () {
    clearTimeout(this.timer)
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mouseup', this.onMouseUp)
  }

  scrollToPosition (scrollTop) {
    if (this.refRoot) this.refRoot.scrollTop = scrollTop
  }

  render () {
    const { width, height, style } = this.props
    const rootStyle = Object.assign({ position: 'relative', width, height, overflow: 'hidden' }, style)

    const { scrollHeight, clientHeight } = this.state

    const barH = Math.max(clientHeight * clientHeight / scrollHeight, 48) || 48
    const barStyle = {
      position: 'absolute',
      top: 0,
      right: 0,
      width: this.state.hover ? 10 : 3,
      borderRadius: 4,
      transition: 'opacity 225ms',
      display: scrollHeight && (barH < clientHeight) ? '' : 'none'
    }
    const backgroundColor = this.state.mouseDown ? 'rgba(0,150,136)' : this.state.hover ? 'rgba(0,150,136,0.38)' : 'rgba(0,0,0,.26)'

    return (
      <div style={rootStyle}>
        <EventListener target="window" onResize={this.handleResize} />
        <div
          onScroll={this.onScroll}
          ref={ref => (this.refRoot = ref)}
          style={{ position: 'absolute', width: width + 16, height, overflowY: 'scroll', overflowX: 'hidden', top: 0, left: 0 }}
        >
          { this.props.children }
        </div>

        {/* scrollBar hover area */}
        <div
          onMouseMove={this.onHover}
          style={Object.assign({ backgroundColor: 'transparent', height }, barStyle, { width: 10 })}
        />

        {/* scrollBar background */}
        <div
          onMouseMove={this.onHover}
          style={Object.assign({ backgroundColor: 'rgba(0,0,0,.1)', height }, barStyle)}
        />

        {/* scrollBar */}
        <div
          ref={ref => (this.refBar = ref)}
          onMouseMove={this.onHover}
          onMouseDown={this.onMouseDown}
          style={Object.assign({ backgroundColor, height: barH }, barStyle)}
        />
      </div>
    )
  }
}

export default ScrollBar
