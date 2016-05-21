# persistent-memoize

[Memoize](https://en.wikipedia.org/wiki/Memoization) / cache arbitrary
functions to the local file system, Amazon S3, Google Drive, Google
Cloud, PostgreSQL, Bittorrent, etc.

Any
[abstract-blob-store](https://github.com/maxogden/abstract-blob-store)
compatible store is supported.

[![blob-store-compatible](https://raw.githubusercontent.com/maxogden/abstract-blob-store/master/badge.png)](https://github.com/maxogden/abstract-blob-store)

## Install

```
npm install --save persistent-memoize
```

## Usage

### persistentMemoize(blobStore [, opts])

Returns a **memoize()** function.

**blobStore** should be an [abstract-blob-store](https://github.com/maxogden/abstract-blob-store).

**opts** (optional) configuration object

**opts.name** (defaults to the `name` field of your `package.json`)

Used when generating the key used by the blob store. See Key Generation.

**opts.version** (defaults to the `version` field of your `package.json`)

Used when generating the key used by the blob store. We suggestion
setting version to `'latest'` or `null` if you decide to version
memoized functions individually. This prevents uselessly invalidating
the cache when the app version is bumped but the individual memoized
functions haven't changed. See Key Generation.


**opts.maxAge** (defaults to `Infinity`)

Specifies after how long (in milliseconds since it was last updated) a
cached value is considered stale/expired. Can be overriden through
`memoize()` options.

### memoize(fn, name [, opts])

Returns a memoized version of `fn`. If `fn` takes a callback, use
`memoize.callback(fn, name [, opts])` or `memoize(fn, name, { cb: true })`.

**fn**

The function to memoize.

In order for memoization to work as expected, the return value of `fn`
must exclusively depend on its arguments and nothing else. It also must
not produce any visible side effects.

[From Wikipedia](https://en.wikipedia.org/wiki/Memoization):

A function can only be memoized if it is [referentially
transparent](https://en.wikipedia.org/wiki/Referential_transparency);
that is, only if calling the function has exactly the same effect as
replacing that function call with its return value.

In addition, all `fn` arguments and its return value must be compatible
with `JSON.stringify`.

[json-stable-stringify](https://github.com/substack/json-stable-stringify)
is used to deterministically generate a string from arguments which is
then hashed with sha1 to compute a unique key.

**name**

Since we want the memoization to work across different processes or
restarts, we must name the function so that it can uniquely be
identified. See Key Generation.

**opts** optional configuration object

**opts.version**

A version can optionally be specified if you wish to version functions
individually instead of using a global version number. See Key
Generation.

**opts.maxAge**

Overrides the default `maxAge` value.

### Key generation

`persistent-memoize` is designed to memoize functions across processes
and restarts. In order to do that reliably, functions must be named and
versioned explicitly.

The algorithm to generate keys for specific function calls is as follows:

```
globalName/globalVersion/name/version/argumentHash
```

Where `globalName` and `globalVersion` are respectively the `opts.name`
and `opts.version` values passed to `persistentMemoize()`. `name` and
`version` are respectively the `opts.name` and `opts.version` values
passed to `memoize()` .

`argumentHash` is, in pseudo code:

```javascript
argumentHash = sha1(stringifyToJson(arguments))
```

Where `arguments` is an array of arguments passed to the memoized
function and `stringifyToJson` is a call to
[json-stable-stringify](https://github.com/substack/json-stable-stringify)
which is similar to `JSON.stringify` but more deterministic (e.g. order
of object keys doesn't matter).

## Examples

```javascript
import persistentMemoize from 'persistent-memoize'
import fetch from 'node-fetch'
import http from 'http'
import initBlobStore from 's3-blob-store'
import aws from 'aws-sdk'

const store = initBlobStore({
  client: new aws.S3({
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  }),
  bucket: 'mybucket',
})

const memoize = persistentMemoize(store)

// Memoize fetch calls (fetch returns a promise)
// Cache will be invalidated when version in `package.json`
// is bumped OR when cache is expired (see maxAge option)
const memoizedFetch = memoize((...args) => (
  fetch(...args)
    .then((response) => {
      if (!response.ok) throw new Error('oops, problem with request')
      return response.text()
    })
), 'memoizedFetch')

// Functions are versioned individually
const memoizeNoVersion = persistentMemoize(store, { version: null })

// Cache invalidated only when version is manually changed
const memoizedCb = memoizeNoVersion((cb) => {
  cb()
}, 'memoizedCb', { cb :true, version: 1 })

// Alternative syntax
const memoizedCb2 = memoize.cb((cb) => { cb() }, 'memoizedCb/v2')

// Sync function
const expensiveComputation = memoize((i) => {
  // some expensive computation :)
  return i + 1
}, 'expensive-computation')
```
