import React from 'react'
import i18n from 'i18n'
import prettysize from 'prettysize'
import { AutoSizer } from 'react-virtualized'

import Dialog from '../common/PureDialog'
import interpretModel from '../common/diskModel'
import ConfirmDialog from '../common/ConfirmDialog'
import { RSButton, LIButton } from '../common/Buttons'
import SimpleScrollBar from '../common/SimpleScrollBar'
import CircularLoading from '../common/CircularLoading'
import { HelpIcon, DiskIcon, DiskAltIcon } from '../common/Svg'

class Disk extends React.PureComponent {
  constructor (props) {
    super(props)
    this.state = {
      showGuide: false
    }
    this.removeData = () => {
      const uuid = this.props.apis.drives.data.find(d => d.type === 'private').uuid
      this.props.apis.pureRequest('removeData', { driveUUID: uuid }, (err, res) => {
        if (!err) {
          this.props.openSnackBar(i18n.__('Operation Success'))
          this.setState({ confirmRemoveData: false })
        } else {
          this.props.openSnackBar(i18n.__('Operation Failed'))
          this.setState({ confirmRemoveData: false })
        }
      })
    }

    this.fireEject = (usb) => {
      this.props.apis.pureRequest('ejectUSB', { id: usb.id }, (err, res) => {
        if (!err) {
          this.props.openSnackBar(i18n.__('Operation Success'))
        } else {
          this.props.openSnackBar(i18n.__('Operation Failed'))
        }
        this.setState({ ejectUSB: false })
        this.props.refresh()
      })
    }
  }

  /* data: [{ title, percent, color }]  */
  renderCircularProgress (title, text, data) {
    const stroke = 30
    const normalizedRadius = 135
    const radius = normalizedRadius + 2 * stroke
    const circumference = normalizedRadius * 2 * Math.PI
    // const strokeDashoffset = circumference - progress / 100 * circumference

    const d = [
      { strokeColor: '#f5f7fa', progress: 100 },
      { strokeColor: '#7597bf', progress: data[4].progress },
      { strokeColor: '#f48c12', progress: data[3].progress },
      { strokeColor: '#f2497d', progress: data[2].progress },
      { strokeColor: '#37a7f4', progress: data[1].progress },
      { strokeColor: '#8a69ed', progress: data[0].progress }
    ]
    return (
      <div style={{ position: 'relative', width: 360, height: 360 }} className="flexCenter">
        <div style={{ height: 50 }}>
          <div style={{ height: 20, color: '#505259', fontSize: 16 }} className="flexCenter">
            { title }
          </div>
          <div style={{ height: 20, color: '#85868c' }} className="flexCenter">
            { text }
          </div>
        </div>
        <div style={{ position: 'absolute', top: -15, left: -15, width: radius * 2, height: radius * 2 }} >
          <svg
            height={radius * 2}
            width={radius * 2}
            style={{ transform: 'rotate(-90deg)' }}
          >
            {
              d.map(({ strokeColor, progress }) => (
                <circle
                  key={strokeColor}
                  stroke={strokeColor}
                  fill="transparent"
                  strokeWidth={stroke}
                  strokeDasharray={`${circumference} ${circumference}`}
                  style={{ strokeDashoffset: circumference - progress / 100 * circumference }}
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                />
              ))
            }
          </svg>
        </div>
      </div>
    )
  }

  renderUSBDrives (u, i) {
    const phyUsage = u.usage
    const name = u.mountpoint.split('/').slice(-1)
    const USBUsage = i18n.__('Storage Usage %s %s', prettysize(phyUsage.used * 1024), prettysize(phyUsage.total * 1024))
    return (
      <div style={{ width: 1000, height: 110, margin: '0 auto', opacity: phyUsage ? 1 : 0.5 }} key={i.toString()}>
        <div style={{ width: '100%', height: 40, color: '#888a8c', display: 'flex', alignItems: 'center', marginTop: 10 }}>
          <div style={{ height: 40 }}>
            <div style={{ height: 20, display: 'flex', alignItems: 'center', color: '#505259' }} >
              { name || i18n.__('USB Storage Title %s', i + 1) }
            </div>
            <div style={{ height: 20, display: 'flex', alignItems: 'center', color: '#85868c' }} >
              { USBUsage }
            </div>
          </div>
          <div style={{ flexGrow: 1 }} />
          <div style={{ width: 150, height: 40 }}>
            <RSButton
              alt
              style={{ width: 100 }}
              label={i18n.__('Eject USB')}
              onClick={() => this.setState({ ejectUSB: u })}
            />
          </div>
        </div>
        {/* USB usage */}
        <div
          style={{
            width: '100%',
            height: 20,
            marginTop: 10,
            backgroundColor: '#f5f7fa'
          }}
        >
          <div
            style={{
              height: '100%',
              backgroundColor: '#7597bf',
              width: `${(phyUsage.used / phyUsage.total * 100)}%`
            }}
          />
        </div>
      </div>
    )
  }

