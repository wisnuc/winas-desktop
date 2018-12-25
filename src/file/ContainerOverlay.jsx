import i18n from 'i18n'
import React from 'react'
import { remote, ipcRenderer } from 'electron'
import { IconButton } from 'material-ui'
import ErrorIcon from 'material-ui/svg-icons/alert/error'
import FileFolder from 'material-ui/svg-icons/file/folder'
import DownloadIcon from 'material-ui/svg-icons/file/file-download'
import InfoIcon from 'material-ui/svg-icons/action/info'
import RenderToLayer from 'material-ui/internal/RenderToLayer'
import keycode from 'keycode'
import EventListener from 'react-event-listener'
import { TweenMax } from 'gsap'
import ReactTransitionGroup from 'react-transition-group/TransitionGroup'
import Preview from './Preview'
import DetailInfo from './DetailInfo'
import renderFileIcon from '../common/renderFileIcon'
import { WinFullIcon, WinNormalIcon } from '../common/Svg'

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
      const transformItem = this.refReturn
      const root = this.refRoot
      const overlay = this.refOverlay
      const time = 0.2
      const ease = global.Power4.easeOut

      if (status === 'In') {
        TweenMax.from(overlay, time, { opacity: 0, ease })
        TweenMax.from(transformItem, time, { rotation: 180, opacity: 0, ease })
        TweenMax.from(root, time, { opacity: 0, ease })
      }

      if (status === 'Out') {
        TweenMax.to(overlay, time, { opacity: 0, ease })
        TweenMax.to(transformItem, time, { rotation: 180, opacity: 0, ease })
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

    this.toggleMax = () => ipcRenderer.send('TOGGLE_MAX')

    this.toggleDetail = () => {
      this.setState({ detailInfo: !this.state.detailInfo })
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
            backgroundColor: 'rgba(0, 0, 0, 1)'
          }}
        />

        {/* preview */}
        <div
          ref={ref => (this.refBackground = ref)}
          style={{
            position: 'relative',
            width: this.state.detailInfo ? 'calc(100% - 280px)' : '100%',
            overflow: 'hidden',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 450ms'
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
                  transition: 'all 450ms'
                }}
              >
                <Preview
                  isCenter={index === 1}
                  item={item}
                  detailInfo={this.state.detailInfo}
                  ipcRenderer={this.props.ipcRenderer}
                  memoize={this.props.memoize}
                  download={this.props.download}
                  path={this.props.path}
                  updateContainerSize={this.updateContainerSize}
                  apis={this.props.apis}
                  parent={this[`refPreview_${index}`]}
                  close={this.close}
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
                width: this.state.detailInfo ? 'calc(100% - 280px)' : '100%',
                height: 64,
                display: 'flex',
                alignItems: 'center',
                WebkitAppRegion: 'drag',
                background: 'linear-gradient(0deg, rgba(0,0,0,0), rgba(0,0,0,0.54))'
              }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
            >
              {/* return Button */}
              <IconButton
                onClick={this.close}
                style={{ margin: 12, WebkitAppRegion: 'no-drag' }}
              >
                <div ref={ref => (this.refReturn = ref)} >
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="white">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                  </svg>
                </div>
              </IconButton>
              {
                entry.type === 'public' || entry.type === 'directory'
                  ? <FileFolder style={{ color: 'rgba(0,0,0,0.54)' }} />
                  : entry.type === 'file'
                    ? renderFileIcon(entry.name, entry.metadata, 24, true) // name, metadata, size, dark
                    : <ErrorIcon style={{ color: 'rgba(0,0,0,0.54)' }} />
              }
              <div style={{ width: 16 }} />
              <div
                style={{
                  width: 540,
                  fontSize: 14,
                  color: '#FFFFFF',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis'
                }}
              >
                { entry.name }
              </div>

              <div style={{ flexGrow: 1 }} />

              {/* toolbar */}
              <div style={{ WebkitAppRegion: 'no-drag', display: 'flex', alignItems: 'center' }}>
                <IconButton tooltip={i18n.__('Detail')} onClick={this.toggleDetail} iconStyle={{ color: '#FFF' }}>
                  <InfoIcon />
                </IconButton>
                <IconButton tooltip={i18n.__('Download')} onClick={this.props.download} >
                  <DownloadIcon color="#FFF" />
                </IconButton>
                <IconButton
                  onClick={this.toggleMax}
                  tooltip={!isMaximized ? i18n.__('Full Winodw') : i18n.__('Normal Window')}
                  iconStyle={{ color: '#FFF' }}
                >
                  { !isMaximized ? <WinFullIcon /> : <WinNormalIcon /> }
                </IconButton>
              </div>
              <div style={{ width: 24 }} />
            </div>
          }

          {/* left Button */}
          <IconButton
            style={{
              display: this.zoom > 1 ? 'none' : '',
              opacity: this.currentIndex > this.firstFileIndex ? 1 : 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(66, 66, 66, 0.541176)',
              position: 'absolute',
              borderRadius: 28,
              zIndex: 100,
              width: 56,
              height: 56,
              left: '2%'
            }}
            hoveredStyle={{ backgroundColor: '#009688' }}
            onClick={(e) => { this.changeIndex('left'); e.preventDefault(); e.stopPropagation() }}
          >
            <svg width={36} height={36} viewBox="0 0 24 24" fill="white">
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
              backgroundColor: 'rgba(66, 66, 66, 0.541176)',
              borderRadius: 28,
              position: 'absolute',
              zIndex: 100,
              width: 56,
              height: 56,
              right: '2%'
            }}
            hoveredStyle={{ backgroundColor: '#009688' }}
            onClick={(e) => { this.changeIndex('right'); e.preventDefault(); e.stopPropagation() }}
          >
            <svg width={36} height={36} viewBox="0 0 24 24" fill="white">
              <path d="M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z" />
            </svg>
          </IconButton>
        </div>
        <div
          style={{
            position: 'absolute',
            backgroundColor: '#FFF',
            width: 280,
            top: 0,
            right: this.state.detailInfo ? 0 : -280,
            height: '100%',
            zIndex: 100,
            transition: 'all 450ms'
          }}
        >
          <DetailInfo entry={entry} toggleDetail={this.toggleDetail} />
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
