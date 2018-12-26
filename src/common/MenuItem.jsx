import React from 'react'
import { MenuItem } from 'material-ui'

export default (props) => {
  let style = { fontSize: 14, minHeight: 40, height: 40, lineHeight: '40px' }
  if (props.style) style = Object.assign({}, style, props.style)
  const innerDivStyle = props.leftIcon ? undefined : { paddingLeft: 24 }

  return (
    <MenuItem
      {...props}
      innerDivStyle={innerDivStyle}
      style={style}
    />
  )
}
