class History {
  constructor () {
    this.curr = -1
    this.queue = []
  }

  add (pos) {
    this.queue = [...this.queue.slice(0, this.curr + 1), pos]
    this.curr += 1
  }

  back () {
    this.curr = Math.max(0, this.curr - 1)
    return this.queue[this.curr]
  }

  forward () {
    this.curr = Math.min(this.queue.length - 1, this.curr + 1)
    return this.queue[this.curr]
  }

  get () {
    return ({ curr: this.curr, queue: this.queue })
  }

  clear () {
    this.curr = -1
    this.queue = []
  }
}

export default History
