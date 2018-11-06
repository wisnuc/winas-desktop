const parseRes = (err, res) => {
  if (process.env.NODE_ENV === 'dev') console.log('handleReq req raw', err, res)
  let error = err
  let body
  if (!error) {
    body = (res && res.body) || {}

    /* handle response in res.text */
    if (!Object.keys(body).length && res.text) {
      try {
        body = JSON.parse(res.text)
      } catch (e) {
        error = new Error('JSON parse error')
      }
    } else {
      body = (res && res.body) || {}
    }

    /* handle cloud error */
    if (body && body.error && body.error !== '0' && body.msg) error = body

    /* handle data from pipe command */
    if (body && body.data) {
      error = body.data.error
      body = body.data || {}
    }
  }
  return ({ error, body })
}

module.exports = parseRes
