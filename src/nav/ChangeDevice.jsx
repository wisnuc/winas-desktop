import i18n from 'i18n'
import React from 'react'
import { AutoSizer } from 'react-virtualized'
import { MenuItem } from 'material-ui'
import Device from '../login/Device'
import ScrollBar from '../common/ScrollBar'
import { LIButton } from '../common/Buttons'
import { BackwardIcon } from '../common/Svg'

class ChangeDevice extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      dev: null
    }
  }

  renderRow ({ style, key, device }) {
    return (
      <div style={style} key={key}>
        <MenuItem onClick={() => this.props.slDevice(device)} >
          <Device {...this.props} cdev={device} />
        </MenuItem>
      </div>
    )
  }

  renderList (list) {
    const rowCount = list.length
    const rowHeight = 80
    return (
      <div style={{ width: 450, height: 240 }}>
        <AutoSizer>
          {({ height, width }) => (
            <ScrollBar
              allHeight={rowHeight * rowCount}
              height={height}
              width={width}
              rowHeight={rowHeight}
              rowRenderer={({ style, key, index }) => this.renderRow({ style, key, device: list[index] })}
              rowCount={rowCount}
              overscanRowCount={3}
              style={{ outline: 'none' }}
            />
          )}
        </AutoSizer>
      </div>
    )
  }

  render () {
    return (
      <div style={{ width: '100%', zIndex: 100, height: '100%', position: 'relative' }} >
        <div style={{ marginTop: 46, height: 24, display: 'flex', alignItems: 'center' }}>
          <LIButton style={{ marginLeft: 12 }} onClick={() => this.props.back(this.state.dev)}>
            <BackwardIcon />
          </LIButton>
        </div>

        <div style={{ fontSize: 28, display: 'flex', alignItems: 'center', paddingLeft: 80, marginTop: 52, marginBottom: 36 }} >
          { i18n.__('Change Device') }
        </div>
        { this.renderList(this.props.list) }
      </div>
    )
  }
}

export default ChangeDevice
