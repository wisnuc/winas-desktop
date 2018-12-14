import i18n from 'i18n'
import React from 'react'
import { IconButton, Toggle as MToggle, Checkbox as MCheckbox, TextField as MTF, Menu, MenuItem } from 'material-ui'
import Popover, { PopoverAnimationVertical } from 'material-ui/Popover'

import Tooltip from '../common/Tooltip'
import { CheckedIcon, SmallErrorIcon, UploadFile, UploadFold, NewFolderIcon } from '../common/Svg'

class LoadingLabel extends React.PureComponent {
  constructor (props) {
    super(props)
    this.state = { count: 1 }

    this.changeCount = () => {
      this.setState({ count: (this.state.count + 1) % 4 })
    }
  }

  componentDidMount () {
    if (this.props.loading) this.timer = setInterval(this.changeCount, 1000)
  }

  componentWillReceiveProps (nextProps) {
    if (!this.props.loading && nextProps.loading) this.timer = setInterval(this.changeCount, 1000)
    else if (!nextProps.loading) clearInterval(this.timer)
  }

  componentWillUnmount () {
    clearInterval(this.timer)
  }

  render () {
    const { style, loading, label } = this.props
    const dash = Array.from({ length: this.state.count }).fill('.').join('')
    return (
      <div style={style}>
        { loading ? label + dash : label }
      </div>
    )
  }
}

export class Button extends React.PureComponent {
  constructor (props) {
    super(props)
    this.state = {
      mouse: {},
      hover: false,
      pressed: false
    }

    this.onMouseDown = () => this.setState({ pressed: true })

    this.onMouseUp = () => this.setState({ pressed: false })

    this.onMouseMove = e => this.setState({ hover: true, mouse: { x: e.clientX, y: e.clientY } })

    this.onMouseLeave = () => this.setState({ pressed: false, hover: false })

    this.onClick = (e) => {
      const { disabled, onClick, loading } = this.props
      if (disabled || loading || typeof onClick !== 'function') return
      onClick(e)
    }

    this.funcs = {
      onMouseUp: this.onMouseUp,
      onMouseDown: this.onMouseDown,
      onMouseMove: this.onMouseMove,
      onMouseLeave: this.onMouseLeave,
      onClick: this.onClick
    }
  }

  renderTootip () {
    const left = this.state.mouse.x
    const top = this.state.mouse.y + 20
    return (
      <div
        className="flexCenter"
        style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1000 }}
      >
        <div
          style={{
            position: 'absolute',
            width: 'max-content',
            backgroundColor: '#FFF',
            border: 'solid 1px #d9d9d9',
            padding: 5,
            top,
            left,
            fontSize: 12,
            color: '#292936'
          }}
        >
          { this.props.tooltip }
        </div>
      </div>
    )
  }

  render () {
    return <div />
  }
}

/* Raised Button */
export class RSButton extends Button {
  render () {
    const { label, style, labelStyle, disabled, alt } = this.props
    const cursor = disabled ? 'default' : 'pointer'
    const borderRadius = 4
    const color = !alt ? '#FFF'
      : alt && disabled ? 'var(--light-grey-text)'
        : alt && this.state.pressed ? '#009688'
          : '#6d7073'

    const backgroundColor = alt ? '#FFF'
      : disabled ? '#c4c5cc'
        : this.state.pressed ? '#2588f2'
          : '#009688'

    const border = !alt ? undefined
      : disabled ? 'solid 1px var(--light-grey-text)'
        : this.state.pressed ? 'solid 1px #009688'
          : 'solid 1px #dddddd'

    const boxShadow = this.state.hover && !disabled
      ? `0px 2px 4px 0 ${alt ? 'rgba(164, 168, 171, 0.25)' : 'rgba(33, 110, 209, 0.25)'}`
      : undefined

    const buttonStyle = Object.assign(
      {
        padding: '0 24px',
        display: 'inline-block',
        cursor,
        border,
        boxShadow,
        borderRadius,
        backgroundColor
      },
      style
    )
    const textStyle = Object.assign({ color, fontSize: 14, height: 34 }, labelStyle)

    return (
      <div {...this.funcs} style={buttonStyle} >
        <div style={textStyle} className="flexCenter" > { label } </div>
      </div>
    )
  }
}

