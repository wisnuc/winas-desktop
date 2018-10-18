import i18n from 'i18n'
import Photo from './Photo'
import { MyDocIcon } from '../common/Svg'

class Docs extends Photo {
  constructor (ctx) {
    super(ctx)
    this.title = () => i18n.__('Docs Menu Name')
    this.type = 'docs'
    this.types = 'PDF.TXT.DOCX.MD.DOC.XLS.XLSX.PPT.PPTX'
  }

  menuIcon () {
    return MyDocIcon
  }
}

export default Docs
