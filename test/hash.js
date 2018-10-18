/*
 * usage: node hash.js fileToUpload
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const querystring = require('querystring')

const file = path.resolve(process.argv[2])
const size = fs.lstatSync(file).size

/* splice file by given size */
const spliceFile = (size, perSize) => {
  const parts = []

  /* empty file */
  if (size === 0) {
    parts.push({ start: 0, end: -1 })
    return parts
  }

  let position = 0
  while (position < size) {
    if (position + perSize >= size) {
      parts.push({ start: position, end: size - 1 })
      break
    } else {
      parts.push({ start: position, end: position + perSize - 1 })
      position += perSize
    }
  }
  return parts
}

/* calculate file's hash by part */
const hashFile = (filePath, part) => {
  const hash = crypto.createHash('sha256')
  hash.setEncoding('hex')
  const fileStream = fs.createReadStream(filePath, { start: part.start, end: Math.max(part.end, 0) }, { highWaterMark: 4194304 })
  const promise = new Promise((resolve, reject) => {
    fileStream.on('end', () => {
      hash.end()
      resolve(hash.read())
    })
    fileStream.on('error', reject)
  })
  fileStream.pipe(hash)
  return promise
}

/* calculate file's fingerprint */
const calcFingerprint = (hashs) => {
  const hashBuffer = hashs.map(hash => (typeof hash === 'string' ? Buffer.from(hash, 'hex') : hash))
  return hashBuffer.reduce((accumulator, currentValue, currentIndex) => {
    if (!currentIndex) {
      accumulator.push(currentValue.toString('hex'))
    } else {
      const hash = crypto.createHash('sha256')
      hash.update(Buffer.from(accumulator[currentIndex - 1], 'hex'))
      hash.update(currentValue)
      const digest = hash.digest('hex')
      accumulator.push(digest)
    }
    return accumulator
  }, [])
}

const hashFileAsync = async (absPath, size, partSize) => {
  const parts = spliceFile(size, partSize)
  const promises = parts.map(part => hashFile(absPath, part))
  const hashs = await Promise.all(promises)
  const fp = calcFingerprint(hashs)
  const newParts = parts.map((part, index) => Object.assign(
    {},
    part,
    { sha: hashs[index], fingerprint: fp[index] },
    index ? { target: fp[index - 1] } : {}
  ))
  // console.log('hashFileAsync', newParts)
  return newParts
}

const cloudAddress = 'http://sohon2dev.phicomm.com'

const deviceSN = '1plp0panrup3aaaa'

const reqCloud = (ep) => {
  const data = {
    verb: 'POST',
    urlPath: `/${ep}`,
    params: {},
    body: {}
  }

  const qs = querystring.stringify({ deviceSN, data: JSON.stringify(data) })
  const url = `${cloudAddress}/ResourceManager/app/pipe/resource?${qs}`
  return url
}

const fire = async () => {
  const parts = await hashFileAsync(file, size, 1024 * 1024 * 1024)
  const formDataOptions = {
    op: 'newfile',
    size: parts[0].end - parts[0].start + 1,
    sha256: parts[0].sha
  }
  console.log('fileName: \n', JSON.stringify(formDataOptions))
  const url = reqCloud('drives/645796d5-81be-4a5b-aa33-f28efd8936b8/dirs/645796d5-81be-4a5b-aa33-f28efd8936b8/entries')
  console.log('POST URL\n', url)
  // const readStreams = parts.map(p => fs.createReadStream(file, { start: p.start, end: Math.max(p.end, 0), autoClose: true }))
  // await reqAsync(parts, readStreams)
}

fire().then(() => {}).catch(e => console.error('fire error', e))
