import React from 'react'
import RenderToLayer from 'material-ui/internal/RenderToLayer'
import keycode from 'keycode'
import EventListener from 'react-event-listener'
import { TweenMax } from 'gsap'
import ReactTransitionGroup from 'react-transition-group/TransitionGroup'
import Preview from './Preview'

class ContainerOverlayInline extends React.Component {
  constructor (props) {
    super(props)

    this.dragPosition = { x: 0, y: 0, left: 0, top: 0 }

    this.state = {
      direction: null,
      detailInfo: false
    }

    this.toggleDialog = op => this.setState({ [op]: !this.state[op] })

    this.currentIndex = this.props.seqIndex

    this.close = () => {
      this.props.onRequestClose()
    }

    /* animation */
    this.animation = (status) => {
      const root = this.refRoot
      const overlay = this.refOverlay
      const time = 0.2
      const ease = global.Power4.easeOut

      if (status === 'In') {
        TweenMax.from(overlay, time, { opacity: 0, ease })
        TweenMax.from(root, time, { opacity: 0, ease })
      }

      if (status === 'Out') {
        TweenMax.to(overlay, time, { opacity: 0, ease })
        TweenMax.to(root, time, { opacity: 0, ease })
      }
    }

    this.handleKeyUp = (event) => {
      switch (keycode(event)) {
        case 'esc': return this.close()
        default: return null
      }
    }

    this.updateContainerSize = (zoom) => {
      this.zoom = zoom
      this.forceUpdate()
    }
  }

  componentWillMount () {
    /* init three items' content */
    this.centerItem = this.props.items[this.currentIndex]
  }

  componentWillUnmount () {
    clearTimeout(this.enterTimeout)
    clearTimeout(this.leaveTimeout)
  }

  /* ReactTransitionGroup */

  componentWillEnter (callback) {
    this.componentWillAppear(callback)
  }

  componentWillAppear (callback) {
    this.animation('In')
    this.enterTimeout = setTimeout(callback, 200) // matches transition duration
  }

  componentWillLeave (callback) {
    this.animation('Out')
    this.leaveTimeout = setTimeout(callback, 200) // matches transition duration
  }

  render () {
    return (
      <div
        ref={ref => (this.refRoot = ref)}
        style={{
          position: 'fixed',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          zIndex: 1500,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        {/* add EventListener to listen keyup */}
        <EventListener target="window" onKeyUp={this.handleKeyUp} />

        {/* overlay */}
        <div
          ref={ref => (this.refOverlay = ref)}
          style={{
            position: 'fixed',
            height: '100%',
            width: '100%',
            top: 0,
            left: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)'
          }}
        />

        {/* preview */}
        <div
          ref={ref => (this.refBackground = ref)}
          style={{
            position: 'relative',
            width: this.state.detailInfo ? 'calc(100% - 360px)' : '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 225ms cubic-bezier(0.0, 0.0, 0.2, 1)'
          }}
          onClick={this.close}
        >
          {
            [this.centerItem].map((item, index) => (
              <div
                key={index.toString()}
                ref={ref => (this[`refPreview_${index}`] = ref)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  opacity: 1,
                  zIndex: 1,
                  height: '100%',
                  width: '100%',
                  transition: 'all 200ms cubic-bezier(0.0, 0.0, 0.2, 1)'
                }}
              >
                <Preview
                  item={item}
                  ipcRenderer={this.props.ipcRenderer}
                  memoize={this.props.memoize}
                  download={this.props.download}
                  path={this.props.path}
                  updateContainerSize={this.updateContainerSize}
                  apis={this.props.apis}
                  parent={this[`refPreview_${index}`]}
                  close={this.close}
                  isMedia={this.props.isMedia}
                />
              </div>
            ))
          }
        </div>
      </div>
    )
  }
}

/*
 * Use RenderToLayer method to move the component to root node
*/

class ContainerOverlay extends React.Component {
  renderLayer () {
    return (
      <ReactTransitionGroup>
        { this.props.open && <ContainerOverlayInline {...this.props} /> }
      </ReactTransitionGroup>
    )
  }

  render () {
    return (
      <RenderToLayer render={() => this.renderLayer()} open useLayerForClickAway={false} />
    )
  }
}

export default ContainerOverlay
