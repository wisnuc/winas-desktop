import React from 'react'
import EventListener from 'react-event-listener'

import { Button } from '../common/Buttons'

class MenuCard extends Button {
  render () {
    const { Icon, name, des, onClick, isLAN, view, isCloud, pHeight, pWidth } = this.props
    if (!pHeight) return <div />
    const disabled = (isLAN && ['resetDevice', 'pt'].includes(view)) || (isCloud && ['resetDevice', 'firmwareUpdate'].includes(view))
    const backgroundColor = this.state.hover ? '#f3f8ff' : '#fff'
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          filter: disabled ? 'grayscale(100%)' : '',
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
        className="flexCenter"
      >
        <div
          {...this.funcs}
          style={{
            width: 250,
            height: 120,
            display: 'flex',
            alignItems: 'center',
            backgroundColor,
            margin: `${pHeight}px ${pWidth}px`
          }}
          onClick={() => !disabled && onClick()}
          disabled={disabled}
        >
          <div style={{ width: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon />
          </div>
          <div style={{ width: 180, display: 'flex', flexDirection: 'column' }} >
            <div style={{ fontSize: 16, color: '#525a60' }}>
              { name }
            </div>
            <div style={{ height: 10 }} />
            <div style={{ fontSize: 12, color: '#888a8c' }}>
              { des }
            </div>
          </div>
        </div>
      </div>
    )
  }
}

class Menu extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      pWidth: 0,
      pHeight: 0
    }

    this.calcSize = () => {
      const { clientHeight, clientWidth } = this.refRoot
      this.setState({ pWidth: Math.round((clientWidth - 1100) / 16.4), pHeight: Math.round((clientHeight - 470) / 14.28) })
    }
  }

  componentDidMount () {
    this.calcSize()
  }

  render () {
    const { views, navTo, isLAN, isCloud, isAdmin } = this.props
    const group = 'settings'
    let list = Object.keys(views).filter(key => views[key].navGroup() === group && key !== 'settings')
    if (!isAdmin) list = [...list].filter(key => key !== 'firmwareUpdate').slice(0, -3)
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          boxSizing: 'border-box'
        }}
        className="flexCenter"
        ref={ref => (this.refRoot = ref)}
      >
        <EventListener target="window" onResize={this.calcSize} />
        <div
          style={{
            display: 'grid',
            gridGap: 0,
            gridTemplateColumns: '1fr 1fr 1fr 1fr'
          }}
        >
          {
            [...list].map((key, i) => (
              <MenuCard
                {...this.state}
                key={key + i.toString()}
                Icon={views[key].menuIcon()}
                name={views[key].menuName()}
                des={views[key].menuDes()}
                onClick={() => navTo(key)}
                isLAN={isLAN}
                isCloud={isCloud}
                view={key}
              />
            ))
          }
        </div>
      </div>
    )
  }
}

export default Menu
