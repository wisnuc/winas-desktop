import Promise from 'bluebird'
import request from 'superagent'

import parseRes from './parseRes'
import RequestManager from './reqman'

const cloudAddress = 'https://abel.nodetribe.com/c/v1'

class PhiAPI extends RequestManager {
  constructor () {
    super()
    this.state = {
      req: this.req.bind(this),
      reqAsync: this.reqAsync.bind(this)
    }

    this.setRequest = (name, err, res, next) => {
      console.log(name, err, res, res.body)
      const { error, body } = parseRes(err, res)

      /* save phi token */
      if (name === 'token' && !error && body) this.token = body.token

      /* callback next */
      if (typeof next === 'function') next(error, body)
    }
  }

  aget (ep) {
    return request
      .get(`${cloudAddress}/${ep}`)
      .set('Content-Type', 'application/json')
      .set('Authorization', this.token)
  }

  apost (ep, data) {
    const r = request
      .post(`${cloudAddress}/${ep}`)
      .set('Content-Type', 'application/json')
      .set('Authorization', this.token)

    return typeof data === 'object' ? r.send(data) : r
  }

  apatch (ep, data) {
    const r = request
      .patch(`${cloudAddress}/${ep}`)
      .set('Content-Type', 'application/json')
      .set('Authorization', this.token)

    return typeof data === 'object' ? r.send(data) : r
  }

  adel (ep, data) {
    const r = request
      .del(`${cloudAddress}/${ep}`)
      .set('Content-Type', 'application/json')
      .set('Authorization', this.token)

    return typeof data === 'object' ? r.send(data) : r
  }

  command (deviceSN, data) {
    return request
      .post(`${cloudAddress}/station/${deviceSN}/json`)
      .set('Content-Type', 'application/json')
      .set('Authorization', this.token)
      .send(data)
  }

  req (name, args, next) {
    let r
    switch (name) {
      case 'authorizationcode':
        r = request
          .get(`${cloudAddress}/user/smsCode`)
          .query({ phone: args.phone })
        break

      case 'token':
        r = request
          .get(`${cloudAddress}/user/token`)
          .timeout({
            response: 30000, // Wait 30 seconds for the server to start sending,
            deadline: 60000 // but allow 1 minute for the file to finish loading.
          })
          .query({
            clientId: args.clientId || 'qwert',
            type: 'pc',
            username: args.phonenumber,
            password: args.password
          })
        break

      case 'stationList':
        r = this.aget('station')
          .timeout({
            response: 30000, // Wait 30 seconds for the server to start sending,
            deadline: 60000 // but allow 1 minute for the file to finish loading.
          })
        break

      case 'bindDevice':
        r = this.apost('StationManager/relation/binding', { deviceSN: args.deviceSN })
        break

      case 'unbindStation':
        r = this.adel('StationManager/relation/binding', { deviceSN: args.deviceSN })
        break

      case 'getBindState':
        r = this.aget('StationManager/relation/binding')
          .query({ deviceSN: args.deviceSN })
        break

      case 'renameStation':
        r = this.apatch('StationManager/station/info', { deviceSN: args.deviceSN, deviceInfo: { bindingName: args.newName } })
        break

      case 'cloudUsers':
        r = this.aget('StationManager/station/users')
          .query({ deviceSN: args.deviceSN })
        break

      case 'boot':
        r = this.command(args.deviceSN, { verb: 'GET', urlPath: '/boot', params: {}, body: {} })
        break

      case 'localUsers':
        r = this.command(args.deviceSN, { verb: 'GET', urlPath: '/users', params: {}, body: {} })
        break

      case 'drives':
        r = this.command(args.deviceSN, { verb: 'GET', urlPath: '/drives', params: {}, body: {} })
        break

      case 'LANToken':
        r = this.command(args.deviceSN, { verb: 'GET', urlPath: '/token', params: {}, body: {} })
        break

      case 'setLANPassword':
        r = this.command(args.deviceSN, {
          verb: 'PATCH', urlPath: `/users/${args.userUUID}`, params: {}, body: { password: args.password, encrypted: false }
        })
        break

      case 'sambaPwd':
        r = this.command(args.deviceSN, {
          verb: 'PATCH', urlPath: `/users/${args.userUUID}`, params: {}, body: { smbPassword: args.pwd }
        })
        break

      default:
        break
    }

    if (!r) console.error(`no request handler found for ${name}`)
    else r.end((err, res) => this.setRequest(name, err, res, next))
  }

  async reqAsync (name, args) {
    return Promise.promisify(this.req).bind(this)(name, args)
  }
}

export default PhiAPI
