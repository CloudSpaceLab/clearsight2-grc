import {test} from 'node:test'
import assert from 'node:assert/strict'
import {isCurrentApprovedRequirement,linkState} from '../src/features/frameworks/mappingState.ts'
test('links report approved, pending, unknown and unlinked states without treating incomplete pages as unlinked',()=>{
 const records=[{clause_id:'a',requirement_id:'x',status:'PENDING'},{clause_id:'b',requirement_id:'y',status:'APPROVED'}]
 assert.equal(linkState('a',records,false),'pending')
 assert.equal(linkState('b',records,false),'linked')
 assert.equal(linkState('c',records,true),'unknown')
 assert.equal(linkState('c',records,false),'review')
 assert.equal(linkState('a',records,true),'pending')
})

test('only current, approved requirements can be offered for mapping',()=>{
 const now=Date.parse('2026-11-13T00:00:00Z')
 assert.equal(isCurrentApprovedRequirement({status:'APPROVED',effective_from:'2026-01-01T00:00:00Z'},now),true)
 assert.equal(isCurrentApprovedRequirement({status:'DRAFT',effective_from:'2026-01-01T00:00:00Z'},now),false)
 assert.equal(isCurrentApprovedRequirement({status:'APPROVED',effective_from:'2027-01-01T00:00:00Z'},now),false)
 assert.equal(isCurrentApprovedRequirement({status:'APPROVED',effective_from:'2026-01-01T00:00:00Z',effective_until:'2026-11-13T00:00:00Z'},now),false)
 assert.equal(isCurrentApprovedRequirement({status:'APPROVED'},now),false)
})
