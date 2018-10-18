import i18n from 'i18n'
import React from 'react'
import { ipcRenderer, remote } from 'electron'
import { IconButton } from 'material-ui'
import RenderToLayer from 'material-ui/internal/RenderToLayer'
import keycode from 'keycode'
import EventListener from 'react-event-listener'
import { TweenMax } from 'gsap'
import ReactTransitionGroup from 'react-transition-group/TransitionGroup'
import Preview from './Preview'
import { DownloadFileIcon, WinFullIcon, WinNormalIcon, CloseIcon } from '../common/Svg'
import { SIButton } from '../common/Buttons'

class ContainerOverlayInline extends React.Component {
  constructor (props) {
    super(props)

    this.dragPosition = { x: 0, y: 0, left: 0, top: 0 }

    this.state = {
      direction: null,
      detailInfo: false
    }

    this.toggleMax = () => ipcRenderer.send('TOGGLE_MAX')

    this.toggleDialog = op => this.setState({ [op]: !this.state[op] })

    this.currentIndex = this.props.seqIndex

    this.close = () => {
      this.props.onRequestClose()
    }

    this.changeIndex = (direction) => {
      if (direction === 'right' && this.currentIndex < this.props.items.length - 1) {
        this.currentIndex += 1

        /* hidden left div which move 200%, show other divs */
        for (let i = 0; i < 3; i++) {
          if (this[`refPreview_${i}`].style.left === '-20%') {
            /* update div content */
            let item = {}
            if (this.currentIndex < this.props.items.length - 1) item = this.props.items[this.currentIndex + 1]
            if (!i) {
              this.leftItem = item
            } else if (i === 1) {
              this.centerItem = item
            } else {
              this.rightItem = item
            }
            this[`refPreview_${i}`].style.opacity = 0
            this[`refPreview_${i}`].style.zIndex = 0
          } else if (this[`refPreview_${i}`].style.left === '20%') {
            this[`refPreview_${i}`].style.opacity = 1
            this[`refPreview_${i}`].style.zIndex = 1
          } else {
            this[`refPreview_${i}`].style.opacity = 0
            this[`refPreview_${i}`].style.zIndex = 0
          }
        }
        const tmp = this.refPreview_2.style.left
        this.refPreview_2.style.left = this.refPreview_1.style.left
        this.refPreview_1.style.left = this.refPreview_0.style.left
        this.refPreview_0.style.left = tmp
      } else if (direction === 'left' && this.currentIndex > this.firstFileIndex) {
        this.currentIndex -= 1

        /* hidden right div which move 200%, show other divs */
        for (let i = 0; i < 3; i++) {
          if (this[`refPreview_${i}`].style.left === '20%') {
            /* update div content */
            let item = {}
            if (this.currentIndex) item = this.props.items[this.currentIndex - 1]
            if (!i) {
              this.leftItem = item
            } else if (i === 1) {
              this.centerItem = item
            } else {
              this.rightItem = item
            }
            this[`refPreview_${i}`].style.opacity = 0
            this[`refPreview_${i}`].style.zIndex = 0
          } else if (this[`refPreview_${i}`].style.left === '-20%') {
            this[`refPreview_${i}`].style.opacity = 1
            this[`refPreview_${i}`].style.zIndex = 1
          } else {
            this[`refPreview_${i}`].style.opacity = 0
            this[`refPreview_${i}`].style.zIndex = 0
          }
        }
        const tmp = this.refPreview_0.style.left
        this.refPreview_0.style.left = this.refPreview_1.style.left
        this.refPreview_1.style.left = this.refPreview_2.style.left
        this.refPreview_2.style.left = tmp
        this.RightItem = this.props.items[this.currentIndex - 2]
      } else return
      this.props.select(0, this.currentIndex)
      // this.forceUpdate()
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
        case 'left': return this.changeIndex('left')
        case 'right': return this.changeIndex('right')
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
    this.leftItem = {}
    this.rightItem = {}
    if (this.currentIndex) {
      this.leftItem = this.props.items[this.currentIndex - 1]
    }
    if (this.currentIndex < this.props.items.length - 1) {
      this.rightItem = this.props.items[this.currentIndex + 1]
    }
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
    const hoverColor = 'rgba(0,0,0,.3)'
    const entry = this.props.items[this.currentIndex]
    this.firstFileIndex = this.props.items.findIndex(item => item.type === 'file')

    const isMaximized = remote.getCurrentWindow().isMaximized()
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
          alignItems: 'center',
          WebkitAppRegion: 'no-drag'
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
            backgroundColor: 'rgba(0, 0, 0, 0.85)'
          }}
        />

