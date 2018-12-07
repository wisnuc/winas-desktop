import Promise from 'bluebird'
import request from 'superagent'
import EventEmitter from 'eventemitter3'
import querystring from 'querystring'

import parseRes from './parseRes'
import Request from './Request'

const cloudAddress = 'https://test.nodetribe.com/c/v1'

/* this module encapsulate most fruitmix apis */
class Fruitmix extends EventEmitter {
  constructor (address, userUUID, token, isCloud, deviceSN, cookie) {
    super()

    this.address = address
    this.userUUID = userUUID
    this.token = token // local token to access station resource
    this.isCloud = isCloud
    this.deviceSN = deviceSN
    this.cookie = cookie

    this.update = (name, data, next) => { // update state, not emit
      this[name] = data
      if (typeof next === 'function') next()
    }

    this.state = {
      address,
      userUUID,
      token,
      deviceSN,
      update: this.update,
      isCloud: this.isCloud,
      request: this.request.bind(this),
      requestAsync: this.requestAsync.bind(this),
      pureRequest: this.pureRequest.bind(this),
      pureRequestAsync: this.pureRequestAsync.bind(this)
    }

    this.parseRes = (name, err, res, next) => {
      const { error, body } = parseRes(err, res)
      /* callback next */
      if (typeof next === 'function') next(error, body)
    }

    /* adapter of cloud apis */
    this.reqCloud = (ep, qsOrData, type, isFormdata) => {
      const url = `${cloudAddress}/station/${deviceSN}/json`
      const url2 = `${cloudAddress}/station/${deviceSN}/pipe`
      const data = {
        verb: type,
        urlPath: `/${ep}`,
        params: type === 'GET' ? (qsOrData || {}) : {},
        body: type === 'GET' ? {} : (qsOrData || {})
      }
      if (!isFormdata) return request.post(url).set('Authorization', this.token).set('cookie', this.cookie).send(data)

      /* mkdir, delete file */
      const qs = querystring.stringify({ data: JSON.stringify(data) })
      return request.post(`${url2}?${qs}`).set('Authorization', token).set('cookie', this.cookie)
    }
  }

  setState (name, nextState) {
    const state = this.state
    this.state = Object.assign({}, state, { [name]: nextState })
    this.emit('updated', state, this.state)
  }

  setRequest (name, props, f, next) {
    if (this[name]) {
      this[name].abort()
      this[name].removeAllListeners()
    }

    this[name] = new Request(props, f) // f: cb => r.end(cb)
    this[name].on('updated', (prev, curr) => {
      this.setState(name, curr)

      if (this[name].isFinished() && next) {
        if (this[name].isRejected()) next(this[name].reason())
        else next(null, this[name].value())
      }
    })

    // emit
    this.setState(name, this[name].state)
  }

  clearRequest (name) {
    if (this[name]) {
      this[name].abort()
      this[name].removeAllListeners()
      this[name] = null
      this.setState(name, null)
    }
  }

  aget (ep, qs) {
    if (this.isCloud) return this.reqCloud(ep, qs, 'GET')
    return request
      .get(`http://${this.address}:3000/${ep}`)
      .set('Authorization', `JWT ${this.token}`)
      .query(qs)
  }

  apost (ep, data, isFormdata) {
    if (this.isCloud) return this.reqCloud(ep, data, 'POST', isFormdata)
    const r = request
      .post(`http://${this.address}:3000/${ep}`)
      .set('Authorization', `JWT ${this.token}`)

    return typeof data === 'object'
      ? r.send(data)
      : r
  }

  apatch (ep, data) {
    if (this.isCloud) return this.reqCloud(ep, data, 'PATCH')
    const r = request
      .patch(`http://${this.address}:3000/${ep}`)
      .set('Authorization', `JWT ${this.token}`)

    return typeof data === 'object'
      ? r.send(data)
      : r
  }

