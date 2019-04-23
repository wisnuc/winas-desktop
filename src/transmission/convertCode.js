import i18n from 'i18n'

const convert = (code) => {
  switch (code) {
    case 'EEXIST':
      return i18n.__('EEXIST')
    case 'ECONNRESET':
      return i18n.__('ECONNRESET')
    case 'ECONNREFUSED':
      return i18n.__('ECONNREFUSED')
    case 'ENETUNREACH':
      return i18n.__('ENETUNREACH')
    case 'ECONNEND':
      return i18n.__('ECONNEND')
    case 'ENOENT':
      return i18n.__('ENOENT')
    case 'EPERM':
      return i18n.__('EPERM')
    case 'EACCES':
      return i18n.__('EACCES')
    case 'ENOSPC':
      return i18n.__('ENOSPC')
    case 'ENXIO':
      return i18n.__('ENXIO')
    case 'ESHA256MISMATCH':
      return i18n.__('ESHA256MISMATCH')
    case 'EOVERSIZE':
      return i18n.__('EOVERSIZE')
    case 'EUNDERSIZE':
      return i18n.__('EUNDERSIZE')
    case 'ENAME':
      return i18n.__('ENAME')
    case 'ETYPE':
      return i18n.__('ETYPE')
    case 'EIGNORE':
      return i18n.__('EIGNORE')
    case 'ESKIP':
      return i18n.__('EIGNORE')
    case 'EDELFILE':
      return i18n.__('EDELFILE')
    case 'EDELDIR':
      return i18n.__('EDELDIR')
    case 'ENOBDIR':
      return i18n.__('ENOBDIR')
    default:
      return code || i18n.__('Unknown Error')
  }
}

export default convert
