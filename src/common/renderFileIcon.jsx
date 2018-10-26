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

  const colorArray = {
    PDF: '#db4437',
    DOCX: '#4285f4',
    DOC: '#4285f4',
    XLS: '#0f9d58',
    XLSX: '#0f9d58',
    PPT: '#db4437',
    PPTX: '#db4437',
    RA: '#00bcd4',
    OGG: '#00bcd4',
    MKA: '#00bcd4',
    WAV: '#00bcd4',
    MP3: '#00bcd4',
    APE: '#00bcd4',
    WMA: '#00bcd4',
    FLAC: '#00bcd4',
    RM: '#f44336',
    RMVB: '#f44336',
    WMV: '#f44336',
    AVI: '#f44336',
    MP4: '#f44336',
    '3GP': '#f44336',
    MKV: '#f44336',
    MOV: '#f44336',
    FLV: '#f44336',
    MPEG: '#f44336',
    PNG: '#ea4335',
    JPG: '#ea4335',
    JPEG: '#ea4335',
    GIF: '#ea4335',
    BMP: '#ea4335',
    TIFF: '#ea4335',
    RAW: '#ea4335'
  }

  let type = (metadata && metadata.type) || extension.toUpperCase()
  // debug('renderFileIcon', name, metadata, extension, iconArray, type)
  if (!iconArray[type]) type = 'OTHER'

  const Icon = iconArray[type]
  const color = colorArray[type] || 'rgba(0,0,0,.54)'
  const size = setSize || 24

  return (<Icon style={{ width: size, height: size, color }} />)
}

export default renderFileIcon