/* Raised Button with BorderRadius */
export class RRButton extends Button {
  render () {
    const { label, style, labelStyle, disabled, alt, loading, tooltip } = this.props
    const height = 40
    const width = 328
    const cursor = disabled ? 'default' : 'pointer'
    const borderRadius = height / 2
    const backgroundColor = (disabled && !loading) ? '#FFF' : alt ? '#44c468' : '#00695c'
    const border = (disabled && !loading) ? 'solid 1px rgba(0,0,0,.06)' : ''

    const boxShadow = (disabled && !loading)
      ? ''
      : this.state.hover
        ? `0px 10px 15px 0 ${alt ? 'rgba(47, 162, 79, 0.2)' : 'rgba(33, 110, 209, 0.2)'}`
        : `0px 5px 10px 0 ${alt ? 'rgba(47, 162, 79, 0.25)' : 'rgba(33, 110, 209, 0.25)'}`

    const buttonStyle = Object.assign({
      width,
      height,
      cursor,
      border,
      borderRadius,
      backgroundColor,
      boxShadow,
      position: 'relative',
      overflow: 'hidden'
    }, style)

    const textStyle = Object.assign({ color: (disabled && !loading) ? 'rgba(0,0,0,.26)' : '#FFF', fontSize: 16 }, labelStyle)

    const overlayBgColor = loading ? 'rgba(0,0,0,.1)'
      : disabled ? 'transparent'
        : (this.state.pressed || this.state.hover) ? 'rgba(255,255,255,.1)'
          : 'transparent'

    const overlayStyle = { width, height, borderRadius, backgroundColor: overlayBgColor, position: 'absolute', top: 0, left: 0 }

    return (
      <div {...this.funcs} style={buttonStyle} className="flexCenter" >
        <LoadingLabel style={textStyle} loading={loading} label={label} />
        <div style={overlayStyle} />
        { this.state.hover && tooltip && this.renderTootip(tooltip) }
      </div>
    )
  }
}

