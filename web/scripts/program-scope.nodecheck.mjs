import {test} from 'node:test'
import assert from 'node:assert/strict'
import {programScopeDescription} from '../src/features/frameworks/programScope.ts'

test('shows only a stored nonempty scope description',()=>{
 assert.equal(programScopeDescription({description:' Cloud services '}),'Cloud services')
 for(const scope of [null,{},[],{description:''},{description:'  '},{description:42}]) assert.equal(programScopeDescription(scope),null)
})