  aput (ep, data) {
    if (this.isCloud) return this.reqCloud(ep, data, 'PUT')
    const r = request
      .put(`http://${this.address}:3000/${ep}`)
      .set('Authorization', `JWT ${this.token}`)

    return typeof data === 'object'
      ? r.send(data)
      : r
  }

  adel (ep, data) {
    if (this.isCloud) return this.reqCloud(ep, data, 'DELETE')
    const r = request
      .del(`http://${this.address}:3000/${ep}`)
      .set('Authorization', `JWT ${this.token}`)

    return typeof data === 'object'
      ? r.send(data)
      : r
  }

  request (name, args, next) {
    let r

    switch (name) {
      case 'getToken':
        if (this.isCloud) {
          r = this.aget('token')
        } else {
          r = request
            .get(`http://${this.address}:3000/token`)
            .auth(args.uuid, args.password)
            .set('Accept', 'application/json')
        }
        break

      case 'users':
        r = this.aget('users')
        break

      case 'drives':
        r = this.aget('drives')
        break

      case 'stats':
        r = this.aget('fruitmix/stats')
        break

      case 'boot':
        r = this.aget('boot')
        break

      case 'space':
        r = this.aget('boot/space')
        break

      /* account APIs */
      case 'account':
        r = this.aget(`users/${this.userUUID}`)
        break

      case 'updateAccount':
        r = this.apatch(`users/${this.userUUID}`, args)
        break

      case 'updatePassword':
        if (this.isCloud) { // connecting via Cloud, reset password
          r = this.aput(`users/${this.userUUID}/password`, { password: args.newPassword })
        } if (args.stationID) { // login via WeChat and connecting via LAN, rest password
          const url = `${cloudAddress}/c/v1/stations/${args.stationID}/json`
          const resource = Buffer.from(`/users/${this.userUUID}/password`).toString('base64')
          r = request.post(url).set('Authorization', args.token).send({ resource, method: 'PUT', password: args.newPassword })
        } else {
          r = request
            .put(`http://${this.address}:3000/users/${this.userUUID}/password`, { password: args.newPassword })
            .auth(this.userUUID, args.prePassword)
            .set('Accept', 'application/json')
        }
        break

      /* admins APIs */
      case 'adminUsers':
        r = this.aget('admin/users')
        break

      case 'adminUpdateUsers':
        r = this.apatch(`users/${args.userUUID}`, {
          isAdmin: args.isAdmin,
          disabled: args.disabled
        })
        break

      case 'adminCreateUser':
        r = this.apost('users', {
          username: args.username,
          password: args.password
        })
        break

      case 'adminCreateDrive':
        r = this.apost('drives', {
          label: args.label,
          writelist: args.writelist
        })
        break

      case 'adminUpdateDrive':
        r = this.apatch(`drives/${args.uuid}`, {
          label: args.label,
          writelist: args.writelist
        })
        break

      case 'adminDeleteDrive':
        r = this.adel(`drives/${args.uuid}`)
        break

      /* File APIs */
      case 'listDir':
        r = this.aget(`drives/${args.driveUUID}`)
        break

      case 'listNavDir':
        r = this.aget(`drives/${args.driveUUID}/dirs/${args.dirUUID}`, { metadata: 'true' })
        break

      case 'phyDrives':
        r = this.aget('phy-drives', { usage: 'true' })
        break

      case 'listPhyDir':
        r = this.aget(`phy-drives/${args.id}`, { path: args.path })
        break

      case 'mkdir':
        r = this.apost(`drives/${args.driveUUID}/dirs/${args.dirUUID}/entries`, null, true)
          .field(args.dirname, JSON.stringify({ op: 'mkdir' }))
        break

      case 'mkPhyDir':
        if (this.isCloud) {
          r = this.apost(`phy-drives/${args.id}`, null, true)
            .field('prelude', JSON.stringify({ id: args.id, path: args.path }))
            .field('directory', args.dirname)
        } else {
          r = this.apost(`phy-drives/${args.id}?${querystring.stringify({ path: args.path })}`).field('directory', args.dirname)
        }
        break

      case 'renameDirOrFile':
        r = this.apost(`drives/${args.driveUUID}/dirs/${args.dirUUID}/entries`, null, true)
          .field(`${args.oldName}|${args.newName}`, JSON.stringify({ op: 'rename' }))
        break

      case 'renamePhyDirOrFile':
        r = this.apatch(`phy-drives/${args.id}`, { oldPath: args.oldPath, newPath: args.newPath })
        break

      case 'deleteDirOrFile':
        r = this.apost(`drives/${args[0].driveUUID}/dirs/${args[0].dirUUID}/entries`, null, true)
        for (let i = 0; i < args.length; i++) {
          r.field(args[i].entryName, JSON.stringify({ op: 'remove', uuid: args[i].entryUUID }))
        }
        break

      case 'deletePhyDirOrFile':
        r = this.isCloud ? this.adel(`phy-drives/${args.id}`, args.qs, true)
          : this.adel(`phy-drives/${args.id}?${querystring.stringify(args.qs)}`)
        break

      case 'dupFile':
        r = this.apost(`drives/${args.driveUUID}/dirs/${args.dirUUID}/entries`, null, true)
          .field(`${args.oldName}|${args.newName}`, JSON.stringify({ op: 'dup' }))
        break

      case 'task':
        r = this.aget(`tasks/${args.taskUUID}`)
        break

      /* Media API */
      case 'photos':
        r = this.aget('files', { class: 'image', places: args.places })
        break

      case 'music':
        r = this.aget('files', { class: 'audio', places: args.places })
        break

      case 'docs':
        r = this.aget('files', { class: 'document', places: args.places })
        break

      case 'videos':
        r = this.aget('files', { class: 'video', places: args.places })
        break

      /* device api */
      case 'device':
        r = this.aget('device')
        break

      case 'cpus':
        r = this.aget('device/cpuInfo')
        break

      case 'network':
        r = this.aget('device/net')
        break

      case 'memory':
        r = this.aget('device/memInfo')
        break

      case 'power':
        r = this.apatch('boot', { state: args.state })
        break

      case 'speed':
        r = this.aget('device/speed')
        break

      case 'sleep':
        r = this.aget('device/sleep')
        break

      /* Plugin API */
      case 'samba':
        r = this.aget('samba')
        break

      case 'dlna':
        r = this.aget('dlna')
        break

      case 'pt':
        if (this.isCloud) r = this.reqCloud('platinum', null, 'GET')
        else r = request.get(`http://${this.address}:3001/v1/platinum`)
        break

      default:
        break
    }

    if (!r) console.error(`no request handler found for ${name}`)
    else this.setRequest(name, args, cb => r.end(cb), next)
  }

