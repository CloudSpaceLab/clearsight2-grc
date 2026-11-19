import {test} from 'node:test'
import assert from 'node:assert/strict'
import {freshStarterConfiguration,starterStepError,groupHref,keepStarterWording} from '../src/features/frameworks/starterAdoptionModel.ts'

const requirement=()=>({code:'PRIVILEGED_ACCESS',title:'Review privileged digital banking access',statement:'Review privileged access and retain owner sign-off.',original_statement:'Review privileged access and retain owner sign-off.',reference:'ISO starter - mapping requires review',version:1,form_template_id:'form-iso',form_template_version:3,form_name:'ISO starter assessment',form_status:'ACTIVE',form_approved:true,group_id:'privileged_access',group_title:'Privileged access review',fields:[{id:'date',section_id:'privileged_access',label:'When was the last privileged access review completed?',type:'date',required:true},{id:'record',section_id:'privileged_access',label:'Upload the signed privileged access review record.',type:'file',required:true}],decision:'',reason:''})
test('Program decisions are independent copies of the starter and its question group',()=>{
 const source=[requirement()];const first=freshStarterConfiguration(source,'owner'),second=freshStarterConfiguration(source,'owner')
 first.requirements[0].statement='Review mobile and internet banking administrators quarterly.';first.requirements[0].decision='TAILOR';first.requirements[0].reason='Digital banking scope';first.requirements[0].fields[0].label='Local edit'
 assert.equal(second.requirements[0].statement,source[0].statement);assert.equal(second.requirements[0].fields[0].label,source[0].fields[0].label);assert.equal(source[0].decision,'')
})
test('the wizard requires requirement decisions, reviewed Forms and respondent units',()=>{
 const c=freshStarterConfiguration([requirement()],'owner');assert.match(starterStepError(c,1),/Review every requirement/)
 c.requirements[0].decision='REVIEW';assert.match(starterStepError(c,1),/reason/);c.requirements[0].reason='Confirm the shared service boundary';assert.equal(starterStepError(c,1),'')
 c.requirements[0].form_approved=false;assert.match(starterStepError(c,2),/independent approval/);c.requirements[0].form_approved=true
 assert.match(starterStepError(c,3),/respondent/);c.respondent_scope_ids=['information-security','operations'];assert.equal(starterStepError(c,3),'')
})
test('question navigation retains the configured group and revision after a newer version exists',()=>{
 const r=requirement();const saved=freshStarterConfiguration([r],'owner');const newer={...r,form_template_version:4,group_id:'updated_group'}
 assert.equal(saved.requirements[0].form_template_version,3);assert.equal(groupHref(saved.requirements[0]),'?screen=assessment&form=form-iso&version=3&group=privileged_access');assert.notEqual(groupHref(newer),groupHref(saved.requirements[0]))
})
test('an empty starter pack cannot be treated as reviewed',()=>assert.match(starterStepError(freshStarterConfiguration([],'owner'),3),/No starter requirements/))

test('returning to default wording keeps the Program snapshot and its configured questionnaire version',()=>{
 const saved={...requirement(),title:'Bank wording',original_title:'Original title',statement:'Bank-specific statement',decision:'TAILOR',reason:'Bank scope'}
 const restored=keepStarterWording(saved)
 assert.equal(restored.title,'Original title');assert.equal(restored.statement,saved.original_statement);assert.equal(restored.form_template_version,3);assert.equal(restored.group_id,'privileged_access');assert.equal(restored.decision,'KEEP');assert.equal(restored.reason,'');assert.equal(saved.title,'Bank wording')
})
