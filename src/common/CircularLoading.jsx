import React from 'react'
import { CircularProgress } from 'material-ui'

const CircularLoading = props => (
  <div {...props}>
    <CircularProgress thickness={2} size={24} />
  </div>
)

export default CircularLoading
