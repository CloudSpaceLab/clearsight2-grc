import assert from 'node:assert/strict'
import test from 'node:test'
import { adaptProgram, pageSlice, v1ProgramRead } from '../src/features/programs/programTransport.ts'
import { isSupportingDocumentRequest, latestRequests } from '../src/features/programs/v1Client.ts'
import { hasDueDate, isOverdue, workScopeMatches } from '../src/features/home/homeWork.ts'
import { validLossSnapshot, formatMinorUnits, validMetricSnapshot, validOversightSnapshot, validRiskBreakdown, validVendorPage } from '../src/features/home/homeOversight.ts'
import { summarizeVisibleFormRequests } from '../src/features/home/formRequestSummary.ts'
import { summarizeProgramReferences } from '../src/features/home/programReferences.ts'
test('Program reference summary respects scope and effective periods without inferring assessment',()=>{
 const at='2026-11-10T12:00:00Z',program={id:'p',tenant_id:'t',legal_entity_id:'e'}
 const page={generated_at:at,items:[{program,requirements:[{id:'r1',program_id:'p',status:'APPROVED',effective_from:'2026-01-01T00:00:00Z'},{id:'r2',program_id:'p',status:'APPROVED',effective_from:'2027-01-01T00:00:00Z'},{id:'r3',program_id:'p',status:'DRAFT',effective_from:'2026-01-01T00:00:00Z'}]}]}
 assert.deepEqual(summarizeProgramReferences(page,'t','e'),{programs:1,approvedRequirements:1,limited:false,asOf:at})
 assert.equal(summarizeProgramReferences(page,'t','other'),null)
 assert.equal(summarizeProgramReferences({...page,items:[{program,requirements:[{...page.items[0].requirements[0],program_id:'other'}]}]},'t','e'),null)
})
test('form request summary separates submission from review and excludes unrelated requests',()=>{
 const result=summarizeVisibleFormRequests({items:[{form_template_id:'f',status:'READY'},{form_template_id:'f',status:'SUBMITTED'},{status:'SUBMITTED'},{form_template_id:'f',status:'CHANGES_REQUESTED'}]})
 assert.deepEqual(result,{counts:{DRAFT:0,OPEN:0,READY:1,SUBMITTED:1,EXPIRED:0},other:1,limited:false})
 assert.equal(summarizeVisibleFormRequests({items:[{form_template_id:'f',status:null}]}),null)
 assert.equal(summarizeVisibleFormRequests({items:Array.from({length:100},()=>({status:'READY',form_template_id:'f'}))}).limited,true)
})
test('vendor summaries verify legal entity and reject mixed tenant responses',()=>{
 const page={items:[{relationship:{id:'r',tenant_id:'tenant',legal_entity_id:'entity',status:'ACTIVE'}}]}
 assert.equal(validVendorPage(page,'tenant','entity'),true)
 assert.equal(validVendorPage(page,'tenant','other'),false)
 assert.equal(validVendorPage({items:[{relationship:{...page.items[0].relationship,tenant_id:'clearsight-demo'}}]},'tenant','entity'),true)
 assert.equal(validVendorPage({items:[page.items[0],{relationship:{...page.items[0].relationship,tenant_id:'another'}}]},'tenant','entity'),false)
 assert.equal(validVendorPage({...page,items:[{relationship:{...page.items[0].relationship,status:'UNKNOWN'}}]},'tenant','entity'),false)
})
test('risk breakdown must match the exact source and total',()=>{
 const value={source_id:'s',definition_revision:'v',metric_id:'risks_outside_appetite',count:2,items:[{key:'a',label:'Technology',value:2}]}
 assert.equal(validRiskBreakdown(value,'s','v',2),true)
 assert.equal(validRiskBreakdown(value,'other','v',2),false)
 assert.equal(validRiskBreakdown(value,'s','v',3),false)
})
test('oversight metrics reject wrong scope and preserve valid zero values',()=>{
 const m={id:'risks_outside_appetite',label:'Outside appetite',value:0,unit:'COUNT',freshness:'CURRENT',completeness:'COMPLETE',population:0,excluded:0,unknown:0,generated_at:'2026-11-10T12:00:00Z'}
 const snapshot={scope_kind:'LEGAL_ENTITY',scope_id:'entity',items:[m]}
 assert.equal(validMetricSnapshot(snapshot,'entity'),true)
 assert.equal(validMetricSnapshot(snapshot,'other'),false)
 assert.equal(validMetricSnapshot({...snapshot,items:[{...m,value:null}]},'entity'),false)
 assert.equal(validOversightSnapshot({generated_at:m.generated_at,freshness:'CURRENT',coverage:{population:2,excluded:1,unknown:0},interventions:[],pressure:[]}),true)
 assert.equal(validOversightSnapshot({generated_at:m.generated_at,freshness:'CURRENT',coverage:{population:2,excluded:null,unknown:0},interventions:[],pressure:[]}),false)
})
test('loss amounts preserve currency precision and reject wrong entity',()=>{
 const loss={scope_kind:'LEGAL_ENTITY',scope_id:'entity',period_start:'2026-08-12T00:00:00Z',period_end:'2026-11-10T12:00:00Z',event_count:1,mixed_currencies:false,currencies:[{currency:'NGN',gross:{currency:'NGN',minor_units:'12345'},recovery:{currency:'NGN',minor_units:'0'},net:{currency:'NGN',minor_units:'12345'}}],flow_points:[]}
 assert.equal(validLossSnapshot(loss,'entity'),true)
 assert.equal(validLossSnapshot(loss,'other'),false)
 assert.equal(formatMinorUnits('12345','NGN'),'NGN 123.45')
 assert.equal(formatMinorUnits('-101','USD'),' -USD 1.01'.trim())
 assert.equal(formatMinorUnits('100','JPY'),'JPY 100')
})
test('home assignments remain within the signed-in scope and ignore undated sentinel values',()=>{
 const scope={principal_id:'actor',tenant_id:'tenant',legal_entity_id:'entity'}
 assert.equal(workScopeMatches(scope,'actor','tenant','entity'),true)
 assert.equal(workScopeMatches(scope,'other','tenant','entity'),false)
 assert.equal(workScopeMatches(scope,'actor','other','entity'),false)
 assert.equal(hasDueDate('0001-01-01T00:00:00Z'),false)
 assert.equal(isOverdue('0001-01-01T00:00:00Z','2026-11-10T00:00:00Z'),false)
 assert.equal(isOverdue('2026-09-11T23:59:59Z','2026-11-10T00:00:00Z'),true)
})
const id='00000000-0000-4000-8000-000000000301'
const aggregate={program:{id,version:3,name:'Security',code:'SEC',status:'ACTIVE',type:'CYBERSECURITY',owning_function:'Security',jurisdiction:'NG',updated_at:'2026-11-10T08:00:00Z'},requirements:[]}
function backend(extra={}){const calls=[];return {calls,fetch:async(path,init)=>{calls.push({path,init});if(path==='/api/v1/context')return Response.json({tenant:{id:'verified-tenant'}});const base=path.split('?')[0];return Response.json(extra[base] ?? (base==='/api/v1/programs'?{items:[aggregate]}:aggregate))}}}
test('adapts actual versioned metadata without turning posture into compliance',()=>{const result=adaptProgram(aggregate);assert.equal(result.program_type,'CYBERSECURITY');assert.equal(result.source_revision,'v1:3:2026-11-10T08:00:00Z');assert.throws(()=>adaptProgram({program:{id,version:0}}))})
test('keeps bounded pagination deterministic and rejects invalid cursor',()=>{assert.deepEqual(pageSlice([1,2,3],'0',2),{items:[1,2],next_cursor:'2'});assert.deepEqual(pageSlice([1,2,3],'2',2),{items:[3]});assert.throws(()=>pageSlice([1],'-1'))})
test('uses server session context and same-origin cookie; never supplies actor headers',async()=>{const b=backend();const response=await v1ProgramRead('/api/v1/programs?limit=25&q=security',{},b.fetch);assert.equal(response.status,200);assert.equal((await response.json()).items[0].id,id);assert.ok(b.calls[1].path.includes('tenant_id=verified-tenant'));for(const call of b.calls){assert.equal(call.init.credentials,'same-origin');assert.equal(call.init.method,'GET');assert.equal(call.init.headers,undefined)}})
test('preserves denied identity and never continues with a forged tenant',async()=>{let calls=0;const response=await v1ProgramRead('/api/v1/programs?tenant_id=attacker',{},async()=>{calls++;return new Response('',{status:401})});assert.equal(response.status,401);assert.equal(calls,1)})
test('filters issues by non-retired exact Program links and excludes closed matters',async()=>{const m=(key,status,links)=>({matter:{id:key,status,reference:key,title:'Issue',type:'CONTROL_GAP',priority:2,updated_at:'2026-11-10T08:00:00Z'},links});const b=backend({'/api/v1/matters':{items:[m('visible','TRIAGE',[{program_id:id}]),m('other','TRIAGE',[{program_id:'other'}]),m('retired','TRIAGE',[{program_id:id,retired_at:'2026-01-01'}]),m('closed','CLOSED',[{program_id:id}])]}});const body=await(await v1ProgramRead(`/api/v1/programs/${id}/issues`,{},b.fetch)).json();assert.deepEqual(body.items.map(i=>i.id),['visible'])})
test('does not invent unsupported aggregate measures or silently map inventory semantics',async()=>{const b=backend();const overview=await(await v1ProgramRead(`/api/v1/programs/${id}/overview`,{},b.fetch)).json();assert.equal(overview.assessment_coverage,null);assert.equal(overview.supported,null);assert.equal((await v1ProgramRead(`/api/v1/programs/${id}/controls`,{},b.fetch)).status,503)})
test('rejects a cross-Program response before returning any child records',async()=>{const b=backend({[`/api/v1/programs/${id}`]:{program:{...aggregate.program,id:'other'}}});assert.equal((await v1ProgramRead(`/api/v1/programs/${id}/issues`,{},b.fetch)).status,503)})
test('recognizes only the app-created standalone document request, preserving assessments with attachments',()=>{assert.equal(isSupportingDocumentRequest({purpose:'Supporting documentation for the selected Program'}),true);assert.equal(isSupportingDocumentRequest({purpose:'Quarterly assessment',fields:[{type:'file'}]}),false);assert.equal(isSupportingDocumentRequest({purpose:'Supporting documentation for the selected Program',form_template_id:'form-1'}),false)})
test('shows recently updated cycles first without changing the original list',()=>{const input=[{id:'old',updated_at:'2026-01-01T00:00:00Z'},{id:'new',updated_at:'2026-12-01T00:00:00Z'},{id:'same',updated_at:'2026-12-01T00:00:00Z'}];assert.deepEqual(latestRequests(input).map(r=>r.id),['new','same','old']);assert.deepEqual(input.map(r=>r.id),['old','new','same'])})
