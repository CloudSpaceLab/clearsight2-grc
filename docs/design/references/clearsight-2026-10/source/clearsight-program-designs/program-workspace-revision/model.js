/* Design-only workflow simulator. Never use this for production authorization. */
(function(root){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const actors={contributor:{id:'sample-contributor',name:'Sample contributor',role:'Contributor'},reviewer:{id:'sample-reviewer',name:'Sample reviewer',role:'Reviewer'},owner:{id:'sample-owner',name:'Sample Program owner',role:'Program owner'}};
  const types={access:{name:'Access review',form:'Access governance questionnaire',questions:[{id:'reviewer',label:'Who reviewed privileged access, and when?'},{id:'exceptions',label:'Which access exceptions remain, and what evidence supports the response?'}]},vendor:{name:'Vendor security review',form:'Vendor security questionnaire',questions:[{id:'service',label:'Which vendor service and data categories are in scope?'},{id:'controls',label:'Which security controls and supporting documents were reviewed?'}]},recovery:{name:'Recovery exercise',form:'Recovery evidence questionnaire',questions:[{id:'test',label:'What recovery scenario was tested, and when?'},{id:'result',label:'What was observed, and which exceptions require follow-up?'}]}};
  const outcomes={meets:'Meets the sample criterion',gap:'Gap identified',needs_information:'More information required'};
  const id=prefix=>prefix+'-'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(16).slice(2));
  const now=()=>new Date().toISOString();
  function requireValue(value,message,max=5000){if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw Error(message);return value.trim();}
  function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
  function validateSchedule(value){
    if(!['monthly','quarterly','yearly','event'].includes(value.frequency))throw Error('Choose a supported frequency.');
    if(value.frequency==='event')requireValue(value.trigger,'Enter the event that opens an assessment cycle.',300);
    else if(!validDate(value.nextDate))throw Error('Enter a valid next-cycle date.');
    requireValue(value.owner,'Choose a responsible team.',100);
    return {frequency:value.frequency,nextDate:value.frequency==='event'?'':value.nextDate,trigger:value.frequency==='event'?value.trigger.trim():'',owner:value.owner.trim()};
  }
  function seed(){
    const submitted={revision:1,answers:{reviewer:'Service owners reviewed privileged access on 5 November 2026.',exceptions:'One service account needs owner clarification. See the attached access register.'},submittedBy:actors.contributor.id,at:'2026-11-06T10:00:00Z'};
    return {schema:1,revision:1,program:{id:'sample-program',name:'Information security',owner:'Information Security',jurisdiction:'Nigeria',nextReview:'2026-12-01'},assessments:[
      {id:'as-1',version:1,type:'access',name:'Access rights recertification',cycle:'Q4 2026',owner:'Identity & Access',due:'2026-11-20',status:'Submitted',createdBy:actors.contributor.id,updated:'2026-11-06T10:00:00Z',answers:copy(submitted.answers),responses:[submitted],reviews:[],schedule:{frequency:'quarterly',nextDate:'2027-01-15',trigger:'',owner:'Identity & Access'},pendingSchedule:null},
      {id:'as-2',version:1,type:'vendor',name:'Supplier security assessment',cycle:'2026 annual review',owner:'Third-Party Risk',due:'2026-11-25',status:'Draft',createdBy:actors.contributor.id,updated:'2026-11-03T09:00:00Z',answers:{service:'Cloud document storage; restricted operational records.',controls:''},responses:[],reviews:[],schedule:{frequency:'yearly',nextDate:'2027-11-01',trigger:'',owner:'Third-Party Risk'},pendingSchedule:null}
    ],issues:[{id:'issue-1',version:1,reference:'ISS-001',title:'Service account owner needs clarification',assessmentId:'as-1',owner:'Identity & Access',priority:'High',status:'Open',due:'2026-11-20',description:'Confirm the accountable owner before the access review can be completed.',resolution:'',resolvedBy:null}],documents:[{id:'doc-1',assessmentId:'as-1',name:'Sample access review register.txt',mime:'text/plain',content:'SAMPLE DATA ONLY\nProgram: Information security\nOne service account requires an accountable owner.\n',status:'Submitted',submittedBy:actors.contributor.id,at:'2026-11-06T10:00:00Z',version:1}],activity:[{id:'event-seed',at:'2026-11-06T10:00:00Z',actor:actors.contributor.name,kind:'Submission',target:'as-1',text:'Access review response revision 1 submitted.'}]};
  }
  class Store{
    constructor(saved=null,persist=()=>{}){
      if(saved&&(saved.schema!==1||!Number.isInteger(saved.revision)||!saved.program||!Array.isArray(saved.assessments)||!Array.isArray(saved.issues)||!Array.isArray(saved.documents)||!Array.isArray(saved.activity)))throw Error('Saved preview format is invalid. Reset the sample workspace to continue.');
      this.state=copy(saved||seed());this.persist=persist;
    }
    read(){return copy(this.state);}
    commit(actorKey,kind,target,text,change){
      const actor=actors[actorKey];if(!actor)throw Error('Choose a sample actor.');
      const next=copy(this.state);const result=change(next,actor);
      next.revision++;next.activity.unshift({id:id('event'),at:now(),actor:actor.name,kind,target:typeof target==='function'?target(result):target,text:typeof text==='function'?text(result):text});
      this.persist(copy(next));this.state=next;return copy(result??next);
    }
    assessment(next,recordId,expected){const record=next.assessments.find(value=>value.id===recordId);if(!record)throw Error('Assessment not found.');if(record.version!==expected)throw Error('This assessment changed. Reload its current version before saving.');return record;}
    editable(record,actor){if(!['Contributor','Program owner'].includes(actor.role))throw Error('Choose Contributor or Program owner to edit a response.');if(!['Draft','Changes requested'].includes(record.status))throw Error('Submitted responses are immutable. Request changes before starting a new revision.');}
    create(actor,input){return this.commit(actor,'Assessment',r=>r.id,r=>'Created draft assessment: '+r.name,(next,person)=>{
      if(!['Contributor','Program owner'].includes(person.role))throw Error('Choose Contributor or Program owner to create an assessment.');
      if(!types[input.type])throw Error('Choose an assessment type.');if(!validDate(input.due))throw Error('Enter a valid due date.');
      const record={id:id('assessment'),version:1,type:input.type,name:requireValue(input.name,'Enter a cycle name.',150),cycle:requireValue(input.cycle,'Enter the assessment cycle.',100),owner:requireValue(input.owner,'Choose a responsible team.',100),due:input.due,status:'Draft',createdBy:person.id,updated:now(),answers:{},responses:[],reviews:[],schedule:validateSchedule(input.schedule),pendingSchedule:null};next.assessments.unshift(record);return record;
    });}
    save(actor,recordId,expected,answers,submit=false){return this.commit(actor,submit?'Submission':'Draft',recordId,submit?'Response submitted for independent review.':'Response draft saved locally.',(next,person)=>{
      const record=this.assessment(next,recordId,expected);this.editable(record,person);
      const clean={};for(const question of types[record.type].questions){const value=answers[question.id]||'';if(typeof value!=='string'||value.length>5000)throw Error('Keep each answer within 5,000 characters.');clean[question.id]=value.trim();if(submit&&!clean[question.id])throw Error('Answer every required question before submitting.');}
      record.answers=clean;if(submit){record.responses.push({revision:record.responses.length+1,answers:copy(clean),submittedBy:person.id,at:now()});record.status='Submitted';}
      record.version++;record.updated=now();return record;
    });}
    review(actor,recordId,expected,decisions,requestChanges=false){return this.commit(actor,'Review',recordId,requestChanges?'Reviewer requested a new response revision.':'Recorded independent field-review decisions; no compliance score calculated.',(next,person)=>{
      const record=this.assessment(next,recordId,expected),response=record.responses.at(-1);
      if(person.role!=='Reviewer')throw Error('Choose the separate Reviewer to assess this response.');
      if(record.status!=='Submitted'||!response)throw Error('Only a submitted response can be reviewed.');
      if(response.submittedBy===person.id)throw Error('A respondent cannot review their own submission.');
      const clean=types[record.type].questions.map(question=>{const decision=decisions[question.id];if(!decision||!outcomes[decision.outcome])throw Error('Choose a rubric outcome for every question.');return {field:question.id,outcome:decision.outcome,rationale:requireValue(decision.rationale,'Explain each field-review decision.',1000)};});
      record.reviews.push({revision:response.revision,reviewer:person.id,at:now(),decisions:clean,requestChanges});record.status=requestChanges?'Changes requested':'Reviewed';record.version++;record.updated=now();return record;
    });}
    proposeSchedule(actor,recordId,expected,input){return this.commit(actor,'Configuration',recordId,'Assessment schedule proposed for independent approval; effective schedule unchanged.',(next,person)=>{
      if(!['Contributor','Program owner'].includes(person.role))throw Error('Choose Contributor or Program owner to propose configuration.');
      const record=this.assessment(next,recordId,expected);record.pendingSchedule={...validateSchedule(input),proposedBy:person.id,proposedAt:now()};record.version++;return record;
    });}
    decideSchedule(actor,recordId,expected,approve){return this.commit(actor,'Configuration',recordId,approve?'Proposed schedule approved locally; no scheduler is connected.':'Proposed schedule rejected; effective schedule unchanged.',(next,person)=>{
      if(person.role!=='Reviewer')throw Error('Choose the Reviewer to approve or reject a proposed schedule.');
      const record=this.assessment(next,recordId,expected);if(!record.pendingSchedule)throw Error('There is no proposed schedule.');if(record.pendingSchedule.proposedBy===person.id)throw Error('The proposer cannot approve their own schedule.');
      if(approve){const {proposedBy,proposedAt,...schedule}=record.pendingSchedule;record.schedule=schedule;}record.pendingSchedule=null;record.version++;return record;
    });}
    issue(actor,input,recordId=null,expected=null){return this.commit(actor,'Issue',r=>r.id,r=>'Issue '+r.reference+': '+r.status,(next,person)=>{
      if(!['Contributor','Program owner'].includes(person.role))throw Error('Choose Contributor or Program owner to create or update an issue.');
      let record=recordId?next.issues.find(value=>value.id===recordId):null;if(recordId&&(!record||record.version!==expected))throw Error('The issue changed. Reopen it before saving.');
      if(!['Open','In progress','Resolved'].includes(input.status))throw Error('Choose a valid issue status.');if(!['Low','Medium','High','Critical'].includes(input.priority))throw Error('Choose a priority.');if(!validDate(input.due))throw Error('Enter a valid due date.');
      if(record?.status==='Closed')throw Error('A verified closed issue cannot be edited in this preview.');
      const fields={title:requireValue(input.title,'Enter an issue title.',200),description:requireValue(input.description,'Describe the issue.',2000),owner:requireValue(input.owner,'Choose an owner.',100),priority:input.priority,due:input.due,assessmentId:input.assessmentId||null,status:input.status,resolution:input.status==='Resolved'?requireValue(input.resolution,'Record the resolution evidence before resolving.',2000):''};
      if(fields.assessmentId&&!next.assessments.some(value=>value.id===fields.assessmentId))throw Error('Choose an existing linked assessment.');
      if(!record){record={id:id('issue'),reference:'ISS-'+String(next.issues.length+1).padStart(3,'0'),version:0};next.issues.unshift(record);}
      Object.assign(record,fields,{version:record.version+1,resolvedBy:fields.status==='Resolved'?person.id:null});return record;
    });}
    verifyIssue(actor,recordId,expected,note){return this.commit(actor,'Verification',recordId,'Issue closure verified by a separate reviewer.',(next,person)=>{
      const record=next.issues.find(value=>value.id===recordId);if(!record||record.version!==expected)throw Error('The issue changed. Reopen it.');if(person.role!=='Reviewer'||record.resolvedBy===person.id)throw Error('Choose an independent Reviewer to verify closure.');if(record.status!=='Resolved')throw Error('Record a resolution before verifying closure.');record.verification=requireValue(note,'Record what was checked.',2000);record.status='Closed';record.version++;return record;
    });}
    addDocument(actor,input){return this.commit(actor,'Document',r=>r.id,r=>'Document submitted: '+r.name,(next,person)=>{
      if(!['Contributor','Program owner'].includes(person.role))throw Error('Choose Contributor or Program owner to submit a document.');
      if(!next.assessments.some(value=>value.id===input.assessmentId))throw Error('Choose a linked assessment.');
      const allowed=['text/plain','text/markdown','text/csv','application/pdf','image/png','image/jpeg'];if(!allowed.includes(input.mime))throw Error('Use TXT, MD, CSV, PDF, PNG or JPEG.');
      if(!Number.isInteger(input.size)||input.size<1||input.size>524288)throw Error('Choose a non-empty file up to 512 KB for this local prototype.');
      if(typeof input.data!=='string'||!input.data.startsWith('data:')||input.data.length>750000)throw Error('The file could not be read within the local limit.');
      const record={id:id('doc'),version:1,name:requireValue(input.name,'Choose a named document.',200),mime:input.mime,size:input.size,data:input.data,assessmentId:input.assessmentId,status:'Submitted',submittedBy:person.id,at:now()};next.documents.unshift(record);return record;
    });}
    reviewDocument(actor,recordId,expected,note){return this.commit(actor,'Document review',recordId,'Document review recorded; submission is not a compliance conclusion.',(next,person)=>{
      const record=next.documents.find(value=>value.id===recordId);if(!record||record.version!==expected)throw Error('The document changed. Reopen it.');if(person.role!=='Reviewer'||record.submittedBy===person.id)throw Error('Choose an independent Reviewer to review this document.');if(record.status!=='Submitted')throw Error('This document was already reviewed.');record.reviewNote=requireValue(note,'Explain the document review.',2000);record.reviewedBy=person.id;record.status='Reviewed';record.version++;return record;
    });}
    updateProgram(actor,input){return this.commit(actor,'Program','sample-program','Program details updated locally.',(next,person)=>{if(person.role!=='Program owner')throw Error('Choose Program owner to update Program details.');if(!validDate(input.nextReview))throw Error('Enter a valid review date.');Object.assign(next.program,{name:requireValue(input.name,'Enter a Program name.',150),owner:requireValue(input.owner,'Enter the accountable team.',100),jurisdiction:requireValue(input.jurisdiction,'Enter a jurisdiction.',100),nextReview:input.nextReview});return next.program;});}
  }
  const api={Store,seed,actors,types,outcomes,validateSchedule};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ProgramRevision=api;
})(typeof globalThis!=='undefined'?globalThis:this);