/* New Action Button */
export class ActButton extends Button {
  constructor (props) {
    super(props)
    this.state = {
      open: false,
      mouse: {},
      hover: false,
      pressed: false
    }

    this.upload = (type) => {
      this.setState({ open: false }, () => {
        this.props.upload(type)
      })
    }

    this.newFolder = () => {
      this.setState({ open: false }, () => {
        this.props.newFolder()
      })
    }

    this.onClick = (e) => {
      e.preventDefault()
      this.setState({ open: true, anchorEl: e.currentTarget })
    }

    this.funcs = {
      onMouseUp: this.onMouseUp,
      onMouseDown: this.onMouseDown,
      onMouseMove: this.onMouseMove,
      onMouseLeave: this.onMouseLeave,
      onClick: this.onClick
    }

    this.exit = () => {
      this.setState({ open: false })
    }
  }
  render () {
    const { label, shrinked, primaryColor } = this.props
    const Icon = this.props.icon
    const height = 48
    const width = shrinked ? 48 : 192
    const cursor = 'pointer'
    const borderRadius = height / 2
    const backgroundColor = '#FFFFFF'
    const margin = shrinked ? '20px' : '20px 16px'

    const boxShadow = this.state.hover ? '0px 5px 6.6px 0.4px rgba(96, 125, 139, 0.24), 0px 2px 9.8px 0.2px rgba(55, 71, 79, 0.16)'
      : '0px 1px 0.9px 0.1px rgba(69, 90, 100, 0.24), 0 0 1px 0px rgba(69, 90, 100, 0.16)'

    const buttonStyle = {
      width,
      height,
      cursor,
      margin,
      borderRadius,
      backgroundColor,
      boxShadow,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center'
    }

    const iconStyle = { color: primaryColor, marginLeft: shrinked ? 16 : 20, width: 18, height: 18, transition: 'all 0ms' }
    const iStyle = { color: 'rgba(0,0,0,.54)' }
    const textStyle = { marginLeft: 32, fontSize: 16 }
    const items = [
      { primaryText: i18n.__('New Folder'), leftIcon: <NewFolderIcon style={iStyle} />, onClick: () => this.newFolder() },
      { type: 'br' },
      { primaryText: i18n.__('Upload File'), leftIcon: <UploadFile style={iStyle} />, onClick: () => this.upload('file') },
      { primaryText: i18n.__('Upload Folder'), leftIcon: <UploadFold style={iStyle} />, onClick: () => this.upload('directory') }
    ]

    return (
      <div>
        <div {...this.funcs} style={buttonStyle}>
          <Icon style={iconStyle} />
          { !shrinked && <div style={textStyle}> { label } </div> }
        </div>
        <Popover
          open={this.state.open}
          animation={PopoverAnimationVertical}
          anchorEl={this.state.anchorEl}
          anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
          targetOrigin={{ horizontal: 'left', vertical: 'top' }}
          onRequestClose={this.exit}
          style={{ boxShadow: '0px 5px 6.6px 0.4px rgba(96, 125, 139, 0.24), 0px 2px 9.8px 0.2px rgba(96, 125, 139, 0.16)' }}
        >
          <Menu style={{ width: 224, maxWidth: 224, height: 176, overflow: 'hidden' }} >
            {
              items.map((props, index) => (
                props.type === 'br' ? (
                  <div
                    key={index.toString()}
                    style={{ height: 1, width: 224, borderRadius: 0.5, backgroundColor: '#e8eaed', margin: '8px 0' }}
                  />
                ) : (
                  <MenuItem
                    {...props}
                    key={index.toString()}
                    style={{
                      paddingLeft: 8,
                      fontSize: 14,
                      color: '#292936',
                      height: 48,
                      minHeight: 48,
                      lineHeight: '48px'
                    }}
                  />
                )
              ))
            }
            <div style={{ height: 5, width: '100%' }} />
          </Menu>
        </Popover>
      </div>
    )
  }
}

/* Flat Button */
export class FLButton extends Button {
  render () {
    const { label, style, labelStyle, disabled } = this.props

    const cursor = disabled ? 'default' : 'pointer'
    const color = this.state.hover && !disabled ? 'rgba(0,150,136,.76)' : 'rgba(0,0,0,.26)'
    const buttonStyle = Object.assign({ padding: '0 8px', cursor, display: 'inline-block' }, style)
    const textStyle = Object.assign({ height: 34, color, fontSzie: 14 }, labelStyle)

    return (
      <div {...this.funcs} style={buttonStyle} >
        <div style={textStyle} className="flexCenter" > { label } </div>
      </div>
    )
  }
}

/* Mode Select Button */
export class ModeSelect extends Button {
  render () {
    const { label, selected, onClick, disabled } = this.props
    const color = disabled ? 'var(--light-grey-text)' : '#525a60'
    const backgroundColor = disabled || (!this.state.hover && !selected) ? '#FFF' : '#f2f5fa'
    const borderColor = disabled || (!this.state.hover && !selected) ? '#dae0e6' : 'var(--dodger-blue)'

    return (
      <div
        onClick={onClick}
        onMouseMove={() => this.setState({ hover: true })}
        onMouseLeave={() => this.setState({ hover: false })}
        style={{
          height: 50,
          width: 135,
          color,
          backgroundColor,
          position: 'relative',
          boxSizing: 'border-box',
          border: `solid 1px ${borderColor}`
        }}
        className="flexCenter"
        {...this.funcs}
      >
        { label }
        {
          selected &&
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                width: 0,
                height: 0,
                borderTop: '20px solid #31a0f5',
                borderLeft: '20px solid transparent'
              }}
            />
        }
        {
          selected &&
            <div style={{ position: 'absolute', right: 0, top: -4 }} >
              <CheckedIcon style={{ width: 10 }} />
            </div>
        }
      </div>
    )
  }
}

