import test from 'node:test'
import assert from 'node:assert/strict'
import { loadProgramMetadata } from '../src/features/programs/programApi.ts'

const id = '00000000-0000-4000-8000-000000000301'
const signal = new AbortController().signal
const valid = {
  id,
  name: 'Customer-authorized Program',
  source_revision: '7',
  updated_at: '2026-10-19T12:00:00Z',
}

test('a missing or malformed Program identifier never reaches the network', async () => {
  const network = () => { throw new Error('unexpected HTTP request') }
  assert.deepEqual(await loadProgramMetadata(null, signal, network), { kind: 'not-selected' })
  assert.deepEqual(await loadProgramMetadata('not-a-uuid', signal, network), { kind: 'invalid-id' })
})

test('the authorized fetch is same-origin, credential-bound and without client identity headers', async () => {
  let calls = 0
  const result = await loadProgramMetadata(id, signal, (path, options) => {
    calls++
    assert.equal(path, `/api/v1/programs/${id}`)
    assert.equal(options.method, 'GET')
    assert.equal(options.credentials, 'same-origin')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.signal, signal)
    assert.deepEqual(options.headers, { Accept: 'application/json' })
    return Promise.resolve(new Response(JSON.stringify(valid), { status: 200 }))
  })
  assert.equal(calls, 1)
  assert.deepEqual(result, { kind: 'ready', program: valid })
})

test('private response errors stay distinct and no unauthorized body is displayed', async () => {
  for (const [status, kind] of [[401, 'sign-in'], [403, 'denied'], [404, 'missing'], [500, 'unavailable'], [503, 'unavailable']]) {
    const response = await loadProgramMetadata(id, signal, () =>
      Promise.resolve(new Response(JSON.stringify(valid), { status })))
    assert.deepEqual(response, { kind }, `HTTP ${status}`)
  }
})

test('malformed, mismatched and incomplete success responses fail closed', async () => {
  for (const malformed of [
    null, [], {},
    { ...valid, id: '00000000-0000-4000-8000-000000000302' },
    { ...valid, name: '' },
    { ...valid, source_revision: '' },
    { ...valid, updated_at: 'not a date' },
  ]) {
    const result = await loadProgramMetadata(id, signal, () =>
      Promise.resolve(new Response(JSON.stringify(malformed), { status: 200 })))
    assert.deepEqual(result, { kind: 'unavailable' })
  }
  const rejected = await loadProgramMetadata(id, signal, () => Promise.reject(new Error('timeout')))
  assert.deepEqual(rejected, { kind: 'unavailable' })
})
