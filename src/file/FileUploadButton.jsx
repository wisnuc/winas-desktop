import i18n from 'i18n'
import React from 'react'
import { Popover, Menu, MenuItem } from 'material-ui'
import FlatButton from '../common/FlatButton'
import { UploadFile, UploadFold, UploadIcon } from '../common/Svg'

class FileUploadButton extends React.Component {
  constructor (props) {
    super(props)
    this.state = { open: false }

    this.upload = (type) => {
      this.props.upload(type)
      this.setState({ open: false })
    }

    this.openPop = (e) => {
      e.preventDefault()
      this.setState({ open: true, anchorEl: e.currentTarget })
    }
  }

  render () {
    const color = '#7d868f'

    const iconStyle = { color: this.props.disabled ? 'rgba(125,134,143,.5)' : color, width: 30, height: 30 }

    const iStyle = { marginLeft: 30, marginTop: 5, color, width: 30, height: 30 }
    const items = [
      { primaryText: i18n.__('Upload File'), leftIcon: <UploadFile style={iStyle} />, onClick: () => this.upload('file') },
      { primaryText: i18n.__('Upload Folder'), leftIcon: <UploadFold style={iStyle} />, onClick: () => this.upload('directory') }
    ]
    return (
      <div>
        <FlatButton
          disabled={this.props.disabled}
          onClick={this.openPop}
          label={i18n.__('Upload')}
          labelStyle={{ fontSize: 14, marginLeft: 4 }}
          icon={<UploadIcon style={iconStyle} />}
        />
        <Popover
          open={this.state.open}
          animated
          anchorEl={this.state.anchorEl}
          anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
          targetOrigin={{ horizontal: 'left', vertical: 'top' }}
          onRequestClose={() => this.setState({ open: false })}
          style={{ boxShadow: '0 0 20px 0 rgba(23, 99, 207, 0.1' }}
        >
          <Menu style={{ width: 138, maxWidth: 138, height: 80, overflow: 'hidden' }} >
            {
              items.map((props, index) => (
                <MenuItem
                  {...props}
                  key={index.toString()}
                  style={{
                    marginLeft: -24,
                    marginTop: !index ? -8 : 0,
                    fontSize: 14,
                    color: '#292936',
                    height: 40,
                    minHeight: 40,
                    lineHeight: '40px'
                  }}
                />
              ))
            }
            <div style={{ height: 5, width: '100%' }} />
          </Menu>
        </Popover>
      </div>
    )
  }
}

export default FileUploadButton