  renderLoading () {
    return (
      <div style={{ width: '100%', height: 'calc(100% - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} >
        <CircularLoading />
      </div>
    )
  }

  render () {
    const { boot, phyDrives, stats } = this.props
    if (!boot || !phyDrives || !stats) return this.renderLoading()
    const { storage, boundVolume } = boot
    const b1 = storage.blocks.find(b => (b.isDisk && !b.unformattable && b.slotNumber === 1))
    const b2 = storage.blocks.find(b => (b.isDisk && !b.unformattable && b.slotNumber === 2))
    const mode = boundVolume.usage.data.mode === 'single' ? 'Single' : 'RAID 1'

    const disks = [
      {
        pos: i18n.__('Disk 1'),
        status: b1 ? i18n.__('Disk Found') : i18n.__('Disk Not Found'),
        model: b1 ? interpretModel(b1.model) : i18n.__('Unknown Model'),
        size: b1 ? prettysize(b1.size * 512) : i18n.__('Unknown Size')
      },
      {
        pos: i18n.__('Disk 2'),
        status: b2 ? i18n.__('Disk Found') : i18n.__('Disk Not Found'),
        model: b2 ? interpretModel(b2.model) : i18n.__('Unknown Model'),
        size: b2 ? prettysize(b2.size * 512) : i18n.__('Unknown Size')
      }
    ]

    const { audio, document, image, video } = stats
    const other = stats.other || { totalSize: 0 }
    const usage = phyDrives.find(d => d.isFruitFS).usage
    if (!audio || !document || !image || !video || !usage) return (<div />)
    console.log('size', stats, usage)
    const { available, used } = usage
    const usedPercent = used / (available + used) * 100
    const countTotal = (video.totalSize + image.totalSize + audio.totalSize + document.totalSize + 0) / usedPercent

    const videoSize = video.totalSize / countTotal
    const imageSize = image.totalSize / countTotal + videoSize
    const audioSize = audio.totalSize / countTotal + imageSize
    const documentSize = document.totalSize / countTotal + audioSize
    const otherSize = other.totalSize / countTotal + documentSize

    const data = [
      { color: '#8a69ed', progress: videoSize, title: i18n.__('Video') },
      { color: '#37a7f4', progress: imageSize, title: i18n.__('Picture') },
      { color: '#f2497d', progress: audioSize, title: i18n.__('Music') },
      { color: '#f48c12', progress: documentSize, title: i18n.__('Document') },
      { color: '#7597bf', progress: otherSize, title: i18n.__('Others') }
    ]

    const progressTitle = i18n.__('Storage Space')
    const storageUsage = i18n.__('Storage Usage %s %s', prettysize(used * 1024), prettysize((used + available) * 1024))

    const usbDrives = phyDrives.filter(d => d.isUSB && d.usage)

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }} >
        <AutoSizer>
          {({ height, width }) => (
            <SimpleScrollBar height={height} width={width}>
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flexGrow: 1 }} />
                <div>
                  <div style={{ width: 1000, height: 360, margin: '0 auto', display: 'flex', alignItems: 'center' }}>
                    { this.renderCircularProgress(progressTitle, storageUsage, data) }
                    <div style={{ width: 10 }} />
                    <div style={{ width: 100, height: 300, padding: '30px 0' }}>
                      {
                        data.map(({ color, title }) => (
                          <div style={{ width: 100, height: 60, display: 'flex', alignItems: 'center' }} key={title}>
                            <div style={{ width: 8, height: 8, backgroundColor: color }} />
                            <div style={{ fontSize: 12, color: '#505259', marginLeft: 8 }}>
                              { title }
                            </div>
                          </div>
                        ))
                      }
                    </div>
                    <div style={{ width: 30 }} />
                    <div style={{ width: 500, height: 300, padding: '30px 0', position: 'relative' }}>
                      <div style={{ width: '100%', height: 40, color: '#888a8c', display: 'flex', alignItems: 'center' }}>
                        { i18n.__('Current Mode %s', mode) }
                        <LIButton onClick={() => this.setState({ showGuide: true })} iconStyle={{ color: '#37a7f4', width: 24, height: 24 }}>
                          <HelpIcon />
                        </LIButton>
                        <div style={{ flexGrow: 1 }} />
                        <div style={{ width: 150, height: 40 }}>
                          <RSButton
                            alt
                            style={{ width: 100 }}
                            label={i18n.__('Remove Data')}
                            onClick={() => this.setState({ confirmRemoveData: true })}
                          />
                        </div>
                      </div>
                      {
                        disks.map(({ pos, status, model, size }, index) => (
                          <div
                            style={{
                              width: 500,
                              height: 110,
                              marginTop: index ? 20 : 10,
                              backgroundColor: '#f5f7fa',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            key={index.toString()}
                          >
                            {
                              status === i18n.__('Disk Found')
                                ? <DiskIcon style={{ height: 54, width: 40, marginLeft: 15 }} />
                                : <DiskAltIcon style={{ height: 54, width: 40, marginLeft: 15 }} />
                            }
                            <div style={{ height: 40, marginLeft: 12 }} >
                              <div style={{ height: 20, display: 'flex', alignItems: 'center', color: '#505259' }} >
                                { pos }
                              </div>
                              <div style={{ height: 20, display: 'flex', alignItems: 'center', color: '#85868c' }} >
                                {status}
                                <div style={{ height: 12, width: 1, backgroundColor: '#85868c', margin: '0 10px' }} />
                                {model}
                                <div style={{ height: 12, width: 1, backgroundColor: '#85868c', margin: '0 10px' }} />
                                {size}
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                  <div style={{ height: 20 }} />
                  {/* usb */}
                  { usbDrives.map((u, i) => this.renderUSBDrives(u, i)) }
                </div>
                <div style={{ flexGrow: 1 }} />
              </div>
            </SimpleScrollBar>
          )}
        </AutoSizer>

        <ConfirmDialog
          open={this.state.confirmRemoveData}
          onCancel={() => this.setState({ confirmRemoveData: false })}
          onConfirm={() => this.removeData()}
          title={i18n.__('Confirm Clear Data Title')}
          text={i18n.__('Confirm Clear Data Text')}
        />

        <ConfirmDialog
          open={!!this.state.ejectUSB}
          onCancel={() => this.setState({ ejectUSB: false })}
          onConfirm={() => this.fireEject(this.state.ejectUSB)}
          title={i18n.__('Confirm Eject USB Title')}
          text={i18n.__('Confirm Eject USB Text')}
        />
      </div>
    )
  }
}

export default Disk
