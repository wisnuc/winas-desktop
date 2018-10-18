import UUID from 'uuid'
import Promise from 'bluebird'
import { ipcRenderer } from 'electron'

const sort = (pre) => {
  let mdns = pre
  if (!global.config || !global.config.global.lastDevice) return mdns
  const lastHost = global.config.global.lastDevice.host
  const lastAddress = global.config.global.lastDevice.address
  const lastLANIP = global.config.global.lastDevice.lanip
  const index = mdns.findIndex(m => (m.host === lastHost || m.address === lastAddress || m.address === lastLANIP))
  if (index > -1) {
    mdns = [mdns[index], ...mdns.slice(0, index), ...mdns.slice(index + 1)]
  }
  return mdns
}

class MDNS {
  constructor () {
    this.store = []
    this.session = undefined

    this.handleUpdate = (event, session, device) => {
      /* discard out-dated session data */
      if (this.session !== session) return

      /* discard existing result */
      if (this.store.find(dev => dev.host === device.host)) return
      this.store.push(device)
    }

    ipcRenderer.on('MDNS_UPDATE', this.handleUpdate)
  }

  scan () {
    this.session = UUID.v4()
    this.store.length = 0
    ipcRenderer.send('MDNS_SCAN', this.session)
  }

  get () {
    return sort(this.store)
  }
}

const reqMdns = async (delay) => {
  const mdns = new MDNS()
  mdns.scan()
  await Promise.delay(delay || 500)
  return mdns.get()
}

export default reqMdns
