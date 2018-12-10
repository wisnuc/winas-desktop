import i18n from 'i18n'
import React from 'react'
import { Divider, MenuItem, Popover } from 'material-ui'
import { RRButton, Toggle } from '../common/Buttons'
import CircularLoading from '../common/CircularLoading'
import SimpleScrollBar from '../common/SimpleScrollBar'

class SleepMode extends React.Component {
  constructor (props) {
    super(props)

    /* start hour, start minute, end hour, end minute */
    this.state = {
      sh: '23',
      sm: '00',
      eh: '07',
      em: '00',
      sleep: null
    }

    this.singleton = false

    this.save = () => {
      this.setState({ loading: true })
      const { sh, sm, eh, em, sleep } = this.state
      let args = { status: !!sleep }
      if (this.state.switch) args = Object.assign({ start: sh.concat(':').concat(sm), end: eh.concat(':').concat(em) }, args)
      else args = Object.assign({ start: '00:00', end: '23:59' }, args)
      this.props.apis.pureRequest('modifySleep', args, (err, res) => {
        if (!err) {
          this.props.openSnackBar(i18n.__('Operation Success'))
          this.props.apis.request('sleep')
        } else {
          this.props.openSnackBar(i18n.__('Operation Failed'))
        }
        this.setState({ loading: false })
      })
    }

    this.updateValue = (type, value) => {
      this.setState({ [type]: value })
    }

    this.openPop = (e, type) => {
      e.preventDefault()
      clearTimeout(this.timer)
      this.setState({ open: type, show: false, anchorEl: e.currentTarget })
      /* hide the status of position move */
      this.timer = setTimeout(() => this.setState({ show: true }), 100)
    }
  }

  componentWillReceiveProps (nextProps) {
    if (nextProps.sleep && !this.singleton) {
      this.singleton = true
      const swc = !(nextProps.sleep.start === '00:00' && nextProps.sleep.end === '23:59') && !!nextProps.sleep.start
      this.setState({
        sleep: !!nextProps.sleep.start,
        switch: swc,
        sh: swc ? nextProps.sleep.start.slice(0, 2) : '23',
        sm: swc ? nextProps.sleep.start.slice(3, 5) : '00',
        eh: swc ? nextProps.sleep.end.slice(0, 2) : '07',
        em: swc ? nextProps.sleep.end.slice(3, 5) : '00'
      })
    }
  }

  isNumberAndBetween (v, min, max) {
    return Number(v) >= min && Number(v) <= max
  }

  shouldFire () {
    if (!this.state.sleep || !this.state.switch) return true
    const { sh, sm, eh, em } = this.state
    if ([sh, sm, eh, em].some(v => !v || typeof v !== 'string' || v.length !== 2)) return false
    if (sh === eh && sm === em) return false
    if (sh === '00' && sm === '00' && eh === '23' && em === '59') return false
    if ([sh, eh].every(v => this.isNumberAndBetween(v, 0, 23)) && [sm, em].every(v => this.isNumberAndBetween(v, 0, 59))) return true
    return false
  }

  renderRow ({ type, enabled, func }) {
    const grey = !this.state.sleep && (type !== i18n.__('Sleep Mode'))
    return (
      <div
        style={{ height: 40, width: '100%', display: 'flex', alignItems: 'center', filter: grey ? 'grayscale(100%)' : '' }}
        key={type}
      >
        <div style={{ width: 130, textAlign: 'right', color: grey ? '#c4c5cc' : '#525a60' }}>
          { type }
        </div>
        <div style={{ flexGrow: 1 }} />
        <div style={{ opacity: grey ? 0.5 : 1 }}>
          <Toggle
            toggled={enabled}
            onToggle={func}
          />
        </div>
      </div>
    )
  }