/* open in local app Button */
export class OLButton extends Button {
  render () {
    const { label, onClick } = this.props
    const Icon = this.props.icon
    const color = '#FFF'
    const backgroundColor = '#31a0f5'

    return (
      <div
        onClick={onClick}
        onMouseMove={() => this.setState({ hover: true })}
        onMouseLeave={() => this.setState({ hover: false })}
        style={{
          height: 50,
          width: 280,
          color,
          borderRadius: 4,
          backgroundColor,
          cursor: 'pointer'
        }}
        className="flexCenter"
        {...this.funcs}
      >
        <Icon style={{ color: '#FFF' }} />
        <div style={{ width: 10 }} />
        { label }
      </div>
    )
  }
}

/* Menu Button in Home */
export class MenuButton extends Button {
  render () {
    const { text, selected, primaryColor } = this.props
    const Icon = this.props.icon
    const backgroundColor = this.state.hover ? '#F5F5F5' : '#FFF'
    const textColor = selected ? primaryColor : 'rgba(0,0,0,.76)'
    const iconColor = selected ? primaryColor : 'rgba(0,0,0,.54)'
    const zIndex = selected ? 100 : 1
    const opacity = selected ? 1 : 0.87
    const fontWeight = selected ? 500 : 'normal'
    const borderRadius = 0

    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 48,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          zIndex,
          opacity,
          borderRadius,
          backgroundColor
        }}
        {...this.funcs}
      >
        <Icon style={{ margin: '0 32px', width: 24, height: 24, color: iconColor }} />
        <div style={{ color: textColor, fontWeight }}> { text } </div>
      </div>
    )
  }
}

