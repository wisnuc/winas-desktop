const prettySize = (size) => {
  const s = parseFloat(size, 10)
  if (!s || s < 0) return '0 字节'
  if (s === 1) return '1 字节'
  if (s < 1024) return `${s} 字节`
  else if (s < (1024 * 1024)) return `${(s / 1024).toFixed(2)} KB`
  else if (s < (1024 * 1024 * 1024)) return `${(s / 1024 / 1024).toFixed(2)} MB`
  return `${(s / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export default prettySize
