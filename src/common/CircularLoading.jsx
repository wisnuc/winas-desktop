import React from 'react'
import { CircularProgress } from 'material-ui'

const CircularLoading = () => (
  <div style={{ width: 24, height: 24 }}>
    <CircularProgress thickness={2} size={24} />
  </div>
)

export default CircularLoading