        {/* preview */}
        <div
          ref={ref => (this.refBackground = ref)}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 225ms cubic-bezier(0.0, 0.0, 0.2, 1)'
          }}
          onClick={this.close}
        >
          {
            [this.leftItem, this.centerItem, this.rightItem].map((item, index) => (
              <div
                key={index.toString()}
                ref={ref => (this[`refPreview_${index}`] = ref)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: index ? index === 1 ? 0 : '20%' : '-20%',
                  opacity: index === 1 ? 1 : 0,
                  zIndex: index === 1 ? 1 : 0,
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

          {/* Header */}
          {
            <div
              style={{
                position: 'fixed',
                zIndex: 100,
                top: 0,
                left: 0,
                width: '100%',
                height: 80,
                display: 'flex',
                alignItems: 'center',
                WebkitAppRegion: 'drag',
                background: 'linear-gradient(0deg, rgba(0,0,0,0), rgba(0,0,0,0.54))'
              }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
            >
              <div style={{ width: 700, fontSize: 16, color: '#FFFFFF', marginLeft: 20 }} className="text" >
                { entry.name }
              </div>
              <div style={{ flexGrow: 1 }} />

              {/* toolbar */}
              <div
                style={{
                  width: 120,
                  height: 40,
                  marginRight: 20,
                  display: 'flex',
                  alignItems: 'center',
                  color: '#FFFFFF',
                  backgroundColor: '#000000',
                  WebkitAppRegion: 'no-drag'
                }}
              >
                <div style={{ width: 10 }} />
                <SIButton tooltip={i18n.__('Download')} onClick={this.props.download} iconStyle={{ color: '#FFF' }} >
                  <DownloadFileIcon />
                </SIButton>
                <div style={{ width: 5 }} />
                <SIButton
                  onClick={this.toggleMax}
                  iconStyle={{ color: '#FFF' }}
                  tooltip={!isMaximized ? i18n.__('Full Winodw') : i18n.__('Normal Window')}
                >
                  { !isMaximized ? <WinFullIcon /> : <WinNormalIcon /> }
                </SIButton>
                <div style={{ width: 5 }} />
                <SIButton tooltip={i18n.__('Close')} onClick={this.close} iconStyle={{ color: '#FFF' }} >
                  <CloseIcon />
                </SIButton>
                <div style={{ width: 10 }} />
              </div>
            </div>
          }

          {/* left Button */}
          <IconButton
            style={{
              display: this.zoom > 1 ? 'none' : '',
              opacity: this.currentIndex > this.firstFileIndex ? 1 : 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,.6)',
              position: 'absolute',
              borderRadius: 36,
              zIndex: 100,
              width: 72,
              height: 72,
              left: '2%'
            }}
            hoveredStyle={{ backgroundColor: hoverColor }}
            onClick={(e) => { this.changeIndex('left'); e.preventDefault(); e.stopPropagation() }}
          >
            <svg width={48} height={48} viewBox="0 0 24 24" fill="rgba(255,255,255,.6)">
              <path d="M15.41 16.09l-4.58-4.59 4.58-4.59L14 5.5l-6 6 6 6z" />
            </svg>
          </IconButton>

          {/* right Button */}
          <IconButton
            style={{
              display: this.zoom > 1 ? 'none' : '',
              opacity: this.currentIndex < this.props.items.length - 1 ? 1 : 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,.6)',
              borderRadius: 36,
              position: 'absolute',
              zIndex: 100,
              width: 72,
              height: 72,
              right: '2%'
            }}
            hoveredStyle={{ backgroundColor: hoverColor }}
            onClick={(e) => { this.changeIndex('right'); e.preventDefault(); e.stopPropagation() }}
          >
            <svg width={48} height={48} viewBox="0 0 24 24" fill="rgba(255,255,255,.6)">
              <path d="M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z" />
            </svg>
          </IconButton>
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
