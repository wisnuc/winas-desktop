import React from 'react'
import { TextField } from 'material-ui'
import { Button } from '../common/Buttons'
import { SearchIcon } from '../common/Svg'

class Search extends Button {
  constructor (props) {
    super(props)
    this.state = {
      value: '',
      errorText: '',
      list: []
    }

    this.fire = () => {
      this.props.fire(this.state.value)
    }

    this.handleChange = (value) => {
      this.setState({ value, errorText: '' })
      if (!value) this.props.clear()
    }

    this.onKeyDown = (e) => {
      if (e.which === 13) this.fire()
    }
  }

  render () {
    const searchHint = this.props.hint

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 40,
          width: 192,
          backgroundColor: '#f8f9fa',
          borderRadius: 20
        }}
      >
        <SearchIcon
          {...this.funcs}
          onClick={() => this.fire()}
          style={{ color: 'rgba(0,0,0,.26)', width: 24, height: 24, marginLeft: 16 }}
        />
        <TextField
          name="search-input"
          style={{ width: 120, marginLeft: 32 }}
          inputStyle={{ color: 'rgba(0,0,0,.38)', fontSize: 14 }}
          underlineStyle={{ display: 'none' }}
          hintText={searchHint}
          hintStyle={{ color: 'var(--light-grey-text)', fontSize: 14 }}
          value={this.state.value}
          errorText={this.state.errorText}
          onChange={e => this.handleChange(e.target.value)}
          onKeyDown={this.onKeyDown}
        />
      </div>
    )
  }
}

export default Search
