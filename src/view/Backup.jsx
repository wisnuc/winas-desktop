import i18n from 'i18n'
import Photo from './Photo'
import { BackupIcon } from '../common/Svg'

class Backup extends Photo {
  constructor (ctx) {
    super(ctx)
    this.title = () => i18n.__('Backup')
    this.type = 'docs'
    this.types = 'PDF.TXT.DOCX.MD.DOC.XLS.XLSX.PPT.PPTX'
  }

  menuIcon () {
    return BackupIcon
  }

  menuSelectedIcon () {
    return BackupIcon
  }
}

export default Backup