/* Small Icon Button in TextFiled */
export class TFButton extends Button {
  render () {
    const { disabled } = this.props
    const Icon = this.props.icon
    const iconColor = this.state.hover && !disabled ? '#009688' : 'rgba(0,0,0,.54)'
    const opacity = disabled ? 0.5 : 1

    return (
      <div
        style={{
          width: 24,
          height: 24,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
        {...this.funcs}
      >
        <Icon style={{ width: 24, height: 24, color: iconColor, opacity }} />
      </div>
    )
  }
}

const styles = {
  largeIcon: {
    width: 24,
    height: 24
  },
  largeButton: {
    width: 48,
    height: 48,
    padding: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  smallIcon: {
    width: 18,
    height: 18
  },
  smallButton: {
    width: 24,
    height: 24,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}

/* Larger Icon Button */
export class LIButton extends React.PureComponent {
  render () {
    const { disabled } = this.props
    const style = Object.assign({}, styles.largeButton, this.props.style)
    const iconStyle = Object.assign({ color: '#7d868f', opacity: disabled ? 0.5 : 1 }, styles.largeIcon, this.props.iconStyle)
    const props = Object.assign({}, this.props)
    delete props.tooltip
    delete props.iconStyle
    delete props.style
    return (
      <Tooltip tooltip={this.props.tooltip} disabled={disabled} >
        <IconButton style={style} iconStyle={iconStyle} {...props} />
      </Tooltip>
    )
  }
}

/* Small Icon Button */
export class SIButton extends React.PureComponent {
  render () {
    const { disabled } = this.props
    const style = Object.assign({}, styles.smallButton, this.props.style)
    const iconStyle = Object.assign({ color: 'rgba(0,0,0,.54)', opacity: disabled ? 0.5 : 1 }, styles.smallIcon, this.props.iconStyle)
    const props = Object.assign({}, this.props)
    delete props.tooltip
    delete props.iconStyle
    delete props.style
    return (
      <Tooltip tooltip={this.props.tooltip} disabled={disabled} >
        <IconButton style={style} iconStyle={iconStyle} {...props} />
      </Tooltip>
    )
  }
}

export class Toggle extends React.PureComponent {
  render () {
    const { toggled, onToggle, disabled } = this.props
    return (
      <MToggle
        style={{ width: 48 }}
        thumbStyle={{ width: 18, height: 18, marginTop: 3, backgroundColor: '#85868c', boxShadow: '0px 2px 6px 0 rgba(52,52,52,.24)' }}
        thumbSwitchedStyle={{ width: 18, height: 18, marginTop: 3, backgroundColor: '#31a0f5', boxShadow: '0px 2px 6px 0 rgba(85,131,243,.3)' }}
        trackStyle={{ height: 16, backgroundColor: '#FFF', border: '1px solid #e6e6e6' }}
        trackSwitchedStyle={{ height: 16, backgroundColor: '#FFF', border: '1px solid #e6e6e6' }}
        disabled={disabled}
        toggled={toggled}
        onToggle={onToggle}
      />
    )
  }
}

export class Checkbox extends React.PureComponent {
  render () {
    const { label, disabled, checked, onCheck, style, alt, primaryColor } = this.props
    return (
      <MCheckbox
        label={label}
        style={style}
        checked={checked}
        onCheck={onCheck}
        disabled={disabled}
        disableTouchRipple
        iconStyle={{ height: 24, width: 24, marginTop: 2, fill: checked ? primaryColor : 'rgba(0,0,0,.25)' }}
        labelStyle={{ fontSize: 14, color: alt ? '#525a60' : '#85868c', marginLeft: -9 }}
      />
    )
  }
}

export class TextField extends React.PureComponent {
  render () {
    const props = Object.assign({}, this.props)
    if (this.props.errorText) {
      props.errorText = (
        <div style={{ display: 'flex', alignItems: 'center' }} >
          <SmallErrorIcon style={{ color: '#fa5353' }} />
          <div style={{ marginTop: -2, marginLeft: -2 }}> { this.props.errorText } </div>
        </div>
      )
    }

    delete props.autoFoucus
    return (
      <MTF
        fullWidth
        ref={input => input && this.props.autoFoucus && input.focus()}
        style={{ marginTop: 32, marginBottom: -10 }}
        hintStyle={{ color: '#c4c5cc', fontSize: 14, marginBottom: 5, marginLeft: 16 }}
        inputStyle={{ fontWeight: 500, fontSize: 18, marginTop: -5, marginLeft: 16 }}
        errorStyle={{ position: 'absolute', left: -9, bottom: 45 }}
        underlineStyle={{ backgroundColor: '#eaeaea' }}
        underlineDisabledStyle={{ borderBottom: '1px solid #eaeaea' }}
        {...props}
      />
    )
  }
}

export class LoginTF extends React.PureComponent {
  render () {
    const props = Object.assign({}, this.props)

    delete props.autoFoucus
    return (
      <MTF
        fullWidth
        ref={input => input && this.props.autoFoucus && input.focus()}
        inputStyle={{ paddingRight: 32 }}
        underlineStyle={{ backgroundColor: '#eaeaea' }}
        underlineDisabledStyle={{ borderBottom: '1px solid #eaeaea' }}
        {...props}
      />
    )
  }
}

export class PwdTF extends React.PureComponent {
  render () {
    const props = Object.assign({}, this.props)

    delete props.autoFoucus
    return (
      <MTF
        fullWidth
        underlineShow={false}
        ref={input => input && this.props.autoFoucus && input.focus()}
        style={{ height: 40, border: 'solid 1px rgba(0,0,0,.12)' }}
        hintStyle={{ color: 'rgba(0,0,0,.38)', fontSize: 14, marginLeft: 16, marginBottom: -4 }}
        inputStyle={{ fontWeight: 500, fontSize: 16, marginLeft: 16 }}
        errorStyle={{ position: 'absolute', bottom: 48 }}
        {...props}
      />
    )
  }
}
