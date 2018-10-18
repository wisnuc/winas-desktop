import React from 'react'
import { PhotoIcon, TXTIcon, WORDIcon, EXCELIcon, PPTIcon, PDFIcon, VideoIcon, AudioIcon, RARIcon, TypeUnknownIcon } from '../common/Svg'

const renderFileIcon = (name, metadata, setSize) => {
  /* PDF, TXT, Word, Excel, PPT */
  let extension = name.replace(/^.*\./, '')
  if (!extension || extension === name) extension = 'OTHER'

  const iconArray = {
    PDF: PDFIcon,
    TXT: TXTIcon,
    MD: TXTIcon,
    DOCX: WORDIcon,
    DOC: WORDIcon,
    XLS: EXCELIcon,
    XLSX: EXCELIcon,
    PPT: PPTIcon,
    PPTX: PPTIcon,
    RA: AudioIcon,
    OGG: AudioIcon,
    MKA: AudioIcon,
    WAV: AudioIcon,
    MP3: AudioIcon,
    APE: AudioIcon,
    WMA: AudioIcon,
    FLAC: AudioIcon,
    RM: VideoIcon,
    RMVB: VideoIcon,
    WMV: VideoIcon,
    AVI: VideoIcon,
    MP4: VideoIcon,
    '3GP': VideoIcon,
    MKV: VideoIcon,
    MOV: VideoIcon,
    FLV: VideoIcon,
    MPEG: VideoIcon,
    PNG: PhotoIcon,
    JPG: PhotoIcon,
    JPEG: PhotoIcon,
    GIF: PhotoIcon,
    BMP: PhotoIcon,
    TIFF: PhotoIcon,
    RAW: PhotoIcon,
    RAR: RARIcon,
    ZIP: RARIcon,
    TAR: RARIcon,
    '7Z': RARIcon,
    GZ: RARIcon,
    OTHER: TypeUnknownIcon
  }

  let type = (metadata && metadata.type) || extension.toUpperCase()
  // debug('renderFileIcon', name, metadata, extension, iconArray, type)
  if (!iconArray[type]) type = 'OTHER'

  const Icon = iconArray[type]
  const size = setSize || 24

  return (<Icon style={{ width: size, height: size }} />)
}

export default renderFileIcon
