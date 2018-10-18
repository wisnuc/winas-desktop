import i18n from 'i18n'
import React from 'react'
import { shell } from 'electron'
import { Divider } from 'material-ui'
import { AutoSizer } from 'react-virtualized'

import Dialog from '../common/PureDialog'
import ScrollBar from '../common/ScrollBar'
import { isPhoneNumber } from '../common/validate'
import { CloseIcon, BackIcon } from '../common/Svg'
import CircularLoading from '../common/CircularLoading'
import { RSButton, LIButton, Checkbox, TextField } from '../common/Buttons'

const clientUrl = 'http://www.phicomm.com/cn/support.php/Lian/software_support.html'

class AdminUsersApp extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      checkList: [],
      pn: '',
      pnError: '',
      nickName: '',
      nickNameError: '',
      users: null,
      loading: true,
      invited: false,
      status: 'view' // view, modify, add, confirm
    }

    this.reqUsersAsync = async () => {
      const { phi, device } = this.props
      const deviceSN = device.mdev.deviceSN
      const [cloudUsersRes, localUsers, drives] = await Promise.all([
        phi.reqAsync('cloudUsers', { deviceSN }),
        phi.reqAsync('localUsers', { deviceSN }),
        phi.reqAsync('drives', { deviceSN })
      ])
      const cloudUsers = cloudUsersRes.result.users
      this.localUsers = localUsers

      /* public drives */
      const builtIn = drives.find(d => d.tag === 'built-in')
      const publicDrives = drives.filter(d => d.type === 'public' && d.tag !== 'built-in')

      /* service users */
      const users = localUsers.filter(u => !u.isFirstUser).map((u) => {
        const { uuid, status, reason } = u
        const driveList = []
        const cloudUser = cloudUsers.find(user => user.uid === u.phicommUserId) || {}
        driveList.push(builtIn.label || i18n.__('Built-in Drive'))
        publicDrives.filter(p => p.writelist === '*' || p.writelist.includes(uuid)).forEach(d => driveList.push(d.label))
        const inActive = status === 'INACTIVE' && reason

        return Object.assign({ driveList, inActive }, cloudUser, u, { createTime: cloudUser.createTime })
      })

      return users
    }

    this.reqUsers = () => {
      this.setState({ loading: true, users: null, status: 'view', invited: false, error: null })
      this.reqUsersAsync().then(users => this.setState({ users, loading: false })).catch((e) => {
        console.error('this.reqUsers error', e)
        this.setState({ error: true, loading: false, users: null })
      })
    }

    this.deleteUserAsync = async () => {
      const { phi, device } = this.props
      const deviceSN = device.mdev.deviceSN
      for (let i = 0; i < this.state.checkList.length; i++) {
        const uuid = this.state.checkList[i]
        await phi.reqAsync('deleteUser', { deviceSN, uuid })
      }
    }

    this.deleteUser = () => {
      this.setState({ loading: true, users: null, status: 'view', invited: false })
      this.deleteUserAsync().then(() => this.reqUsers()).catch((e) => {
        this.props.openSnackBar(i18n.__('Delete User Failed'))
        this.reqUsers()
      })
    }

    this.addUser = () => {
      this.setState({ status: 'addUser', loading: false, invited: false, pn: '', pnError: '', nickName: '', nickNameError: '' })
    }

    this.backToView = () => {
      this.setState({ status: 'view', loading: false, invited: false, pn: '', pnError: '', nickName: '', nickNameError: '' })
    }

    this.inviteAsync = async () => {
      const { phi, device } = this.props
      const deviceSN = device.mdev.deviceSN
      const args = { deviceSN, phoneNumber: this.state.pn, nickName: this.state.nickName }
      const phicommUserId = (await phi.reqAsync('registerPhiUser', args)).result.uid
      const user = await phi.reqAsync('newUser', { deviceSN, username: this.state.nickName, phoneNumber: this.state.pn, phicommUserId })
      if (!user || user.phicommUserId !== phicommUserId) throw Error('add local user error')
      const cloudUsers = (await phi.reqAsync('cloudUsers', { deviceSN })).result.users
      if (!cloudUsers.find(u => u.uid === phicommUserId)) throw Error('req cloud user error')
    }

    this.invite = () => {
      if (!this.shouldAddUser()) return
      this.setState({ invited: true })
      this.inviteAsync().then(() => this.reqUsers()).catch((e) => {
        console.error('this.invite error', e)
        this.setState({ invited: false })
        if (e && e.msg && e.error) this.props.openSnackBar(e.msg)
        else this.props.openSnackBar(i18n.__('Invite User Error'))
      })
    }

    this.onCheck = (uuid) => {
      const checkList = [...this.state.checkList]
      const index = checkList.findIndex(u => u === uuid)
      if (index > -1) checkList.splice(index, 1)
      else checkList.push(uuid)
      this.setState({ checkList })
    }

    this.updateNickName = (nickName) => {
      if (this.localUsers.find(u => u.username === nickName)) this.setState({ nickName, nickNameError: i18n.__('Name Exist Error') })
      else this.setState({ nickName, nickNameError: '' })
    }

    this.updatePn = (pn) => {
      if (this.localUsers.find(u => u.phoneNumber === pn)) this.setState({ pn, pnError: i18n.__('User Exist Error') })
      else if (isPhoneNumber(pn)) this.setState({ pn, pnError: '' })
      else this.setState({ pn, pnError: i18n.__('Invalid Phone Number') })
    }

    this.confirmDelete = () => {
      this.setState({ status: 'confirm' })
    }

    this.reActiveAsync = async (localUser) => {
      const { phi, device } = this.props
      const { uuid, phoneNumber } = localUser
      const deviceSN = device.mdev.deviceSN
      const args = { deviceSN, phoneNumber, nickName: phoneNumber }
      const phicommUserId = (await phi.reqAsync('registerPhiUser', args)).result.uid
      const user = await phi.reqAsync('activeUser', { uuid, deviceSN })
      if (!user || user.phicommUserId !== phicommUserId) throw Error('add local user error')
      const cloudUsers = (await phi.reqAsync('cloudUsers', { deviceSN })).result.users
      if (!cloudUsers.find(u => u.uid === phicommUserId)) throw Error('req cloud user error')
    }

    this.reActive = (user) => {
      this.setState({ invited: true })
      this.reActiveAsync(user).then(() => this.reqUsers()).catch((e) => {
        console.error('this.invite error', e)
        this.setState({ invited: false })
        this.props.openSnackBar(i18n.__('Active User Error'))
      })
    }
  }

  componentDidMount () {
    this.reqUsers()
  }

  shouldAddUser () {
    return this.state.status === 'addUser' && this.state.nickName && !this.state.nickNameError &&
      this.state.pn.length === 11 && !this.state.pnError && isPhoneNumber(this.state.pn) && !this.state.invited
  }

  renderUser (driveList) {
    return (
      <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
        <div style={{ color: '#31a0f5' }}> { i18n.__('User') } </div>
        <div style={{ backgroundColor: '#c4c5cc', height: 10, width: 1, margin: '0 8px' }} />
        <div style={{ color: '#888a8c' }}> { driveList.join(', ') } </div>
      </div>
    )
  }

  renderError () {
    return i18n.__('Failed To Load User Data')
  }

  renderMaxUser () {
    return i18n.__('Exceed Max Users Text')
  }

  renderAddUser () {
    return (
      <div style={{ width: 280, marginBottom: -20 }}>
        <div
          style={{
            height: 20,
            fontSize: 14,
            color: this.state.nickNameError ? '#fa5353' : '#525a60',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          { this.state.nickNameError || i18n.__('Nick Name') }
        </div>
        <div style={{ marginTop: -30 }}>
          <TextField
            value={this.state.nickName}
            maxLength={20}
            onChange={e => this.updateNickName(e.target.value)}
            hintText={i18n.__('Add User Nick Name Hint')}
            disabled={this.state.invited}
          />
        </div>
        <div style={{ height: 10 }} />
        <div
          style={{
            height: 20,
            fontSize: 14,
            color: this.state.pnError ? '#fa5353' : '#525a60',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          { this.state.pnError || i18n.__('Phone Number') }
        </div>
        <div style={{ marginTop: -30 }}>
          <TextField
            value={this.state.pn}
            maxLength={11}
            onChange={e => this.updatePn(e.target.value)}
            hintText={i18n.__('Add User Phone Number Hint')}
            disabled={this.state.invited}
          />
        </div>
        <div
          style={{
            marginTop: 20,
            height: 60,
            fontSize: 14,
            color: '#85868c',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          { i18n.__('Add User Text') }
        </div>
        <div
          style={{
            height: 40,
            fontSize: 14,
            color: '#31a0f5',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
          onClick={() => shell.openExternal(clientUrl)}
        >
          { i18n.__('Client Download Address') }
        </div>
      </div>
    )
  }

  renderLoading () {
    return (
      <div style={{ width: 320, padding: '0 30px' }} >
        <div style={{ width: '100%', height: '100%' }} className="flexCenter">
          <CircularLoading />
        </div>
        <div style={{ height: 20, color: '#31a0f5' }} className="flexCenter">
          { i18n.__('Loading Users Text') }
        </div>
      </div>
    )
  }

  renderNoUser () {
    return (
      <div style={{ width: 320, padding: '0 30px' }} >
        <img src="./assets/images/pic_nouser.png" alt="nouser" width={320} height={180} />
        <div style={{ height: 80, color: '#85868c', marginTop: 20, lineHeight: '26px' }} >
          { i18n.__('No User Text') }
        </div>
      </div>
    )
  }

  renderRow ({ style, key, user }) {
    const { driveList, inviteStatus, username, uuid, inActive, createTime, phoneNumber } = user
    const isModify = this.state.status === 'modify'
    return (
      <div style={style} key={key}>
        <div style={{ height: 60, display: 'flex' }}>
          {
            isModify &&
            (
              <div style={{ marginTop: -2 }}>
                <Checkbox
                  onCheck={() => this.onCheck(uuid)}
                  checked={this.state.checkList.includes(uuid)}
                />
              </div>
            )
          }

          <div style={{ height: 60 }}>
            <div
              style={{
                height: 20,
                color: '#505259',
                display: 'flex',
                alignItems: 'center',
                cursor: isModify ? 'pointer' : 'default'
              }}
              onClick={() => isModify && this.onCheck(uuid)}
            >
              { `${username || i18n.__('Normal User')} (${phoneNumber})` }
            </div>
            <div style={{ height: 40, display: 'flex', alignItems: 'center' }}>
              {
                inActive
                  ? (
                    <div style={{ color: inActive !== 'import' ? '#f53131' : '#31a0f5', display: 'flex', alignItems: 'center' }}>
                      { inActive === 'timeout' ? i18n.__('Timeout User')
                        : inActive === 'reject' ? i18n.__('Invite Rejected') : i18n.__('InActive User') }
                      <div style={{ width: 10 }} />
                      <RSButton
                        alt
                        disabled={this.state.invited}
                        style={{ height: 20 }}
                        labelStyle={{ height: 20, fontSize: 12 }}
                        label={inActive !== 'import' ? i18n.__('Reinvite') : i18n.__('Active')}
                        onClick={() => this.reActive(user)}
                      />
                    </div>
                  )
                  : inviteStatus === 'accept' ? this.renderUser(driveList)
                    : (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ color: inviteStatus === 'reject' ? '#f53131' : '#31a0f5' }}>
                          { inviteStatus === 'reject' ? i18n.__('Invite Rejected') : i18n.__('Invite Pending') }
                        </div>
                        <div style={{ backgroundColor: '#c4c5cc', height: 10, width: 1, margin: '0 8px' }} />
                        { createTime.slice(0, 19) }
                        <div style={{ width: 10 }} />
                        {
                          inviteStatus === 'reject' &&
                            <RSButton
                              alt
                              disabled={this.state.invited}
                              style={{ height: 20 }}
                              labelStyle={{ height: 20, fontSize: 12 }}
                              label={i18n.__('Reinvite')}
                              onClick={() => this.reActive(user)}
                            />
                        }
                      </div>
                    )
              }
            </div>
          </div>
        </div>
      </div>
    )
  }

  renderUsers (users) {
    const rowCount = users.length
    const rowHeight = 60
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <AutoSizer>
          {({ height, width }) => (
            <ScrollBar
              allHeight={rowHeight * rowCount}
              height={height}
              width={width}
              rowHeight={rowHeight}
              rowRenderer={({ style, key, index }) => this.renderRow({ style, key, user: users[index] })}
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
    const { open, onCancel } = this.props
    const isModify = this.state.status === 'modify'
    const isAddUser = this.state.status === 'addUser'
    const isConfirm = this.state.status === 'confirm'
    const isMaxUser = Array.isArray(this.state.users) && this.state.users.length >= 9
    const width = (isAddUser || isConfirm) ? 320 : 420
    const hasBack = (isAddUser && !isMaxUser) || isConfirm

    const height = isConfirm ? 60
      : !isAddUser && this.state.users && this.state.users.length > 0 ? Math.min(this.state.users.length * 60, 180)
        : undefined

    return (
      <Dialog open={open} onRequestClose={onCancel} modal >
        {
          open && (
            <div style={{ width, transition: 'all 175ms' }} >
              <div
                className="title"
                style={{ height: 60, display: 'flex', alignItems: 'center', paddingLeft: hasBack ? 0 : 20 }}
              >
                { hasBack && <LIButton onClick={this.backToView}> <BackIcon /> </LIButton>}
                { isAddUser ? isMaxUser ? i18n.__('Exceed Max Users') : i18n.__('Add User')
                  : isConfirm ? i18n.__('Confirm Delete User Title')
                    : isModify ? i18n.__('Modify Users') : i18n.__('User Management') }
                <div style={{ flexGrow: 1 }} />
                { (!isAddUser && !isConfirm) && <LIButton onClick={onCancel}> <CloseIcon /> </LIButton> }
                <div style={{ width: 10 }} />
              </div>
              <Divider
                style={{ marginLeft: 20, width: (isAddUser || isConfirm) ? 280 : 380, transition: 'all 175ms' }}
                className="divider"
              />
              <div style={{ height: 30 }} />
              <div
                style={{
                  height,
                  lineHeight: '30px',
                  color: '#888a8c',
                  padding: '0 20px'
                }}
              >
                {
                  this.state.loading ? this.renderLoading()
                    : this.state.error ? this.renderError()
                      : isAddUser ? isMaxUser ? this.renderMaxUser() : this.renderAddUser()
                        : isConfirm ? i18n.__('Confirm Delete User Text')
                          : this.state.users.length ? this.renderUsers(this.state.users) : this.renderNoUser()
                }
              </div>
              <div style={{ height: 20 }} />
              <div style={{ height: 34, width: 'calc(100% - 40px)', display: 'flex', alignItems: 'center', padding: 20 }}>
                <div style={{ flexGrow: 1 }} />
                {
                  (!isAddUser && !isConfirm && !this.state.error) && (
                    <RSButton
                      alt
                      disabled={(!isModify && (!this.state.users || !this.state.users.length)) ||
                        this.state.invited || this.state.loading}
                      label={isModify ? i18n.__('Cancel') : i18n.__('Modify Users')}
                      onClick={() => this.setState({ status: isModify ? 'view' : 'modify', checkList: [] })}
                    />
                  )
                }
                <div style={{ width: 10 }} />
                <RSButton
                  label={this.state.error ? i18n.__('Refresh User List') : isAddUser ? isMaxUser ? i18n.__('Got It')
                    : this.state.invited ? i18n.__('Sending Invite') : i18n.__('Send Invite')
                    : isConfirm ? i18n.__('Confirm') : isModify ? i18n.__('Delete') : i18n.__('Add User')}
                  disabled={(isModify && !this.state.checkList.length) ||
                    (isAddUser && !isMaxUser && !this.shouldAddUser()) || this.state.invited || this.state.loading}
                  onClick={() => (this.state.error ? this.reqUsers() : isAddUser ? isMaxUser ? this.backToView()
                    : this.invite() : isConfirm ? this.deleteUser()
                    : isModify ? this.confirmDelete() : this.addUser())}
                />
              </div>
            </div>
          )
        }
      </Dialog>
    )
  }
}

export default AdminUsersApp
