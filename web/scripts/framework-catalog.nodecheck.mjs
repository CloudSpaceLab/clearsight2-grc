import {test} from 'node:test'
import assert from 'node:assert/strict'
import {parseEditions,parseReferenceTemplates,parseFrameworkProgramUsage,frameworkUsageLabel,safeSource} from '../src/features/frameworks/frameworkCatalog.ts'
const edition={id:'one',title:'Security',publisher_code:'P',framework_code:'S',edition_code:'2026',jurisdiction:'GLOBAL',source_url:'https://example.org/source',source_published_on:'2026-01-01',license_basis:'CITATIONS_ONLY'}
test('accepts real edition metadata and empty catalog',()=>{assert.deepEqual(parseEditions({items:[edition]}),[edition]);assert.deepEqual(parseEditions({items:[]}),[])})
test('rejects invalid responses and unsafe publisher links',()=>{assert.throws(()=>parseEditions({items:[{...edition,id:null}]}));assert.throws(()=>parseEditions({}));assert.equal(safeSource('javascript:alert(1)'),null);assert.equal(safeSource('https://user:pass@example.org'),null);assert.equal(safeSource('https://example.org/source'),'https://example.org/source')})
test('validates reference guidance without treating it as a published edition',()=>{const template={code:'SOC_2',title:'SOC 2',description:'Assurance',publisher:'AICPA',edition:'',jurisdiction:'GLOBAL',topic:'Assurance',purpose:'Review',applicability_prompt:'Identify scope',official_source:'https://example.org',source_note:'Check scope',review_status:'REVIEW_REQUIRED',areas:[{code:'A',title:'Scope',assessment_prompt:'Is scope defined?',evidence_examples:'Scope statement'}]};assert.deepEqual(parseReferenceTemplates({items:[template]}),[template]);assert.throws(()=>parseReferenceTemplates({items:[{...template,review_status:'APPROVED'}]}));assert.throws(()=>parseReferenceTemplates({items:[{...template,areas:[{code:'A'}]}]}));assert.throws(()=>parseReferenceTemplates({items:[{...template,areas:null}]}))})

test('active Program counts retain reference identity and do not invent usage for missing data',()=>{
 assert.equal(frameworkUsageLabel(undefined),'Usage unavailable')
 assert.equal(frameworkUsageLabel(0),'Available')
 assert.equal(frameworkUsageLabel(1),'In 1 Program')
 assert.equal(frameworkUsageLabel(2),'In 2 Programs')
 const usage={template_code:'ISO_27001_2022',active_program_count:2}
 assert.deepEqual(parseFrameworkProgramUsage({items:[usage]}),[usage])
 assert.deepEqual(parseFrameworkProgramUsage({items:[]}),[])
 for(const invalid of [{...usage,active_program_count:-1},{...usage,active_program_count:0},{...usage,active_program_count:1.2},{...usage,edition_id:'edition'}, {active_program_count:1}])assert.throws(()=>parseFrameworkProgramUsage({items:[invalid]}))
 assert.throws(()=>parseFrameworkProgramUsage({items:[usage,usage]}))
})
