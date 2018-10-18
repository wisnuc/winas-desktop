import Promise from 'bluebird'
import request from 'superagent'

import parseRes from './parseRes'
import RequestManager from './reqman'

const phiCloudAddress = process.env.CLOUD_TEST === 'dev' ? 'https://sohon2dev.phicomm.com' : 'https://sohon2test.phicomm.com'

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
      if (name === 'token' && !error && body) this.token = body.access_token

      /* callback next */
      if (typeof next === 'function') next(error, body)
    }
  }

  aget (ep) {
    return request
      .get(`${phiCloudAddress}/${ep}`)
      .set('Content-Type', 'application/json')
      .set('Authorization', this.token)
  }

  apost (ep, data) {
    const r = request
      .post(`${phiCloudAddress}/${ep}`)
      .set('Content-Type', 'application/json')
      .set('Authorization', this.token)

    return typeof data === 'object' ? r.send(data) : r
  }

  apatch (ep, data) {
    const r = request
      .patch(`${phiCloudAddress}/${ep}`)
      .set('Content-Type', 'application/json')
      .set('Authorization', this.token)

    return typeof data === 'object' ? r.send(data) : r
  }

  adel (ep, data) {
    const r = request
      .del(`${phiCloudAddress}/${ep}`)
      .set('Content-Type', 'application/json')
      .set('Authorization', this.token)

    return typeof data === 'object' ? r.send(data) : r
  }

  command (deviceSN, data) {
    return request
      .post(`${phiCloudAddress}/ResourceManager/app/pipe/command`)
      .set('Content-Type', 'application/json')
      .set('Authorization', this.token)
      .send({ deviceSN, data })
  }

  req (name, args, next) {
    let r
    switch (name) {
      case 'authorizationcode':
        r = request
          .get(`${phiCloudAddress}/v1/authorization`)
          .query({ client_id: '2149773', client_secret: 'FA35C1A18F830497AF75BD2636E54CBD', response_type: 'code', scope: 'read' })
        break

      case 'token':
        r = request
          .post(`${phiCloudAddress}/v1/login`)
          .timeout({
            response: 30000, // Wait 30 seconds for the server to start sending,
            deadline: 60000 // but allow 1 minute for the file to finish loading.
          })
          .query({
            authorizationcode: 'feixun*123.SH_2149773',
            phonenumber: args.phonenumber,
            password: args.password
          })
        break

      case 'client':
        r = request
          .get(`${phiCloudAddress}/nasUpdate/client/getVersionInfo`)
          .set({ license: '2f12ac5dda730dd34c180825919a123bec8309c8807d494b9a8d92f80fd665ee' })
        break

      case 'stationList':
        r = this.aget('StationManager/station')
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

      case 'registerPhiUser':
        r = this.apost(
          'StationManager/relation/invitation/pre',
          { deviceSN: args.deviceSN, phoneNumber: args.phoneNumber, inviteeNickname: args.nickName }
        )
        break

      case 'invitation':
        r = this.apatch('StationManager/relation/invitation', { deviceSN: args.deviceSN, accept: args.accept })
        break

      case 'newUser':
        r = this.command(
          args.deviceSN,
          {
            verb: 'POST',
            urlPath: '/users',
            params: {},
            body: { username: args.username, phicommUserId: args.phicommUserId, phoneNumber: args.phoneNumber }
          }
        )
        break

      case 'activeUser':
        r = this.command(
          args.deviceSN,
          {
            verb: 'PATCH',
            urlPath: `/users/${args.uuid}`,
            params: {},
            body: { status: 'ACTIVE' }
          }
        )
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

      case 'deleteUser':
        r = this.command(args.deviceSN, { verb: 'DELETE', urlPath: `/users/${args.uuid}`, params: {}, body: {} })
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

      case 'pt':
        r = this.command(args.deviceSN, {
          verb: 'GET', urlPath: `/platinum`, params: {}, body: {}
        })
        break

      case 'updatePT':
        r = this.command(args.deviceSN, {
          verb: 'POST', urlPath: `/platinum`, params: {}, body: { status: args.status }
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
