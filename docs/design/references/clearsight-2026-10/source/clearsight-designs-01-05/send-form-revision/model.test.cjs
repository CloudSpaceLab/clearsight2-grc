const {test}=require('node:test'),a=require('node:assert/strict'),M=require('./model.js');
const now=Date.parse('2026-11-11T10:00Z');
const draft={template:'access',program:'Information security',title:'Review',purpose:'Quarterly review',deadline:'2026-11-20T10:00Z',expiry:'2026-11-19T10:00Z',minutes:10,policy:'DIRECT_LINK_EMAIL_OTP',recipients:[{name:'Jordan',role:'To'},{name:'Alex',role:'CC'}]};
test('pins active revision and distinguishes To, CC and delivery',()=>{const r=M.dispatch(draft,'REQ-1',now);a.equal(r.revision,3);a.equal(r.recipients[1].response,'No response task');a.match(r.recipients[0].delivery,/Not delivered/);a.equal(M.status(r,now),'Awaiting response');a.equal(M.status(r,Date.parse('2026-11-21')),'Overdue');r.recipients[0].response='Submitted';a.equal(M.status(r,Date.parse('2026-11-21')),'Submitted')});
test('rejects unscoped template and invalid expiry',()=>{a.match(M.validate({...draft,program:'Other'},now),/Program/);a.match(M.validate({...draft,expiry:'2026-11-21'},now),/expiry/)});
test('rejects CC-only, duplicate audience and invalid effort',()=>{a.match(M.validate({...draft,recipients:[draft.recipients[1]]},now),/To recipient/);a.match(M.validate({...draft,recipients:[draft.recipients[0],draft.recipients[0]]},now),/once/);a.match(M.validate({...draft,minutes:61},now),/1–60/)});

test('returned response retains its history and can be reviewed again',()=>{
  let record=M.dispatch(draft,'REQ-2',now);
  record={...record,submission:{revision:1,answer:'IAM'},recipients:record.recipients.map(r=>r.role==='To'?{...r,response:'Submitted',review:'Awaiting independent review'}:r)};
  a.throws(()=>M.updateResponse(record,'respondent',1,'Changes requested','Clarify owner',now));
  record=M.updateResponse(record,'reviewer',1,'Changes requested','Clarify owner',now);
  record=M.updateResponse(record,'respondent',1,'resubmit','IAM Operations',now);
  a.equal(record.previousSubmissions[0].answer,'IAM');
  a.equal(record.submission.revision,2);
  a.throws(()=>M.updateResponse(record,'reviewer',1,'Review recorded','Checked',now));
  record=M.updateResponse(record,'reviewer',2,'Review recorded','Owner clarified',now);
  a.deepEqual(record.reviewHistory.map(x=>x.revision),[1,2]);
  a.equal(record.recipients[0].review,'Review recorded');
});
