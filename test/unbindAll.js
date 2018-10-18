const request = require('superagent')
const Promise = require('bluebird')
const MD5 = require('md5')

const phiCloudAddress = 'sohon2test.phicomm.com'

// console.log(process.argv)

const phonenumber = process.argv.find((arg, idx, arr) => (idx && arr[idx - 1] === '--phone-number'))
const password = process.argv.find((arg, idx, arr) => (idx && arr[idx - 1] === '--password'))

/*
const phonenumber = '18817301665'
const password = '123456'
*/
if (!phonenumber || !password) {
  console.log('!!!Error: no phonenumber && password !\n')
  console.log('script template:\n')
  console.log('  node unbindAll.js --phone-number 15888524760 --password 123456\n')
  process.exit(0)
}

const handleRes = (err, res, next) => {
  if (typeof next === 'function') {
    let error = err
    let body
    if (!error) {
      body = res && res.body
      if (!Object.keys(body).length) {
        try {
          body = JSON.parse(res.text)
        } catch (e) {
          error = new Error('JSON parse error')
        }
      } else {
        body = res && res.body
      }
    }
    next(err, body)
  } else console.error('no next')
}

const getToken = (args, next) => {
  request
    .post(`http://${phiCloudAddress}/v1/login`)
    .query({
      authorizationcode: 'feixun*123.SH_2149773',
      phonenumber: args.phonenumber,
      password: MD5(args.password).toUpperCase()
    })
    .end((err, res) => handleRes(err, res, next))
}

const getTokenAsync = Promise.promisify(getToken)

const getList = (args, next) => {
  request
    .get(`http://${phiCloudAddress}/StationManager/station`)
    .set('Content-Type', 'application/json')
    .set('Authorization', `${args.token}`)
    .end((err, res) => handleRes(err, res, next))
}

const getListAsync = Promise.promisify(getList)

const unbindStation = (args, next) => {
  request
    .del(`http://${phiCloudAddress}/StationManager/relation/binding`)
    .set('Content-Type', 'application/json')
    .set('Authorization', args.token)
    .send({ deviceSN: args.deviceSN })
    .end((err, res) => handleRes(err, res, next))
}

const unbindStationAsync = Promise.promisify(unbindStation)

const fire = async () => {
  const token = (await getTokenAsync({ phonenumber, password })).access_token
  // console.log('tokenRes', token)
  const list = (await getListAsync({ token })).result.list
  console.log('listRes\n', list)
  for (let i = 0; i < list.length; i++) {
    const deviceSN = list[i].deviceSN
    console.log(deviceSN)
    // if (list[i].onlineStatus !== 'online') await unbindStationAsync({ token, deviceSN })
    await unbindStationAsync({ token, deviceSN })
  }
  return list.length
}

fire().then((len) => console.log('unbind success, number:', len)).catch(e => console.error('unbind failed', e))
