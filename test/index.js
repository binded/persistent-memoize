import test from 'blue-tape'
import initMemoize from '../src'
import initBlobStore from 'fs-blob-store'
import rimraf from 'rimraf'
import { join } from 'path'

const tmpPath = join(__dirname, '.tmp')
// Clean tmp dir
rimraf.sync(tmpPath)

const blobStore = initBlobStore(tmpPath)
const memoize = initMemoize(blobStore)

test('simple cache miss, cache hit', (t) => {
  let callCount = 0
  const square = memoize((i) => {
    callCount++
    if (callCount === 1) {
      return Promise.resolve(i * i)
    }
    return Promise.resolve(i * i * i)
  }, 'test-1')
  square(2)
    .then((val) => {
      t.equal(val, 4, 'val = 4')
    })
    .then(() => square(2))
    .then((val) => {
      t.equal(val, 4, 'returns cached result')
    })
    .then(() => {
      t.end()
    })
    .catch((err) => {
      t.fail(err)
    })
})