  async requestAsync (name, args) {
    return Promise.promisify(this.request).bind(this)(name, args)
  }

  pureRequest (name, args, next) {
    let r
    let qs
    switch (name) {
      /* file api */
      case 'drive':
        r = this.aget(`drives/${args.driveUUID}`)
        break

      case 'updateDrive':
        r = this.apatch(`drives/${args.driveUUID}`, args.attr)
        break

      case 'listNavDir':
        r = this.aget(`drives/${args.driveUUID}/dirs/${args.dirUUID}`, { metadata: 'true', counter: 'true' })
        break

      case 'delBackupFileOrDir':
        r = this.apost(`drives/${args.driveUUID}/dirs/${args.dirUUID}/entries`)
          .field(args.name, JSON.stringify(args.hash ? { op: 'remove', uuid: args.uuid, hash: args.hash } : { op: 'remove' }))
        break

      case 'content':
        r = this.aget(`drives/${args.driveUUID}/dirs/${args.dirUUID}/stats`)
        break

      case 'users':
        r = this.aget('users')
        break

      case 'search':
        qs = { name: args.name, namepath: 'true' }
        if (args.order) Object.assign(qs, { order: args.order })
        if (args.places) Object.assign(qs, { places: args.places })
        if (args.types) Object.assign(qs, { types: args.types })
        r = this.aget('files', qs)
        break

      case 'phySearch':
        r = this.aget(`phy-drives/${args.id}`, { name: args.name })
        break

      case 'randomSrc':
        r = this.aget(`media/${args.hash}`, { alt: 'random' })
        break

      case 'setLANPassword':
        if (this.isCloud) {
          r = this.apatch(`users/${this.userUUID}`, { password: args.password, encrypted: false })
        } else {
          r = request
            .patch(`http://${this.address}:3000/users/${this.userUUID}`, { password: args.newPwd })
            .auth(this.userUUID, args.prePwd)
            .set('Accept', 'application/json')
        }
        break

      case 'createBackupDrive':
        r = this.apost('drives', {
          op: 'backup',
          label: args.label,
          client: {
            id: args.machineId,
            type: args.type,
            disabled: false,
            lastBackupTime: 0,
            status: 'Idle'
          }
        })
        break

      /* task api */
      case 'copy':
        r = this.apost('tasks', args)
        break

      case 'tasks':
        r = this.aget('tasks')
        break

      case 'task':
        r = this.aget(`tasks/${args.uuid}`)
        break

      case 'deleteTask':
        r = this.adel(`tasks/${args.uuid}`)
        break

      case 'handleTask':
        r = this.apatch(`tasks/${args.taskUUID}/nodes/${args.nodeUUID}`, { policy: args.policy })
        break

      case 'updateDlna':
        r = this.apatch('dlna', { op: args.op })
        break

      case 'updatePT':
        if (this.isCloud) r = this.reqCloud('platinum', { status: args.status }, 'POST')
        else r = request.post(`http://${this.address}:3001/v1/platinum`, { status: args.status })
        break

      case 'sambaStatus':
        r = this.apatch('samba', { op: args.op })
        break

      case 'sambaEncrypted':
        r = this.apatch(`drives/${args.driveUUID}`, { smb: args.encrypted })
        break

      case 'sambaPwd':
        r = this.apatch(`users/${this.userUUID}`, { smbPassword: args.pwd })
        break

      case 'unBindVolume':
        r = this.adel('boot/boundVolume', { format: args.format, reset: args.reset })
        break

      case 'removeData':
        r = this.apatch(`drives/${args.driveUUID}/dirs/${args.driveUUID}`, { op: 'format' })
        break

      case 'ejectUSB':
        r = this.apatch(`phy-drives/${args.id}`, { op: 'eject' })
        break

      case 'modifySleep':
        r = this.apatch('device/sleep', args)
        break

      case 'firmwareFetch':
        r = request.get(`http://${this.address}:3001/v1/firmwareFetch`)
          .set('Authorization', `JWT ${this.token}`)
        break

      case 'firmwareReady':
        r = request.get(`http://${this.address}:3001/v1/firmwareReady`)
          .set('Authorization', `JWT ${this.token}`)
        break

      case 'firmwareUpgrade':
        r = request.post(`http://${this.address}:3001/v1/firmwareUpgrade`)
          .set('Authorization', `JWT ${this.token}`)
        break

      default:
        break
    }

    if (!r) console.error(`no request handler found for ${name}`)
    else {
      r.end((err, res) => this.parseRes(name, err, res, next))
    }
  }

  async pureRequestAsync (name, args) {
    return Promise.promisify(this.pureRequest).bind(this)(name, args)
  }

  start () {
    this.request('account')
    this.request('users')
    this.request('stats')
    this.request('device')
    this.requestAsync('drives').then((drives) => {
      const drive = drives.find(d => d.tag === 'home')
      setTimeout(() => this.request('listNavDir', { driveUUID: drive.uuid, dirUUID: drive.uuid }), 450)
    }).catch((err) => {
      console.error('requestAsync drives error', err)
    })
  }
}

export default Fruitmix
