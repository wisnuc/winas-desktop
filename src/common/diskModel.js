const startWord = [
  ['ST', '希捷'],
  ['WD', '西数'],
  ['SM', '金士顿'],
  ['KINGSTON', '金士顿'],
  ['MZ', '三星'],
  ['Samsung', '三星'],
  ['SSD', '英特尔'],
  ['HT', 'HGST'],
  ['AS', '威刚'],
  ['PX', '浦科特'],
  ['PH', 'LITEON'],
  ['CN', '七彩虹'],
  ['SD', '闪迪'],
  ['KE', '金胜'],
  ['MQ', '东芝'],
  ['TOSHIBA', '东芝'],
  ['HGST', 'HGST'],
  ['ADATA', '威刚'],
  ['VMware', 'VMware'],
  ['VBOX', 'VBOX'],
  ['HITACHI', '日立'],
  ['FUJITSU', '富士通']
]

const interpretModel = (serial) => {
  const unknownModel = '未知品牌'
  if (typeof serial !== 'string') return unknownModel
  const index = startWord.findIndex(a => serial.startsWith(a[0]))
  if (index > -1) return startWord[index][1]
  return unknownModel
}

export default interpretModel
