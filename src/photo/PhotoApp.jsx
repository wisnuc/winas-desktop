import React from 'react'
import i18n from 'i18n'
import EventListener from 'react-event-listener'
import { IconButton, CircularProgress } from 'material-ui'
import CloseIcon from 'material-ui/svg-icons/navigation/close'
import VisibilityOff from 'material-ui/svg-icons/action/visibility-off'
import DownloadIcon from 'material-ui/svg-icons/file/file-download'
import DialogOverlay from '../common/DialogOverlay'
import FlatButton from '../common/FlatButton'

import DetailContainer from './DetailContainer'
import PhotoList from './PhotoList'
import { BackwardIcon } from '../common/Svg'

class PhotoApp extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      openDetail: false,
      shift: '',
      deleteDialog: false,
      hideDialog: false
    }

    this.seqIndex = ''

    this.lookPhotoDetail = (digest) => {
      this.seqIndex = this.props.media.findIndex(item => item.hash === digest)
      this.setState({ openDetail: true })
    }

    this.handleResize = () => this.forceUpdate()

    this.toggleDialog = op => this.setState({ [op]: !this.state[op] })

    this.keyChange = (event) => {
      this.props.getShiftStatus(event)
    }
  }

  componentDidMount () {
    document.addEventListener('keydown', this.keyChange)
    document.addEventListener('keyup', this.keyChange)
  }

  componentWillUnmount () {
    document.removeEventListener('keydown', this.keyChange)
    document.removeEventListener('keyup', this.keyChange)
  }

  renderNoMedia () {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} >
        <div
          style={{
            width: 360,
            height: 360,
            borderRadius: '180px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            backgroundColor: '#FAFAFA'
          }}
        >
          {/* <UploadIcon style={{ height: 64, width: 64, color: 'rgba(0,0,0,0.27)' }} /> */}
          <div style={{ fontSize: 24, color: 'rgba(0,0,0,0.27)', height: 56 }}> { i18n.__('No Media Text 1') } </div>
          <div style={{ color: 'rgba(0,0,0,0.27)' }}> { i18n.__('No Media Text 2') } </div>
        </div>
      </div>
    )
  }

  render () {
    const { primaryColor } = this.props
    return (
      <div style={{ position: 'fixed', width: '100%', height: '100%', top: 0, left: 0, zIndex: 200 }}>
        <EventListener target="window" onResize={this.handleResize} />
        <div style={{ height: 34, width: '100%', backgroundColor: primaryColor }} />
        <div style={{ height: 72, width: '100%', backgroundColor: primaryColor, display: 'flex', alignItems: 'center' }} >
          <div style={{ width: 20 }} />
          <IconButton onClick={this.props.backToAlbum} iconStyle={{ color: '#FFF' }}>
            <BackwardIcon />
          </IconButton>
          <div style={{ width: 12 }} />
          <div style={{ color: '#FFF', fontSize: 21, fontWeight: 500 }} >
            { this.props.albumName }
          </div>
        </div>

        {/* PhotoList */}
        {
          !this.props.media
            ? (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CircularProgress />
              </div>
            )
            : this.props.media.length
              ? (<PhotoList
                media={this.props.media}
                lookPhotoDetail={this.lookPhotoDetail}
                ipcRenderer={this.props.ipcRenderer}
                addListToSelection={this.props.addListToSelection}
                removeListToSelection={this.props.removeListToSelection}
                memoize={this.props.memoize}
                selectedItems={this.props.selectedItems}
                getHoverPhoto={this.props.getHoverPhoto}
                shiftStatus={this.props.shiftStatus}
                headerHeight={106}
              />
              )
              : this.renderNoMedia()
        }

        {/* PhotoDetail */}
        <DetailContainer
          onRequestClose={() => this.setState({ openDetail: false })}
          open={this.state.openDetail}
          style={{ position: 'fixed', left: 0, top: 0, width: '100%', height: '100%' }}
          items={this.props.media}
          seqIndex={this.seqIndex}
          ipcRenderer={this.props.ipcRenderer}
          setAnimation={this.props.setAnimation}
          memoize={this.props.memoize}
          selectedItems={this.props.selectedItems}
          addListToSelection={this.props.addListToSelection}
          removeListToSelection={this.props.removeListToSelection}
          hideMedia={this.props.hideMedia}
          removeMedia={this.props.removeMedia}
          startDownload={this.props.startDownload}
          apis={this.props.apis}
        />

        {/* Selected Header */}
        {
          !!this.props.selectedItems.length &&
            <div
              style={{
                position: 'fixed',
                top: 34,
                left: 0,
                width: '100%',
                height: 72,
                backgroundColor: this.props.primaryColor,
                display: 'flex',
                alignItems: 'center',
                zIndex: 200
              }}
            >
              <div style={{ width: 20 }} />
              <div ref={ref => (this.refClearSelected = ref)}>
                <IconButton onClick={this.props.clearSelect}>
                  <CloseIcon color="#FFF" />
                </IconButton>
              </div>
              <div style={{ width: 12 }} />
              <div style={{ color: '#FFF', fontSize: 20, fontWeight: 500 }} >
                { i18n.__('%s Photo Selected', this.props.selectedItems.length) }
              </div>
              <div style={{ flexGrow: 1 }} />

              <IconButton onClick={this.props.startDownload} tooltip={i18n.__('Download')}>
                <DownloadIcon color="#FFF" />
              </IconButton>

              {/*
              <IconButton onClick={() => this.toggleDialog('deleteDialog')}>
                <DeleteIcon color="#FFF" />
              </IconButton>
              */}

              <IconButton onClick={() => this.toggleDialog('hideDialog')} tooltip={i18n.__('Hide')}>
                <VisibilityOff color="#FFF" />
              </IconButton>
              <div style={{ width: 24 }} />

            </div>
        }

        {/* dialog */}
        <DialogOverlay open={!!this.state.deleteDialog}>
          <div>
            {
              this.state.deleteDialog &&
                <div style={{ width: 320, padding: '24px 24px 0px 24px' }}>
                  <div style={{ fontSize: 20, fontWeight: 500, color: 'rgba(0,0,0,0.87)' }}>
                    { i18n.__('Delete Photo Dialog Text 1') }
                  </div>
                  <div style={{ height: 20 }} />
                  <div style={{ color: 'rgba(0,0,0,0.54)' }}>
                    { i18n.__('Delete Photo Dialog Text 2') }
                  </div>
                  <div style={{ height: 24 }} />
                  <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginRight: -24 }}>
                    <FlatButton label={i18n.__('Cancel')} primary onClick={() => this.toggleDialog('deleteDialog')} keyboardFocused />
                    <FlatButton
                      label={i18n.__('Remove')}
                      primary
                      onClick={() => {
                        this.toggleDialog('deleteDialog')
                        this.props.removeMedia()
                      }}
                    />
                  </div>
                </div>
            }
          </div>
        </DialogOverlay>

        {/* dialog */}
        <DialogOverlay open={!!this.state.hideDialog}>
          <div>
            {
              this.state.hideDialog &&
                <div style={{ width: 320, padding: '24px 24px 0px 24px' }}>
                  <div style={{ fontSize: 20, fontWeight: 500, color: 'rgba(0,0,0,0.87)' }}>
                    { i18n.__('Hide Photo Dialog Text 1') }
                  </div>
                  <div style={{ height: 20 }} />
                  <div style={{ color: 'rgba(0,0,0,0.54)' }}>
                    { i18n.__('Hide Photo Dialog Text 2') }
                  </div>
                  <div style={{ height: 24 }} />
                  <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginRight: -24 }}>
                    <FlatButton label={i18n.__('Cancel')} primary onClick={() => this.toggleDialog('hideDialog')} keyboardFocused />
                    <FlatButton
                      label={i18n.__('Hide')}
                      primary
                      onClick={() => {
                        this.toggleDialog('hideDialog')
                        this.props.hideMedia()
                      }}
                    />
                  </div>
                </div>
            }
          </div>
        </DialogOverlay>
      </div>
    )
  }
}

export default PhotoApp
