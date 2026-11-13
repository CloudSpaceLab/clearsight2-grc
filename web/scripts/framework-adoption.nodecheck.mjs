import {test} from 'node:test'
import assert from 'node:assert/strict'
import {verifyAdoptionPage} from '../src/features/frameworks/adoptionResponses.ts'

test('mapping and candidate pages must match the selected adoption and Program version',()=>{
 const expected={version:7,adoptionId:'adoption-1'}
 assert.doesNotThrow(()=>verifyAdoptionPage({program_version:7,adoption_id:'adoption-1'},expected))
 assert.throws(()=>verifyAdoptionPage({program_version:8,adoption_id:'adoption-1'},expected))
 assert.throws(()=>verifyAdoptionPage({program_version:7,adoption_id:'other'},expected))
})
