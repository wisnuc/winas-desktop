import i18n from 'i18n'

import Home from './Home'
import { ShareIcon, ShareSelectedIcon } from '../common/Svg'

class Public extends Home {
  constructor (ctx) {
    super(ctx)
    this.type = 'public'

    this.title = () => i18n.__('Public Drive')

    this.isPublic = true

    const userConfig = Array.isArray(window.config.users) && window.config.users.find(u => u.userUUID === this.userUUID)
    const gridView = userConfig && userConfig[`gridViewIn${this.type}`]

    this.state = Object.assign(this.state, { gridView })
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
