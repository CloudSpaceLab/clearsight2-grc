(function(root){
  const templates = [{id:'access',revision:3,name:'Access rights review',program:'Information security'},{id:'vendor',revision:2,name:'Vendor due diligence',program:'Third-party oversight'}];
  const policies = ['DIRECT_LINK_EMAIL_OTP','DIRECT_MAGIC_LINK','SHARED_LINK_EMAIL_OTP'];
  function validate(draft, now = Date.now()) {
    const template = templates.find(t => t.id === draft.template);
    if (!template || template.program !== draft.program) return 'Select an active revision for the chosen Program.';
    if (!draft.title.trim() || !draft.purpose.trim()) return 'Enter a request title and purpose.';
    if (!draft.recipients.some(r => r.role === 'To')) return 'Add at least one To recipient.';
    if (new Set(draft.recipients.map(r => r.name)).size !== draft.recipients.length) return 'Each recipient can appear once.';
    const deadline = Date.parse(draft.deadline), expiry = Date.parse(draft.expiry);
    if (!(deadline > now && expiry > now && expiry <= deadline)) return 'Enter future dates with link expiry at or before the deadline.';
    if (!Number.isInteger(draft.minutes) || draft.minutes < 1 || draft.minutes > 60) return 'Estimated time must be 1–60 minutes.';
    if (!policies.includes(draft.policy)) return 'Select a verification policy.';
    return '';
  }
  function dispatch(draft, id, now = Date.now()) {
    const error = validate(draft, now); if (error) throw Error(error);
    const template = templates.find(t => t.id === draft.template);
    return {...draft,id,templateName:template.name,revision:template.revision,deadline:new Date(draft.deadline).toISOString(),expiry:new Date(draft.expiry).toISOString(),recipients:draft.recipients.map(r=>({...r,delivery:'Not delivered · simulation',response:r.role==='To'?'Awaiting response':'No response task',review:'Not reviewed'}))};
  }
  function status(record, now = Date.now()) {
    if (record.recipients.filter(r=>r.role==='To').every(r=>r.response==='Submitted')) return 'Submitted';
    return Date.parse(record.deadline)<now?'Overdue':'Awaiting response';
  }
  function updateResponse(record, actor, expectedRevision, action, value, now = Date.now()) {
    const current = record.submission;
    const respondent = record.recipients.find(r => r.role === 'To' && r.response === 'Submitted');
    if (!current || !respondent || current.revision !== expectedRevision) throw Error('The response changed. Reopen the latest revision.');
    const text = value.trim();
    if (!text || text.length > 1000) throw Error('Enter 1–1000 characters.');
    if (action === 'resubmit') {
      if (actor !== 'respondent' || respondent.review !== 'Changes requested') throw Error('Only the assigned respondent can revise a returned response.');
      return {
        ...record,
        previousSubmissions: [...(record.previousSubmissions || []), current],
        submission: { ...current, revision: current.revision + 1, answer: text, submittedAt: new Date(now).toISOString() },
        recipients: record.recipients.map(r => r === respondent ? {...r, review:'Awaiting independent review'} : r),
      };
    }
    if (!['Changes requested','Review recorded'].includes(action) || actor !== 'reviewer' || respondent.review !== 'Awaiting independent review') {
      throw Error('An assigned independent reviewer must review a pending revision.');
    }
    return {
      ...record,
      reviewHistory: [...(record.reviewHistory || []), {revision:current.revision, decision:action, rationale:text, actor:'Alex · Compliance', at:new Date(now).toISOString()}],
      recipients: record.recipients.map(r => r === respondent ? {...r, review:action} : r),
    };
  }
  const api={templates,validate,dispatch,status,updateResponse};if(typeof module!=='undefined')module.exports=api;root.DistributionModel=api;
})(globalThis);
