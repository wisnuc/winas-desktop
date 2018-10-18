import React from 'react'
import { MenuItem } from 'material-ui'

export default (props) => {
  let style = { fontSize: 14, minHeight: 30, height: 30, lineHeight: '30px', padding: '0 4px', color: '#505259' }
  if (props.disabled) style = Object.assign({}, style, { opacity: 0.5, marginLeft: 16 })
  if (props.style) style = Object.assign({}, style, props.style)

  return (
    <MenuItem
      {...props}
      style={style}
    />
  )
}
