import i18n from 'i18n'

import Home from './Home'
import { ShareIcon, ShareSelectedIcon } from '../common/Svg'

class Public extends Home {
  constructor (ctx) {
    super(ctx)

    this.title = () => i18n.__('Public Drive')

    this.isPublic = true
  }

  menuName () {
    return i18n.__('Public Menu Name')
  }

  quickName () {
    return i18n.__('Public Quick Name')
  }

  menuIcon () {
    return ShareIcon
  }

  menuSelectedIcon () {
    return ShareSelectedIcon
  }
}

export default Public
