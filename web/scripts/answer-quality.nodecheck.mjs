import {test} from 'node:test'
import assert from 'node:assert/strict'
import {answerValidityStatus} from '../src/features/programs/v1Client.ts'

test('answer expiry changes at its saved boundary while other answers remain current',()=>{
 const first='2026-11-25T08:00:00Z'
 const second='2026-12-18T08:00:00Z'
 assert.equal(answerValidityStatus(first,Date.parse(first)-1),'Current')
 assert.equal(answerValidityStatus(first,Date.parse(first)),'Expired')
 assert.equal(answerValidityStatus(second,Date.parse(first)),'Current')
 assert.equal(answerValidityStatus(undefined,Date.parse(first)),'No expiry configured')
 assert.equal(answerValidityStatus('invalid',Date.parse(first)),'Validity unavailable')
})
