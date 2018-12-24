const prettySize = (size) => {
  const s = parseFloat(size, 10)
  if (!s) return '0 B'
  if (s < 1024) return `${s} B`
  else if (s < (1024 * 1024)) return `${(s / 1024).toFixed(2)} KB`
  else if (s < (1024 * 1024 * 1024)) return `${(s / 1024 / 1024).toFixed(2)} MB`
  return `${(s / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export default prettySize
