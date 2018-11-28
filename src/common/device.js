import Promise from 'bluebird'
import request from 'superagent'
import RequestManager from './reqman'

/**

  it should not emit anything in constructor, for there is no chance to
  add listeners.

  start is necessary for adding listeners before calling start and after
  constructor.

  emission may happen DURING calling start. So functions and observers must
  NOT think some reqs is always there. It may be null.

**/
class Device extends RequestManager {
  /* the common way to solve this problem is to use a separate method to trigger actions */
  constructor (mdev) {
    super()

    this.mdev = mdev

    this.firstRefresh = true

    this.boot = null

    // immutable
    this.state = {
      // static data
      mdev: this.mdev,

      // methods
      request: this.request.bind(this),
      requestAsync: this.requestAsync.bind(this),
      pureRequest: this.pureRequest.bind(this),
      pureRequestAsync: this.pureRequestAsync.bind(this),
      systemStatus: this.systemStatus.bind(this),
      refreshSystemState: this.refreshSystemState.bind(this)
    }
  }

  request (name, args, next) {
    let r

    const resTime = process.env.CONN_MODE === 'remote' ? 5 : 5000
    switch (name) {
      case 'info':
        r = request
          .get(`http://${this.mdev.address}:3001/info`)
          .timeout({
            response: resTime, // Wait 5 seconds for the server to start sending,
            deadline: 60000 // but allow 1 minute for the file to finish loading.
          })
        break

      case 'boot':
        r = request
          .get(`http://${this.mdev.address}:3000/boot`)
          .timeout({
            response: resTime, // Wait 5 seconds for the server to start sending,
            deadline: 60000 // but allow 1 minute for the file to finish loading.
          })
        break

      case 'space':
        r = request
          .get(`http://${this.mdev.address}:3000/boot/space`)
          .timeout({
            response: resTime, // Wait 5 seconds for the server to start sending,
            deadline: 60000 // but allow 1 minute for the file to finish loading.
          })
        break

      case 'device':
        r = request
          .get(`http://${this.mdev.address}:3000/device`)
        break

      case 'cpus':
        r = request
          .get(`http://${this.mdev.address}:3000/device/cpuInfo`)
        break

      case 'network':
        r = request
          .get(`http://${this.mdev.address}:3000/device/net`)
        break

      case 'memory':
        r = request
          .get(`http://${this.mdev.address}:3000/device/memInfo`)
        break

      case 'updatePT':
        r = request
          .post(`http://${this.mdev.address}:3001/v1/platinum`, { status: args.status })
        break

      case 'users':
        r = request
          .get(`http://${this.mdev.address}:3000/users`)
          .timeout({
            response: resTime, // Wait 5 seconds for the server to start sending,
            deadline: 60000 // but allow 1 minute for the file to finish loading.
          })
        break

      case 'boundVolume':
        r = request
          .post(`http://${this.mdev.address}:3000/boot/boundVolume`)
          .send({ target: args.target, mode: args.mode })
        break

      case 'repairVolume':
        r = request
          .patch(`http://${this.mdev.address}:3000/boot/boundVolume`)
          .send({ op: 'repair', value: { devices: args.devices, mode: args.mode } })
        break

      case 'extendVolume':
        r = request
          .patch(`http://${this.mdev.address}:3000/boot/boundVolume`)
          .send({ op: 'add', value: { devices: args.devices, mode: args.mode } })
        break

      case 'importVolume':
        r = request
          .put(`http://${this.mdev.address}:3000/boot/boundVolume`)
          .send({ volumeUUID: args.volumeUUID })
        break

      case 'token':
        r = request
          .get(`http://${this.mdev.address}:3000/token`)
          .auth(args.uuid, args.password)
          .set('Accept', 'application/json')
        break

      case 'firm':
        r = request
          .get(`http://${this.mdev.address}:3001/v1`)
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
    switch (name) {
      /* bootstrap */
      case 'installAppifi':
        r = request
          .put(`http://${this.mdev.address}:3001/v1/app`)
          .send({ tagName: args.tagName })
        break

      case 'handleAppifi':
        r = request
          .patch(`http://${this.mdev.address}:3001/v1/app`)
          .send({ state: args.state })
        break

      case 'handleRelease':
        r = request
          .patch(`http://${this.mdev.address}:3001/v1/releases/${args.tagName}`)
          .send({ state: args.state })
        break

      case 'checkUpdates':
        r = request
          .patch(`http://${this.mdev.address}:3001/v1/fetch`)
          .send({ state: 'Working' })
        break

      case 'firm':
        r = request
          .get(`http://${this.mdev.address}:3001/v1`)
        break

      default:
        break
    }

    if (!r) console.error(`no request handler found for ${name}`)
    else r.end((err, res) => (typeof next === 'function') && next(err, res && res.body))
  }

  async pureRequestAsync (name, args) {
    return Promise.promisify(this.pureRequest).bind(this)(name, args)
  }

  start () {
    this.refreshSystemState(() => process.env.NODE_ENV === 'dev' && console.log(this.mdev.address, 'started', this))
  }

  refreshSystemState (next) {
    let count = 4
    const done = next ? () => !(count -= 1) && next() : undefined
    this.request('info', null, done)
    this.request('boot', null, done)
    this.request('users', null, done)
    this.request('space', null, done)
  }

  async refreshSystemStateAsync () {
    return Promise.promisify(this.refreshSystemState).bind(this)()
  }

  refreshLater () {
    if (this.refreshing) return
    this.refreshing = true
    setTimeout(() => {
      this.refreshSystemState()
      this.refreshing = false
    }, 3000)
  }

  /**
   probing -> wait
   offline -> not in LAN
   systemError -> error
   noBoundUser -> can bind user
   noBoundVolume -> can format disk and bind volume
   ready -> normal state, can login
   booting -> retry request api
  **/

  systemStatus () {
    if (['info', 'boot', 'users', 'space'].some(v => (!this[v] || this[v].isPending()))) return 'probing'
    else if (this.info.isRejected()) return 'offline'
    const info = this.info.value()

    /* make sure the same deviceSN */
    if (this.mdev.deviceSN && info && info.device && info.device.sn && (this.mdev.deviceSN !== info.device.sn)) return 'offline'
    if (this.boot.isRejected()) return 'systemError'

    const boot = this.boot.value()
    const users = this.users && !this.users.isRejected() && this.users.value()

    const states = ['PROBING', 'PROBEFAILED', 'PENDING', 'PRESETTING', 'STARTING', 'STARTED',
      'UNAVAILABLE', 'INITIALIZING', 'IMPORTING', 'REPAIRING']

    if (!boot || !states.includes(boot.state)) return 'systemError'

    const { state, boundUser } = boot

    /* assign deviceSN */
    if (info && info.deviceSN && !this.mdev.deviceSN) Object.assign(this.mdev, { deviceSN: info.deviceSN })
    const mac = info && info.net && info.net.networkInterface && info.net.networkInterface.mac
    if (mac && !this.mdev.mac) Object.assign(this.mdev, { mac })

    if (state === 'PENDING' && !boundUser) return 'noBoundUser'
    else if (state === 'UNAVAILABLE' && boundUser) return 'noBoundVolume'
    else if (state === 'STARTED' && Array.isArray(users)) return 'ready'
    else if (['PENDING', 'UNAVAILABLE', 'STARTED', 'PROBEFAILED'].includes(state)) return 'systemError'

    /* treat other state as booting and refresh 2000ms later */
    this.refreshLater()
    return 'booting'
  }
}

export default Device
