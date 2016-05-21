import { Readable } from 'stream'
import isStream from 'is-stream'

class BufferStream extends Readable {
  constructor(buf) {
    super()
    this.myBuf = buf
  }
  _read() {
    this.push(this.myBuf)
    this.push(null)
  }
}

/*
  class extends Readable {
    _read(n = buf.length) {
      const end = Math.max(start + n, buf.length)
      const chunk = buf.slice(start, end)
      start = start + n
      this.push(chunk)
      if (end === buf.length) {
        this.push(null)
      }
    }
  }
*/

export const bufferToStream = (buf) => new BufferStream(buf)

export const stringToStream = (str) => bufferToStream(Buffer.from(str))

// Returns { type: '', stream: '' }
export const toStream = (val) => {
  if (isStream(val)) {
    return { type: 'stream', bodyStream: val }
  }
  if (Buffer.isBuffer(val)) {
    return { type: 'buffer', bodyStream: bufferToStream(val) }
  }
  // Assume value can be encoded to json
  return { type: 'json', bodyStream: stringToStream(JSON.stringify(val)) }
}
