import i18n from 'i18n'
import React from 'react'

import { LIButton, RSButton } from '../common/Buttons'
import { CloseIcon, AccountIcon, FailedIcon } from '../common/Svg'

class ChangeAvatar extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      status: 'upload'
    }

    this.resetImage = () => {
      setTimeout(() => {
        if (this.refImage) {
          const img = this.refImage
          this.ratio = img.naturalWidth / img.naturalHeight
          if (this.ratio >= 1) img.style.width = ''
          else img.style.height = ''
          img.style.objectFit = 'fill'
        }
      }, 500)
    }

    this.handleUpload = (files) => {
      console.log('this.handleUpload', files)
      const name = files[0].name
      let ext = ''
      try {
        ext = name && name.split('.').slice(-1)[0].toUpperCase()
      } catch (e) {
        console.error('parse extension error', e)
        ext = ''
      }
      if (!['PNG', 'JPG'].includes(ext)) {
        this.props.openSnackBar(i18n.__('Not Image Error'))
      } else {
        const src = files[0].path
        this.setState({ src, status: 'crop' }, this.resetImage)
      }
    }

    this.dragPosition = { x: 0, y: 0, left: 0, top: 0 }

    /* handle zoom image */
    this.handleZoom = (event) => {
      if (this.refImage) {
        let zoom = this.refImage.style.zoom
        zoom *= 0.6 + (-event.deltaY + 240) / 600
        if (zoom <= 1) {
          zoom = 1
          this.refTransition.style.transform = ''
          this.dragPosition.left = 0
          this.dragPosition.top = 0
        } else if (zoom > 5) {
          zoom = 5
        } else {
          this.refTransition.style.transform = `translate(${this.dragPosition.left}px,${this.dragPosition.top}px)`
        }
        this.refImage.style.zoom = zoom
        this.autoMoveImage()
      }
    }

    /* handle drag image when zoom */
    this.dragImage = (event) => {
      if (this.state.drag) {
        const style = this.refTransition.style

        this.dragPosition.left += this.dragPosition.x ? event.clientX - this.dragPosition.x : 0
        this.dragPosition.top += this.dragPosition.y ? event.clientY - this.dragPosition.y : 0

        /* memoize last position */
        this.dragPosition.x = event.clientX
        this.dragPosition.y = event.clientY

        /* move photo */
        style.transition = ''
        style.transform = `translate(${this.dragPosition.left}px,${this.dragPosition.top}px)`
      }
    }

    this.autoMoveImage = () => {
      const img = this.refImage
      const size = 300
      const zoom = img.style.zoom
      const dWidth = this.ratio >= 1 ? size * zoom * this.ratio : size * zoom
      const dHeight = this.ratio >= 1 ? size * zoom : size * zoom / this.ratio
      const dxMax = (dWidth - size) / 2
      const dyMax = (dHeight - size) / 2
      if (this.dragPosition.left > dxMax) this.dragPosition.left = dxMax
      if (this.dragPosition.left < -dxMax) this.dragPosition.left = -dxMax
      if (this.dragPosition.top > dyMax) this.dragPosition.top = dyMax
      if (this.dragPosition.top < -dyMax) this.dragPosition.top = -dyMax
      this.refTransition.style.transition = 'all 500ms cubic-bezier(0,0,.2, 1)'
      this.refTransition.style.transform = `translate(${this.dragPosition.left}px,${this.dragPosition.top}px)`
    }

    this.dragOff = () => {
      this.setState({ drag: false })
      this.dragPosition.x = 0
      this.dragPosition.y = 0
      this.autoMoveImage()
    }
  }

  setAvatar () {
    const canvas = this.refCanvas
    const content = canvas.getContext('2d')
    content.clearRect(0, 0, canvas.width, canvas.height)
    const img = this.refImage
    const size = 300
    const zoom = img.style.zoom
    const dWidth = this.ratio >= 1 ? size * zoom * this.ratio : size * zoom
    const dHeight = this.ratio >= 1 ? size * zoom : size * zoom / this.ratio
    const dx = this.dragPosition.left - (dWidth - size) / 2
    const dy = this.dragPosition.top - (dHeight - size) / 2
    content.drawImage(img, dx, dy, dWidth, dHeight)
    const file = Buffer.from(canvas.toDataURL().split(',')[1], 'base64')
    this.props.phi.req('setAvatar', file, (err, res) => {
      if (err || !res) this.setState({ status: 'failed' })
      else {
        this.setState({ status: 'success' })
        if (this.props.account && this.props.account.phi) {
          Object.assign(this.props.account.phi, { avatarUrl: res })
          this.props.wisnucLogin(this.props.account)
          this.setState({ avatarUrl: res })
        }
      }
    })
  }

  renderUpload () {
    console.log(this.props)
    const avatarUrl = this.props.account.phi && this.props.account.phi && this.props.account.phi.avatarUrl
    return (
      <div
        style={{ height: 320 }}
        onDrop={e => this.handleUpload(e.dataTransfer.files)}
      >
        <div style={{ margin: '0 auto', maxWidth: 'fit-content', padding: '48px 0px 16px 0px' }}>
          {
            avatarUrl ? (
              <div style={{ width: 72, height: 72, borderRadius: 36, overflow: 'hidden', border: '1px solid rgba(0,0,0,.26)' }}>
                <img src={avatarUrl} width={72} height={72} alt={i18n.__('Image File Error')} />
              </div>
            )
              : <AccountIcon style={{ width: 72, height: 72, color: 'rgba(96,125,139,.26)' }} />
          }
        </div>
        <div style={{ margin: '0 auto', maxWidth: 'fit-content', fontSize: 32, color: 'rgba(0,0,0,.26)' }}>
          { i18n.__('Upload Avatar Text') }
        </div>
        <div
          style={{
            margin: '0 auto',
            maxWidth: 'fit-content',
            fontSize: 12,
            color: 'rgba(0,0,0,.26)',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <div style={{ width: 10, height: 2, margin: 16, backgroundColor: 'rgba(0,0,0,.38)' }} />
          { i18n.__('Or') }
          <div style={{ width: 10, height: 2, margin: 16, backgroundColor: 'rgba(0,0,0,.38)' }} />
        </div>
        <div style={{ margin: '0 auto', maxWidth: 'fit-content', fontSize: 32, color: 'rgba(0,0,0,.26)' }}>
          <RSButton
            alt
            label={i18n.__('Upload Avatar')}
            onClick={() => this.inputRef && this.inputRef.click()}
          />
        </div>
        <input
          ref={ref => (this.inputRef = ref)}
          type="file"
          name="file"
          accept="image/*"
          style={{ width: 0, height: 0, overflow: 'hidden' }}
          onChange={e => this.handleUpload(e.target.files)}
        />
      </div>
    )
  }

  renderCrop () {
    const style = { backgroundColor: 'rgba(122,122,122,.54)', pointerEvents: 'none', position: 'absolute' }
    return (
      <div style={{ height: 320, width: 560, position: 'relative', backgroundColor: 'rgba(96,125,139,.12)', overflow: 'hidden' }}>
        <div
          style={{
            height: 320,
            width: 560,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: ''
          }}
          key="transition"
          ref={ref => (this.refTransition = ref)}
          onMouseDown={() => this.setState({ drag: true })}
          onMouseUp={this.dragOff}
          onMouseMove={this.dragImage}
          onMouseLeave={this.dragOff}
          onWheel={this.handleZoom}
          onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          <img
            ref={ref => (this.refImage = ref)}
            src={this.state.src}
            style={{
              objectFit: 'cover',
              height: 300,
              width: 300,
              zoom: 1,
              cursor: 'pointer'
            }}
            draggable={false}
            alt={i18n.__('Image File Error')}
          />
        </div>
        <div style={Object.assign({ left: 0, top: 0, width: 130, height: 320 }, style)} />
        <div style={Object.assign({ right: 0, top: 0, width: 130, height: 320 }, style)} />
        <div style={Object.assign({ left: 130, top: 0, width: 300, height: 10 }, style)} />
        <div style={Object.assign({ left: 130, bottom: 0, width: 300, height: 10 }, style)} />
        <canvas
          width="300"
          height="300"
          style={{ position: 'absolute', left: -10000 }}
          ref={ref => (this.refCanvas = ref)}
        />
      </div>
    )
  }

  renderResult (success) {
    return (
      <div style={{ height: 320 }} className="flexCenter">
        <div>
          <div style={{ margin: '0 auto', maxWidth: 'fit-content' }}>
            {
              !success ? <FailedIcon style={{ color: '#f44336', height: 72, width: 72 }} />
                : (
                  <div style={{ height: 120, width: 120, borderRadius: 60, border: '1px solid rgba(0,0,0,.26)', overflow: 'hidden' }}>
                    <img src={this.state.avatarUrl} style={{ height: 120, width: 120 }} alt={i18n.__('Image File Error')} />
                  </div>
                )
            }
          </div>
          <div style={{ height: 24 }} />
          <div style={{ fontWeight: 500, color: 'rgba(0,0,0,.76)', margin: '3px auto 0 auto', maxWidth: 'fit-content' }}>
            { success ? i18n.__('Change Avatar Success') : i18n.__('Change Avatar Failed') }
          </div>
        </div>
      </div>
    )
  }

  render () {
    let view = null
    switch (this.state.status) {
      case 'upload':
        view = this.renderUpload()
        break
      case 'crop':
        view = this.renderCrop()
        break
      case 'success':
        view = this.renderResult(true)
        break
      case 'failed':
        view = this.renderResult(false)
        break
      default:
        break
    }
    return (
      <div
        style={{
          width: 560,
          height: 450,
          borderRadius: 2,
          backgroundColor: '#FFF',
          boxShadow: '0px 5px 6.6px 0.4px rgba(96,125,139,.24), 0px 2px 9.8px 0.2px rgba(96,125,139,.16)'
        }}
      >
        <div style={{ height: 60, position: 'relative', paddingLeft: 24, display: 'flex', alignItems: 'center' }} >
          <div style={{ fontSize: 16, fontWeight: 500 }}>
            { i18n.__('Change Avatar') }
          </div>
          <div style={{ flexGrow: 1 }} />
          <LIButton iconStyle={{ width: 18, height: 18 }} onClick={this.props.onRequestClose}>
            <CloseIcon />
          </LIButton>
        </div>
        { view }
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            padding: '0px 24px'
          }}
        >
          {
            this.state.status !== 'success'
              ? <RSButton
                label={i18n.__('Set Avatar')}
                disabled={this.state.status !== 'crop'}
                onClick={() => this.setAvatar()}
              />
              : <RSButton
                label={i18n.__('Confirm')}
                onClick={this.props.onRequestClose}
              />
          }
          <div style={{ width: 24 }} />
          {
            this.state.status !== 'success' &&
            <RSButton
              alt
              label={i18n.__('Cancel')}
              disabled={this.state.status === 'success' || this.state.status === 'failed'}
              onClick={this.props.onRequestClose}
            />
          }
          <div style={{ flexGrow: 1 }} />
          {
            this.state.status !== 'upload' &&
            <RSButton
              alt
              label={i18n.__('Re-upload')}
              onClick={() => this.setState({ status: 'upload' })}
            />
          }
        </div>
      </div>
    )
  }
}

export default ChangeAvatar
