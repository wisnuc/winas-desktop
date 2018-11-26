const path = require('path')
const Promise = require('bluebird')
const sanitize = require('sanitize-filename')
const { ipcMain } = require('electron')
const fs = Promise.promisifyAll(require('original-fs')) // eslint-disable-line

class BackUp {
  constructor (props) {
    this.props = props
    Object.assign(this, props)
    this.state = 'Idle'
  }

  readDir (dir, task) {
  }
}

const read = async (entries, task, parent) => {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const stat = await fs.lstatAsync(path.resolve(entry))
    if (!stat.isDirectory()) continue
    task.count += 1
    const children = await fs.readdirAsync(path.resolve(entry))
    const newEntries = []
    children.forEach(c => newEntries.push(path.join(entry, c)))
    const node = Object.assign({ entry, children: [] }, stat)
    parent.children.push(node)
    console.log(entry)

    await read(newEntries, task, node)
  }
  return ({ entries, task })
}

const backupHandle = (event, args) => {
  const { id, driveUUID, dirUUID, localPath } = args
  console.log('backupHandle', args)
  const t = { count: 0, size: 0, id, timeStamp: new Date().getTime(), children: [] }
  read([localPath], t, t).then(({ entries, task }) => {
    console.log(entries, task)
    event.sender.send('BACKUP_STAT', { entries, task })
  }).catch(e => console.error(e))
}

ipcMain.on('BACKUP', backupHandle)
