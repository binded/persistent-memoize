/* eslint-disable no-console */
import assert from 'assert'
import { createHash } from 'crypto'
import jsonStringify from 'json-stable-stringify'
import initDebug from 'debug'
import initCache from './cache'

const debug = initDebug('persistent-memoize')

class NotImplementedError extends Error {}

const sha1 = (str) => createHash('sha1').update(str).digest('hex')
const hashArguments = (args) => sha1(jsonStringify(args))

/*
const isPromise = (val = false) => (
  typeof val !== 'undefined' && typeof val.then === 'function'
)
*/


export default (store, {
  prefix = 'persistent-memoize',
  name = process.env.npm_package_name || 'unknown_npm_package_name',
  version = process.env.npm_package_version || 'unknown_npm_package_version',
  maxAge: defaultMaxAge = Infinity,
  disable = false,
} = {}) => {
  assert.equal(typeof store.createWriteStream, 'function')
  assert(Number.isInteger(defaultMaxAge) || defaultMaxAge === Infinity)
  assert(!name || typeof name === 'string')
  assert(!version || typeof version === 'string')

  const cache = initCache(store)

  const memoize = (fn, fnName = 'latest', {
    version: fnVersion = 'latest',
    maxAge = defaultMaxAge,
    cb = false,
  } = {}) => {
    if (disable) return fn
    if (cb) throw new NotImplementedError('callback api not supported yet')

    const computeKey = (args) => [
      prefix,
      name,
      version,
      fnName,
      fnVersion,
      hashArguments(args),
    ].join('/')

    const cacheOpts = { maxAge }

    const memoizedFn = (...args) => {
      const key = computeKey(args)
      return cache
        .get(key, cacheOpts)
        .then(({
          miss,
          expired,
          metadata,
          value,
        }) => {
          debug('metadata', metadata)
          if (miss) {
            debug(`${key} cache miss`)
            if (expired) {
              debug(`${key} exists but is expired`)
            }
            // TODO: cache result in "parallel"?
            // There could be an option for that?
            return fn(...args)
              .then((result) => cache.set(key, result))
          }
          debug(`${key} cache hit`)
          return value
        })
    }

    return memoizedFn
  }

  memoize.callback = (fn, fnName, opts) => memoize(fn, fnName, { ...opts, cb: true })

  // memoize.callback = (fn, name, opts) => memoize(fn, name, { ...opts, cb: true })

  return memoize
}

/*
  (fn, fnPrefix = '') => {
  const computeKey = (args) => {
    // TODO: make sure all args can be serialized to string?
    const hash = crypto.createHash('md5')
      .update(args.join('|'))
      .digest('hex')
    return path.join(globalPrefix, fnPrefix, hash)
  }

  return (...args) => {
    if (disableCache) {
      return fn(...args)
    }
    // debug('memoized function called')
    const key = computeKey(args)
    // debug(`key = ${key}`)

    const passthrough = new PassThrough()

    const handleError = (err) => {
      debug(`handleError(${err})`)
      passthrough.emit('error', err)
    }

    // debug(`store.exists(${key})`)
    store.exists({ key }, (err, exists) => {
      if (err) return handleError(err)
      if (exists) {
        debug(`cache hit (${key})`)
        const cacheReadStream = store.createReadStream({ key })
        // cacheReadStream.on('error', handleError)
        return cacheReadStream.pipe(passthrough)
      }
      debug(`miss (${key})`)
      const readStream = fn(...args)
      // TODO: do we need to manually forward errors to passthrough?

      // TODO: cache to store
      const cacheWriteStream = store.createWriteStream({ key }, (_err) => {
        if (_err) return handleError(_err)
      })

      readStream.pipe(cacheWriteStream)
      readStream.pipe(passthrough)
    })

    return passthrough
  }
}
*/
