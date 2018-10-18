import i18n from 'i18n'
import React from 'react'
import Promise from 'bluebird'
import { Divider } from 'material-ui'
import prettysize from 'prettysize'

import DiskModeGuide from './DiskModeGuide'
import DiskFormating from './DiskFormating'

import Dialog from '../common/PureDialog'
import ConfirmDialog from '../common/ConfirmDialog'
import { SmallHelpIcon, BackIcon } from '../common/Svg'
import interpretModel from '../common/diskModel'
import { RRButton, ModeSelect, LIButton, SIButton } from '../common/Buttons'

class ManageDisk extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      mode: '',
      status: this.volumeStatus() === 'init' ? 'init' : 'select', // init, select, recover, repair
      showGuide: false,
      format: '' // 'busy', 'success', 'error'
    }

    this.format = (target) => {
      this.setState({ format: 'busy' })
      const args = { target, mode: this.state.mode }
      this.props.selectedDevice.request('boundVolume', args, (err, res) => {
        if (err) this.setState({ format: 'error', error: err })
        else this.setState({ format: 'success' })
      })
    }

    this.repair = ({ mode, devices }) => {
      this.setState({ format: 'busy' })
      this.props.selectedDevice.request('repairVolume', { devices, mode }, (err, res) => {
        if (err) this.setState({ format: 'error', error: err })
        else this.setState({ format: 'success' })
      })
    }

    this.recover = (volume) => {
      this.setState({ format: 'busy' })
      this.props.selectedDevice.request('importVolume', { volumeUUID: volume.uuid }, (err, res) => {
        if (err) this.setState({ format: 'error', error: err })
        else this.setState({ format: 'success' })
      })
    }

    /* import and add disk to volume */
    this.importAndExtendAsync = async ({ volumeUUID, mode, devices }) => {
      if (volumeUUID) await this.props.selectedDevice.requestAsync('importVolume', { volumeUUID })
      await Promise.delay(5000)
      await this.props.selectedDevice.requestAsync('extendVolume', { mode, devices })
    }

    this.add = (args) => {
      this.setState({ format: 'busy' })
      this.importAndExtendAsync(args)
        .then(() => this.setState({ format: 'success' }))
        .catch((err) => {
          console.error('importAndExtend disk error', err)
          this.setState({ format: 'error', error: err })
        })
    }

    this.onConfirmRecover = (args) => {
      this.setState({ confirm: false })
      setTimeout(() => this.add(args), 300)
    }

    this.enterCreate = () => {
      this.setState({ status: 'init' })
    }

    this.enterRecover = () => {
      this.setState({ status: 'recover' })
    }

    this.enterRepair = () => {
      this.setState({ status: 'repair' })
    }

    this.confirmRecover = (blk, target) => {
      const devName = blk.name
      const volume = this.availableVolumes().find(v => v.devices[0].name === devName)
      const args = {
        mode: this.state.mode,
        volumeUUID: volume.uuid,
        slotNumber: blk.slotNumber, // for confirm text
        devices: target.filter(t => t.name !== devName)
      }

      this.setState({ confirm: args })
    }
  }

  availableVolumes () {
    const { storage, boundUser } = this.props.selectedDevice.boot.data
    return storage.volumes.filter(v => !v.isMissing && v.isMounted && Array.isArray(v.users) &&
      v.users.find(u => u.isFirstUser && u.phicommUserId === boundUser.phicommUserId))
  }

  brokenVolume () {
    const { boundVolume, storage } = this.props.selectedDevice.boot.data
    if (!boundVolume || !boundVolume.uuid) return false
    const volume = storage && storage.volumes.find(v => v.isMissing && v.isMounted && (v.uuid === boundVolume.uuid))
    /* TODO can't repair single mode */
    if (volume && volume.usage && volume.usage.data && volume.usage.data.mode !== 'single') return volume
    return false
  }

  volumeStatus () {
    const { storage, boundUser } = this.props.selectedDevice.boot.data
    if (!storage || !Array.isArray(storage.volumes) || !boundUser) return 'init'

    /* notMissing && isMounted && adminUser is boundUser => recover(import) */
    if (this.availableVolumes().length) return 'recover'

    /* find broke volume -> repair */
    if (this.brokenVolume()) return 'repair'

    return 'init'
  }

  renderInitFormat () {
    const { storage } = this.props.selectedDevice.boot.data

    const b1 = storage.blocks.find(b => (b.isDisk && !b.unformattable && b.slotNumber === 1))
    const b2 = storage.blocks.find(b => (b.isDisk && !b.unformattable && b.slotNumber === 2))

    const target = []
    if (b1 && b1.name) target.push(b1.name)
    if (b2 && b2.name) target.push(b2.name)

    return (
      <div>
        {
          [b1, b2].map((disk, index) => (
            <div
              style={{
                height: 30,
                width: 'calc(100% - 40px)',
                marginLeft: 20,
                display: 'flex',
                color: '#888a8c',
                alignItems: 'center'
              }}
              key={index.toString()}
            >
              <div style={{ color: '#525a60' }}> { !index ? i18n.__('Disk 1') : i18n.__('Disk 2') } </div>
              <div style={{ flexGrow: 1 }} />
              { disk && <div style={{ marginRight: 10 }}> { interpretModel(disk.model) } </div> }
              { disk && <div> { prettysize(disk.size * 512) } </div> }
              { !disk && <div> { i18n.__('Disk Not Found') } </div> }
            </div>
          ))
        }
        <div
          style={{
            height: 30,
            width: 'calc(100% - 40px)',
            marginLeft: 20,
            display: 'flex',
            color: '#888a8c',
            alignItems: 'center'
          }}
        >
          <div style={{ color: '#525a60' }}> { i18n.__('Select Disk Mode') } </div>
          <div style={{ flexGrow: 1 }} />
          <SIButton onClick={() => this.setState({ showGuide: true })} iconStyle={{ color: '#31a0f5' }}>
            <SmallHelpIcon />
          </SIButton>
        </div>
        <div style={{ height: 10 }} />
        <div style={{ height: 50, width: 'calc(100% - 40px)', marginLeft: 20, display: 'flex', alignItems: 'center' }} >
          <ModeSelect
            selected={this.state.mode === 'single'}
            disabled={!target.length}
            label={i18n.__('Single Mode')}
            onClick={() => target.length && this.setState({ mode: this.state.mode === 'single' ? '' : 'single' })}
          />
          <div style={{ width: 10 }} />
          <ModeSelect
            selected={this.state.mode === 'raid1'}
            disabled={target.length !== 2}
            label={i18n.__('Raid1 Mode')}
            onClick={() => target.length === 2 && this.setState({ mode: this.state.mode === 'raid1' ? '' : 'raid1' })}
          />
        </div>
        <div style={{ height: 30 }} />
        <div style={{ width: 240, height: 40, margin: '0 auto' }}>
          <RRButton
            disabled={!this.state.mode || !target.length}
            label={i18n.__('Format Disk in First Boot')}
            onClick={() => this.format(target)}
          />
        </div>
        <div style={{ height: 30 }} />
      </div>
    )
  }

  renderArrowTips (text, alt) {
    const style = alt ? { fontSize: 14, color: '#fa5353' } : { opacity: 0.7, fontSize: 12, color: '#525a60' }
    return (
      <div style={{ height: 30, width: 'calc(100% - 40px)', marginLeft: 20 }} className="flexCenter">
        <div style={{ height: 19, width: 160 }} className="arrow_box">
          <div style={style}>
            { text }
          </div>
        </div>
      </div>
    )
  }

  renderRecover () {
    /* assert Array.isArray(this.availableVolumes()) && this.availableVolumes().length > 0 */
    const blks = this.props.selectedDevice.boot.data.storage.blocks
    const b1 = blks.find(b => (b.isDisk && !b.unformattable && b.slotNumber === 1))
    const b2 = blks.find(b => (b.isDisk && !b.unformattable && b.slotNumber === 2))

    const target = []
    if (b1 && b1.name) target.push({ name: b1.name })
    if (b2 && b2.name) target.push({ name: b2.name })

    const { boundVolume } = this.props.selectedDevice.boot.data
    const oldVolume = !!boundVolume && this.availableVolumes().find(v => v.uuid === boundVolume.uuid)

    /* is Extend disk: 2 disk && oldVolume is exist */
    const isExtend = target.length === 2 && oldVolume && oldVolume.total === 1
    /* is pure import disk: only one availableVolumes && no more disk */
    const isImport = this.availableVolumes().length === 1 && this.availableVolumes()[0].total === target.length
    /* need import and then extend volume */
    const isImportAndExtend = target.length === 2 && !oldVolume

    const hasModeSelect = target.length === 2 && this.availableVolumes()[0].total === 1

    let fire = () => {}
    if (isExtend) fire = () => this.add({ devices: target.filter(t => t.name !== oldVolume.devices[0].name), mode: this.state.mode })
    else if (isImport) fire = () => this.recover(this.availableVolumes()[0])
    else if (isImportAndExtend) fire = blk => this.confirmRecover(blk, target)

    return (
      <div>
        {
          [b1, b2].map((disk, index) => (
            <div
              style={{
                height: 30,
                width: 'calc(100% - 40px)',
                marginLeft: 20,
                display: 'flex',
                color: '#888a8c',
                alignItems: 'center'
              }}
              key={index.toString()}
            >
              <div style={{ color: '#525a60' }}> { !index ? i18n.__('Disk 1') : i18n.__('Disk 2') } </div>
              <div style={{ flexGrow: 1 }} />
              { disk && <div style={{ marginRight: 10 }}> { interpretModel(disk.model) } </div> }
              { disk && <div> { prettysize(disk.size * 512) } </div> }
              { !disk && <div> { i18n.__('Disk Not Found') } </div> }
            </div>
          ))
        }
        <div
          style={{
            height: 30,
            width: 'calc(100% - 40px)',
            marginLeft: 20,
            display: 'flex',
            color: '#888a8c',
            alignItems: 'center'
          }}
        >
          <div style={{ color: '#525a60' }}> { hasModeSelect ? i18n.__('Select Disk Mode') : i18n.__('Current Mode') } </div>
          <div style={{ flexGrow: 1 }} />
          { !hasModeSelect && this.availableVolumes()[0].usage.data.mode }
          <SIButton onClick={() => this.setState({ showGuide: true })} iconStyle={{ color: '#31a0f5' }}>
            <SmallHelpIcon />
          </SIButton>
        </div>
        <div style={{ height: 10 }} />
        {
          hasModeSelect &&
            <div style={{ height: 50, width: 'calc(100% - 40px)', marginLeft: 20, display: 'flex', alignItems: 'center' }} >
              <ModeSelect
                selected={this.state.mode === 'single'}
                disabled={!target.length}
                label={i18n.__('Single Mode')}
                onClick={() => target.length && this.setState({ mode: this.state.mode === 'single' ? '' : 'single' })}
              />
              <div style={{ width: 10 }} />
              <ModeSelect
                selected={this.state.mode === 'raid1'}
                disabled={target.length !== 2}
                label={i18n.__('Raid1 Mode')}
                onClick={() => target.length === 2 && this.setState({ mode: this.state.mode === 'raid1' ? '' : 'raid1' })}
              />
            </div>
        }
        <div style={{ height: 30 }} />
        {
          isImportAndExtend && this.availableVolumes().length === 2
            ? (
              <div style={{ width: 270, height: 40, margin: '0 auto', display: 'flex', alignItems: 'center' }}>
                <RRButton
                  disabled={!isImport && (!this.state.mode || !target.length)}
                  label={i18n.__('Import Disk 1')}
                  onClick={() => fire(b1)}
                  tooltip={i18n.__('Disk 2 Will Be Formatted')}
                />
                <div style={{ width: 18 }} />
                <RRButton
                  disabled={!isImport && (!this.state.mode || !target.length)}
                  label={i18n.__('Import Disk 2')}
                  onClick={() => fire(b2)}
                  tooltip={i18n.__('Disk 1 Will Be Formatted')}
                />
              </div>
            )
            : (
              <div style={{ width: 240, height: 40, margin: '0 auto' }}>
                <RRButton
                  disabled={!isImport && (!this.state.mode || !target.length)}
                  label={i18n.__('Import Disk')}
                  onClick={() => fire(0)}
                  tooltip={!isImport && i18n.__('Recovery Disk May Need Long Time')}
                />
              </div>
            )
        }
        <div style={{ height: 30 }} />
      </div>
    )
  }

  renderRepair () {
    const blks = this.props.selectedDevice.boot.data.storage.blocks
    const b1 = blks.find(b => (b.isDisk && !b.unformattable && b.slotNumber === 1))
    const b2 = blks.find(b => (b.isDisk && !b.unformattable && b.slotNumber === 2))

    const target = []
    if (b1 && b1.name) target.push({ name: b1.name })
    if (b2 && b2.name) target.push({ name: b2.name })

    const volume = this.brokenVolume()
    const preMode = volume.usage && volume.usage.data && volume.usage.data.mode && volume.usage.data.mode.toLowerCase()

    const mode = target.length === 1 ? 'single' : preMode

    const isDegrade = target.length === 1 && preMode === 'raid1'

    return (
      <div>
        {
          [b1, b2].map((disk, index) => (
            <div
              style={{
                height: 30,
                width: 'calc(100% - 40px)',
                marginLeft: 20,
                display: 'flex',
                color: '#888a8c',
                alignItems: 'center'
              }}
              key={index.toString()}
            >
              <div style={{ color: '#525a60' }}> { !index ? i18n.__('Disk 1') : i18n.__('Disk 2') } </div>
              <div style={{ flexGrow: 1 }} />
              { disk && <div style={{ marginRight: 10 }}> { interpretModel(disk.model) } </div> }
              { disk && <div> { prettysize(disk.size * 512) } </div> }
              { !disk && <div> { i18n.__('Disk Not Found') } </div> }
            </div>
          ))
        }

        <div
          style={{
            height: 30,
            width: 'calc(100% - 40px)',
            marginLeft: 20,
            display: 'flex',
            color: '#888a8c',
            alignItems: 'center'
          }}
        >
          <div style={{ color: '#525a60' }}> { i18n.__('Current Mode') } </div>
          <div style={{ flexGrow: 1 }} />
          { volume.usage.data.mode }
          <SIButton onClick={() => this.setState({ showGuide: true })} iconStyle={{ color: '#31a0f5' }}>
            <SmallHelpIcon />
          </SIButton>
        </div>

        <div style={{ height: 30 }} />
        <div style={{ width: 240, height: 40, margin: '0 auto' }}>
          <RRButton
            label={i18n.__('Repair Volume')}
            onClick={() => this.repair({ mode, devices: target })}
            tooltip={isDegrade ? i18n.__('Degrade From Raid1 Text') : i18n.__('Repair Disk May Need Long Time')}
          />
        </div>
        <div style={{ height: 30 }} />
      </div>
    )
  }

  renderSelect (status) {
    return (
      <div>
        <div style={{ width: '100%', height: 40, marginTop: -30, color: '#fa5353' }} className="flexCenter">
          { i18n.__('Disk Change Text') }
        </div>
        <div style={{ width: 240, height: 40, margin: '0 auto' }}>
          <RRButton
            label={i18n.__('Create Volume')}
            onClick={this.enterCreate}
            tooltip={i18n.__('Format Current Disk')}
          />
        </div>
        <div style={{ height: 20 }} />
        <div style={{ width: 240, height: 40, margin: '0 auto' }}>
          <RRButton
            alt
            label={status === 'repair' ? i18n.__('Repair Volume') : i18n.__('Recover Volume')}
            onClick={() => (status === 'repair' ? this.enterRepair() : this.enterRecover())}
            tooltip={status === 'repair' ? i18n.__('Repair Volume Text') : i18n.__('Recover Volume Text')}
          />
        </div>
        <div style={{ height: 30 }} />
      </div>
    )
  }

  render () {
    const { backToList, onFormatSuccess } = this.props
    let [title, imgSrc, content] = ['', '', null]
    switch (this.state.status) {
      case 'init':
        title = i18n.__('Discover Disk')
        imgSrc = 'pic-finddisk.png'
        content = this.renderInitFormat()
        break

      case 'select':
        title = this.volumeStatus() === 'repair' ? i18n.__('Disk Manage') : i18n.__('Create or Import Disk')
        imgSrc = 'pic-login.png'
        content = this.renderSelect(this.volumeStatus())
        break

      case 'recover':
        title = i18n.__('Recover Volume')
        imgSrc = 'pic-diskimport.png'
        content = this.renderRecover()
        break

      case 'repair':
        title = i18n.__('Repair Disk')
        imgSrc = 'pic-diskimport.png'
        content = this.renderRepair()
        break

      default:
        break
    }
    return (
      <div className="paper" style={{ width: 320, zIndex: 100 }} >
        <div style={{ height: 59, display: 'flex', alignItems: 'center', paddingLeft: 5 }} className="title">
          <LIButton onClick={backToList} >
            <BackIcon />
          </LIButton>
          { title }
        </div>
        <Divider style={{ marginLeft: 20, width: 280 }} className="divider" />
        {
          !!imgSrc &&
            <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 30 }}>
              <img
                style={{ width: 280, height: 150 }}
                src={`./assets/images/${imgSrc}`}
                alt=""
              />
            </div>
        }

        { content }

        <Dialog open={!!this.state.showGuide} onRequestClose={() => this.setState({ showGuide: false })}>
          {
            !!this.state.showGuide &&
            <DiskModeGuide
              onRequestClose={() => this.setState({ showGuide: false })}
              powerOff={() => {}}
            />
          }
        </Dialog>

        <Dialog open={!!this.state.format} onRequestClose={() => this.setState({ format: '' })} modal transparent >
          {
            !!this.state.format &&
            <DiskFormating
              type={this.state.status}
              error={this.state.error}
              status={this.state.format}
              onSuccess={onFormatSuccess}
              onRequestClose={() => this.setState({ format: false })}
            />
          }
        </Dialog>

        <ConfirmDialog
          open={!!this.state.confirm}
          onCancel={() => this.setState({ confirm: false })}
          onConfirm={() => this.onConfirmRecover(this.state.confirm)}
          title={i18n.__('Confirm Format Disk Title')}
          text={this.state.confirm && this.state.confirm.slotNumber === 1 ? i18n.__('Confirm Format Disk 2 Text')
            : i18n.__('Confirm Format Disk 1 Text')}
        />

      </div>
    )
  }
}

export default ManageDisk
