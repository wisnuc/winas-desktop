import i18n from 'i18n'
import React from 'react'
import prettysize from 'prettysize'
import { formatMtime } from '../common/datetime'

class HoverTip extends React.Component {
  constructor (props) {
    super(props)
    this.state = {}
  }

  render () {
    const { longHover, hover, entries, mouseY, mouseX } = this.props
    const entry = entries[longHover] || entries[hover] || {}
    const top = Math.min(mouseY, window.innerHeight - 30 - (this.refBox ? this.refBox.offsetHeight : 0)) || 0
    const left = Math.min(mouseX, window.innerWidth - 10 - (this.refBox ? this.refBox.offsetWidth : 0)) || 0
    return (
      <div
        ref={ref => (this.refBox = ref)}
        style={{
          position: 'fixed',
          top: top + 20,
          left,
          width: 'max-content',
          maxWidth: 400,
          opacity: top && left && longHover > -1 ? 1 : 0,
          pointerEvents: 'none', // ignore all mouse event, important
          boxSizing: 'bordr-box',
          padding: 5,
          color: '#292936',
          fontSize: 12,
          backgroundColor: '#FFF',
          border: 'solid 1px #d9d9d9'
        }}
      >
        <div style={{ wordBreak: 'break-all' }}>
          { `${i18n.__('Name')}: ${entry.name}` }
        </div>
        {
          entry.type === 'file' && (
            <div>
              { `${i18n.__('Size')}: ${prettysize(entry.size, false, true, 2).toUpperCase()}` }
            </div>
          )
        }
        {
          !!entry.mtime && (
            <div>
              { `${i18n.__('Date Modified')}: ${formatMtime(entry.mtime)}` }
            </div>
          )
        }
      </div>
    )
  }
}

export default HoverTip
