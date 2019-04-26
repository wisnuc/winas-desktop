import Promise from 'bluebird'
import request from 'superagent'

import parseRes from './parseRes'
import RequestManager from './reqman'

const cloudAddress = 'https://test.nodetribe.com/c/v1'

class PhiAPI extends RequestManager {
  constructor () {
    super()
    this.state = {
      req: this.req.bind(this),
      reqAsync: this.reqAsync.bind(this)
    }

    this.setRequest = (name, err, res, next) => {
      const { error, body } = parseRes(err, res)

      /* save phi token */
      if ((name === 'token' || name === 'wechatToken') && !error && body) this.token = body.token
      const isGetList = (name === 'stationList') && !error && body
      if (isGetList) {
        this.cookie = res && res.header && res.header['set-cookie'] && res.header['set-cookie'][0]
      }

      if (typeof next !== 'function') return

      /* callback next */
      if (isGetList) {
        next(error, body, this.cookie)
      } else next(error, body)
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
      .set('cookie', this.cookie)
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

      case 'checkUser':
        r = request
          .get(`${cloudAddress}/user/phone/check`)
          .query({ phone: args.phone })
        break

      case 'token':
        r = request
          .get(`${cloudAddress}/user/password/token`)
          .timeout({
            response: 30000, // Wait 30 seconds for the server to start sending,
            deadline: 30000 // but allow 1 minute for the file to finish loading.
          })
          .query({
            clientId: args.clientId || 'qwert',
            type: 'pc',
            username: args.phonenumber,
            password: args.password
          })
        break

      case 'wechatToken':
        r = request
          .get(`${cloudAddress}/wechat/token`)
          .timeout({
            response: 30000, // Wait 30 seconds for the server to start sending,
            deadline: 30000 // but allow 1 minute for the file to finish loading.
          })
          .query({
            type: 'pc',
            code: args.code,
            loginType: 'web',
            clientId: args.clientId || 'qwert'
          })
        break

      case 'stationList':
        r = this.aget('station')
          .timeout({
            response: 30000, // Wait 30 seconds for the server to start sending,
            deadline: 30000 // but allow 1 minute for the file to finish loading.
          })
        break

      case 'setLastSN':
        r = this.apost('user/deviceInfo', { sn: args.sn })
        break

      case 'emailCode':
        r = this.apost('user/mailCode', { mail: args.email, type: 'bind' })
        break

      case 'bindEmail':
        r = this.apost('user/mail', { mail: args.email, code: args.code })
        break

      case 'setAvatar':
        r = request
          .put(`${cloudAddress}/user/avatar`)
          .set('Content-Type', 'application/octet-stream')
          .set('Authorization', this.token)
          .send(args)
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

      case 'space':
        r = this.command(args.deviceSN, { verb: 'GET', urlPath: '/boot/space', params: {}, body: {} })
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

  testLAN (ip, cb) {
    request
      .get(`http://${ip}:3001/winasd/info`)
      .set('Content-Type', 'application/json')
      .timeout({
        response: 2000, // Wait 1 seconds for the server to start sending,
        deadline: 2000 // but allow 1 minute for the file to finish loading.
      })
      .end(cb)
  }

  async testLANAsync (ip) {
    return Promise.promisify(this.testLAN).bind(this)(ip)
  }
}

export default PhiAPI
