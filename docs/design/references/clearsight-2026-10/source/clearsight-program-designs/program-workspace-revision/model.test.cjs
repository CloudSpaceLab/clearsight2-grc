const test=require('node:test');
const assert=require('node:assert/strict');
const {Store,seed,types}=require('./model.js');
const complete={reviewer:'Service owners reviewed access on 9 November.',exceptions:'One exception recorded with supporting evidence.'};
const input={type:'access',name:'Access review Q1',cycle:'Q1 2027',owner:'Identity & Access',due:'2027-01-31',schedule:{frequency:'quarterly',nextDate:'2027-01-15',trigger:'',owner:'Identity & Access'}};
const decisions={reviewer:{outcome:'meets',rationale:'Named reviewer and review date supplied.'},exceptions:{outcome:'gap',rationale:'Owner clarification remains outstanding.'}};

test('incomplete submission fails without a response, version increment or event',()=>{
 const s=new Store(),before=s.read();assert.throws(()=>s.save('contributor','as-2',1,{service:'Cloud storage'},true),/every required/);assert.deepEqual(s.read(),before);
});
test('draft creation, saving, submission and immutable revision history',()=>{
 const s=new Store();let r=s.create('contributor',input);assert.equal(r.status,'Draft');r=s.save('contributor',r.id,r.version,complete);r=s.save('contributor',r.id,r.version,complete,true);
 assert.equal(r.status,'Submitted');assert.equal(r.responses.length,1);assert.throws(()=>s.save('contributor',r.id,r.version,complete),/immutable/);
 r=s.review('reviewer',r.id,r.version,decisions,true);assert.equal(r.status,'Changes requested');r=s.save('contributor',r.id,r.version,{...complete,exceptions:'Exception remediated and documented.'},true);
 assert.equal(r.responses.length,2);assert.equal(r.responses[0].answers.exceptions,complete.exceptions);assert.notEqual(r.responses[0].answers.exceptions,r.responses[1].answers.exceptions);
});
test('review requires a different actor and a rationale for every field',()=>{
 const s=new Store(),before=s.read();assert.throws(()=>s.review('contributor','as-1',1,decisions),/separate Reviewer/);assert.throws(()=>s.review('reviewer','as-1',1,{}),/every question/);assert.deepEqual(s.read(),before);
 const own=seed();own.assessments[0].responses[0].submittedBy='sample-reviewer';assert.throws(()=>new Store(own).review('reviewer','as-1',1,decisions),/own submission/);
 const reviewed=s.review('reviewer','as-1',1,decisions);assert.equal(reviewed.status,'Reviewed');assert.equal(reviewed.reviews[0].decisions.length,types.access.questions.length);assert.equal(reviewed.score,undefined);
});
test('stale expected versions cannot overwrite a current draft',()=>{
 const s=new Store();s.save('contributor','as-2',1,{service:'Updated'});const before=s.read();assert.throws(()=>s.save('contributor','as-2',1,{service:'Stale'}),/changed/);assert.deepEqual(s.read(),before);
});
test('schedule proposal does not become effective until independent approval',()=>{
 const s=new Store();let r=s.proposeSchedule('owner','as-1',1,{frequency:'monthly',nextDate:'2027-01-20',trigger:'',owner:'Information Security'});
 assert.equal(r.schedule.frequency,'quarterly');assert.equal(r.pendingSchedule.frequency,'monthly');assert.throws(()=>s.decideSchedule('owner',r.id,r.version,true),/Reviewer/);
 r=s.decideSchedule('reviewer',r.id,r.version,true);assert.equal(r.schedule.frequency,'monthly');assert.equal(r.pendingSchedule,null);
});
test('event schedules require a trigger; invalid calendar dates are rejected',()=>{
 const s=new Store();assert.throws(()=>s.proposeSchedule('owner','as-1',1,{frequency:'event',trigger:'',owner:'Security'}),/event/);
 assert.throws(()=>s.proposeSchedule('owner','as-1',1,{frequency:'monthly',nextDate:'2027-02-30',owner:'Security'}),/valid/);
 const r=s.proposeSchedule('owner','as-1',1,{frequency:'event',trigger:'Service changes',owner:'Security'});assert.equal(r.pendingSchedule.nextDate,'');
});
test('issue resolution requires evidence and a separate closure verifier',()=>{
 const s=new Store(),input={title:'Owner clarification',description:'Check account ownership',owner:'Security',priority:'High',status:'Resolved',due:'2026-12-01',resolution:'',assessmentId:'as-1'};
 assert.throws(()=>s.issue('contributor',input,'issue-1',1),/resolution evidence/);
 let r=s.issue('contributor',{...input,resolution:'Owner attestation attached.'},'issue-1',1);assert.equal(r.status,'Resolved');assert.throws(()=>s.verifyIssue('contributor',r.id,r.version,'Checked'),/independent/);
 r=s.verifyIssue('reviewer',r.id,r.version,'Checked the attestation and account register.');assert.equal(r.status,'Closed');
});
test('document submission is separate from review and enforces local file limits',()=>{
 const s=new Store(),input={assessmentId:'as-2',name:'Sample.txt',mime:'text/plain',size:10,data:'data:text/plain;base64,U2FtcGxl'};
 assert.throws(()=>s.addDocument('contributor',{...input,size:900000}),/512 KB/);assert.throws(()=>s.addDocument('contributor',{...input,mime:'text/html'}),/TXT/);
 let d=s.addDocument('contributor',input);assert.equal(d.status,'Submitted');assert.throws(()=>s.reviewDocument('contributor',d.id,1,'Checked'),/Reviewer/);
 d=s.reviewDocument('reviewer',d.id,1,'Verified the expected sample document contents.');assert.equal(d.status,'Reviewed');
});
test('failed storage writes roll back the complete mutation and event',()=>{
 const s=new Store(null,()=>{throw Error('Storage quota exceeded');}),before=s.read();assert.throws(()=>s.create('contributor',input),/quota/);assert.deepEqual(s.read(),before);
});
test('Program settings require the Program owner; unknown roles fail closed',()=>{
 const s=new Store(),change={name:'Updated sample',owner:'Security',jurisdiction:'NG',nextReview:'2027-01-15'};
 assert.throws(()=>s.updateProgram('contributor',change),/Program owner/);assert.throws(()=>s.create('forged',input),/sample actor/);assert.equal(s.updateProgram('owner',change).name,'Updated sample');
});
test('round-trip saved state retains revisions and local decisions',()=>{
 const s=new Store();s.review('reviewer','as-1',1,decisions);const restored=new Store(JSON.parse(JSON.stringify(s.read())));assert.deepEqual(restored.read(),s.read());
 assert.throws(()=>new Store({schema:99}),/invalid/);
});