  renderTimeDur (isAdmin) {
    const disabled = !this.state.sleep || !this.state.switch || !isAdmin
    const iStyle = {
      position: 'relative',
      zIndex: 11,
      height: 30,
      width: 50,
      fontSize: 14,
      color: '#525a60',
      backgroundColor: '#f5f7fa',
      cursor: 'pointer',
      textAlign: 'center'
    }
    return (
      <div
        style={{ height: 40, width: '100%', display: 'flex', alignItems: 'center', opacity: disabled ? 0.5 : 1 }}
      >
        <div style={{ width: 130, textAlign: 'right', color: disabled ? '#c4c5cc' : '#525a60' }}>
          { i18n.__('Sleep Duration') }
        </div>
        <div style={{ width: 30 }} />
        <input
          readOnly
          maxLength={2}
          style={iStyle}
          value={this.state.sh}
          onClick={e => !disabled && this.openPop(e, 'sh')}
        />
        <div style={{ color: '#525a60', margin: '0px 5px' }}> : </div>
        <input
          readOnly
          maxLength={2}
          style={iStyle}
          value={this.state.sm}
          onClick={e => !disabled && this.openPop(e, 'sm')}
        />
        <div style={{ flexGrow: 1 }} />
        <div style={{ backgroundColor: '#85868c', height: 1, width: 16 }} />
        <div style={{ flexGrow: 1 }} />
        <input
          readOnly
          maxLength={2}
          style={iStyle}
          value={this.state.eh}
          onClick={e => !disabled && this.openPop(e, 'eh')}
        />
        <div style={{ color: '#525a60', margin: '0px 5px' }}> : </div>
        <input
          readOnly
          maxLength={2}
          style={iStyle}
          value={this.state.em}
          onClick={e => !disabled && this.openPop(e, 'em')}
        />
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
    const { sleep } = this.props
    if (!sleep) return this.renderLoading()

    const isAdmin = this.props.apis.account && this.props.apis.account.data && this.props.apis.account.data.isFirstUser

    const settings = [
      {
        type: i18n.__('Sleep Mode'),
        enabled: this.state.sleep,
        func: () => isAdmin && this.setState({ sleep: !this.state.sleep })
      },
      {
        type: i18n.__('Time Switch'),
        enabled: this.state.switch,
        func: () => isAdmin && this.state.sleep && this.setState({ switch: !this.state.switch })
      }
    ]

    return (
      <div style={{ width: '100%', height: '100%' }} className="flexCenter" >
        <div style={{ width: 480, paddingRight: 160, paddingBottom: 60 }}>
          <div style={{ height: 180, width: 320, paddingLeft: 160 }} className="flexCenter">
            <img
              style={{ width: 320, height: 180 }}
              src="./assets/images/pic_sleepmode.png"
              alt=""
            />
          </div>

          { this.renderRow(settings[0]) }

          <div style={{ width: 320, color: '#888a8c', paddingLeft: 160, height: 60, display: 'flex', alignItems: 'center' }}>
            { i18n.__('Sleep Mode Text') }
          </div>

          <Divider color="#f2f2f2" style={{ marginLeft: 160 }} />

          { this.renderRow(settings[1]) }

          <div style={{ height: 30 }} />

          { this.renderTimeDur(isAdmin) }

          <Popover
            open={!!this.state.open}
            anchorEl={this.state.anchorEl}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            targetOrigin={{ horizontal: 'right', vertical: 'top' }}
            onRequestClose={() => this.setState({ open: false })}
            style={{
              height: 120,
              overflow: 'hidden',
              boxShadow: '0 0 20px 0 rgba(23, 99, 207, 0.1)',
              opacity: this.state.show ? 1 : 0
            }}

          >
            <SimpleScrollBar height={120} width={50}>
              {
                Array.from({ length: (this.state.open === 'sh' || this.state.open === 'eh') ? 24 : 60 })
                  .map((v, i) => {
                    const value = i < 10 ? '0'.concat(i) : String(i)
                    return (
                      <MenuItem
                        key={value}
                        value={value}
                        primaryText={value}
                        onClick={() => this.setState({ [this.state.open]: value, open: false })}
                        style={{ fontSize: 14, minHeight: 30, height: 30, lineHeight: '30px', color: '#505259' }}
                      />
                    )
                  })
              }
            </SimpleScrollBar>
          </Popover>

          <div style={{ height: 40 }} />

          <div style={{ width: 240, height: 40, margin: '0 auto', paddingLeft: 160 }}>
            <RRButton
              label={this.state.loading ? i18n.__('Saving') : i18n.__('Save')}
              onClick={this.save}
              disabled={!this.shouldFire() || !isAdmin}
            />
          </div>
        </div>
      </div>
    )
  }
}

export default SleepMode
