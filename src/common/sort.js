import { toTimeSecond } from '../common/datetime'

const getDateTime = m => m.metadata && (m.metadata.date || m.metadata.datetime)

const sort = (a, b, sortType) => {
  if (a.type === 'directory' && b.type === 'file') return -1
  if (a.type === 'file' && b.type === 'directory') return 1
  switch (sortType) {
    case 'nameUp':
      return a.name.localeCompare(b.name)
    case 'nameDown':
      return b.name.localeCompare(a.name)
    case 'sizeUp':
      return (a.size !== undefined && b.size !== undefined) ? (a.size - b.size) : a.name.localeCompare(b.name)
    case 'sizeDown':
      return (a.size !== undefined && b.size !== undefined) ? (b.size - a.size) : a.name.localeCompare(b.name)
    case 'timeUp':
      return (a.mtime && b.mtime) ? (a.mtime - b.mtime) : a.name.localeCompare(b.name)
    case 'timeDown':
      return (a.mtime && b.mtime) ? (b.mtime - a.mtime) : a.name.localeCompare(b.name)
    case 'btimeUp':
      return (a.bmtime && b.bmtime) ? (a.bmtime - b.bmtime) : a.bname.localeCompare(b.bname)
    case 'btimeDown':
      return (a.bmtime && b.bmtime) ? (b.bmtime - a.bmtime) : a.bname.localeCompare(b.bname)
    case 'otimeUp':
      return (a.otime && b.otime) ? (a.otime - b.otime) : a.bname.localeCompare(b.bname)
    case 'otimeDown':
      return (a.otime && b.otime) ? (b.otime - a.otime) : (a.bname || a.name || '').localeCompare(b.bname || b.name)
    case 'versionUp':
      return (a.versionNum && b.versionNum) ? (a.versionNum - b.versionNum) : a.bname.localeCompare(b.bname)
    case 'versionDown':
      return (a.versionNum && b.versionNum) ? (b.versionNum - a.versionNum) : a.bname.localeCompare(b.bname)
    case 'takenUp':
      if (getDateTime(a) && !getDateTime(b)) return -1
      if (!getDateTime(a) && getDateTime(b)) return 1
      return getDateTime(a) && getDateTime(b) ? toTimeSecond(getDateTime(a)) - toTimeSecond(getDateTime(b)) : a.name.localeCompare(b.name)
    case 'takenDown':
      if (getDateTime(a) && !getDateTime(b)) return -1
      if (!getDateTime(a) && getDateTime(b)) return 1
      return getDateTime(a) && getDateTime(b) ? toTimeSecond(getDateTime(b)) - toTimeSecond(getDateTime(a)) : a.name.localeCompare(b.name)
    default:
      return a.name.localeCompare(b.name)
  }
}

export default sort
