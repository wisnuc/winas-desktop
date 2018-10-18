const os = require('os')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))

const xattr = Promise.promisifyAll(os.platform() === 'win32' ? require('fs-ads') : require('fs-xattr')) // eslint-disable-line

const FRUITMIX = 'user.phinas02'

const readXattrAsync = async (target) => {
  let attr
  try {
    attr = JSON.parse(await xattr.getAsync(target, FRUITMIX))
  } catch (e) {
    /* may throw xattr ENOENT or JSON SyntaxError */
    if (e && !['ENOENT', 'ENODATA'].includes(e.code)) console.error('readXattrAsync error: ', e.code || e)
  }
  const stats = await fs.lstatAsync(target)
  const htime = stats.mtime.getTime()
  if (attr && attr.htime && attr.htime === htime && attr.size === stats.size) return attr
  return null
}

const readXattr = (target, callback) => {
  readXattrAsync(target).then(attr => callback(null, attr)).catch(error => callback(error))
}

const setXattrAsync = async (target, attr) => {
  const stats = await fs.lstatAsync(target)
  const htime = Math.round(stats.mtime.getTime() / 1000) * 1000
  const size = stats.size
  const newAttr = Object.assign({}, attr, { htime, size })
  try {
    await xattr.setAsync(target, FRUITMIX, JSON.stringify(newAttr))
    await fs.utimesAsync(target, stats.atime, new Date(htime))
  } catch (e) {
    console.error(target, 'setXattrAsync error: ', e.code || e)
  }
  return newAttr
}

const setXattr = (target, attr, callback) => {
  setXattrAsync(target, attr).then(na => callback(null, na)).catch(error => callback(error))
}

module.exports = { readXattrAsync, readXattr, setXattrAsync, setXattr }
