import React from 'react'
import { Button } from '../common/Buttons'
import { AddDriveIcon } from '../common/Svg'

class AddDrive extends Button {
  constructor (props) {
    super(props)

    this.onMouseDown = (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.setState({ pressed: true })
    }
  }
  render () {
    const { item } = this.props
    const { entry } = item

    const backgroundColor = this.state.pressed ? '#f4fafe' : this.state.hover ? '#f9fcfe' : '#FFF'
    const borderColor = this.state.pressed ? '#a3d3f8' : this.state.hover ? '#d1e9fb' : '#FFF'
    const iconColor = this.state.pressed ? '#31a0f5' : 'rgba(125, 134, 143, 0.5)'
    const textColor = this.state.pressed ? '#31a0f5' : '#505259'
    return (
      <div
        style={{
          position: 'relative',
          width: 140,
          height: 140,
          marginRight: 4,
          marginBottom: 10,
          cursor: 'pointer',
          backgroundColor,
          border: `1px solid ${borderColor}`
        }}
        {...this.funcs}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation() }}
      >
        {/* preview or icon */}
        <div
          draggable={false}
          className="flexCenter"
          style={{ height: 80, width: 108, margin: '16px auto 0 auto', overflow: 'hidden' }}
        >
          <AddDriveIcon style={{ width: 30, height: 30, color: iconColor }} />
        </div>

        {/* file name */}
        <div style={{ height: 40, color: 'var(--dark-text)', paddingBottom: 4 }} className="flexCenter" >
          <div
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              fontSize: 13,
              width: 130,
              color: textColor,
              textAlign: 'center',
              fontWeight: 500
            }}
          >
            { entry.name }
          </div>
        </div>
      </div>
    )
  }
}

export default AddDrive
