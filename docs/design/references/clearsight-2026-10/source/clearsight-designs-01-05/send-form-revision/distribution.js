(() => {
  const M=DistributionModel, $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const key='clearsight-distribution-prototype', form=$('#compose');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=v=>new Date(v).toLocaleString();
  const toLocal=ms=>{const d=new Date(ms);return new Date(ms-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
  const sample=(id,title,offset,submitted)=>({id,title,program:'Information security',templateName:'Access rights review',revision:3,deadline:new Date(Date.now()+offset*86400000).toISOString(),purpose:'Confirm quarterly review ownership.',submission:submitted?{revision:1,answer:'Identity & Access',evidence:'Quarterly access review register'}:null,recipients:[{name:'Jordan · Identity & Access',role:'To',delivery:'Delivered · sample',response:submitted?'Submitted':'Awaiting response',review:submitted?'Awaiting independent review':'Not reviewed'}]});
  let saved=[];try{saved=JSON.parse(localStorage.getItem(key)||'[]')}catch{}
  const records=(stored=saved)=>[...stored,...[sample('REQ-1038','Quarterly access recertification',5,true),sample('REQ-1037','Privileged account exceptions',-4,false)].filter(seed=>!stored.some(record=>record.id===seed.id))];
  let recipients=[],pending=null,selected=null,opener=null;
  function notify(s){$('#notice').textContent=s}
  function open(dialog){opener=document.activeElement;dialog.showModal()}
  $$('dialog').forEach(d=>d.addEventListener('close',()=>opener?.isConnected&&opener.focus()));
  function tab(name,focus=false){for(const t of $$('[data-tab]')){const active=t.dataset.tab===name;t.tabIndex=active?0:-1;t.setAttribute('aria-selected',active);$('#'+t.dataset.tab).hidden=!active;if(active&&focus)t.focus()}history.replaceState(null,'','#'+name);if(name==='sent')renderSent()}
  function renderRecipients(){ $('#recipients').innerHTML=recipients.map((r,i)=>`<li><span><strong>${esc(r.name)}</strong> · ${r.role}</span><button class="button" type="button" data-remove="${i}" aria-label="Remove ${esc(r.name)}">Remove</button></li>`).join('')||'<li>No recipients selected.</li>' }
  function renderSent(){ const q=$('#search').value.trim().toLowerCase(),f=$('#filter').value;const matching=records().filter(r=>(!f||M.status(r)===f)&&[r.title,r.program,r.id].join(' ').toLowerCase().includes(q));$('#result-count').textContent=matching.length+' matching requests';$('#requests').innerHTML=matching.map(r=>`<button class="saved-row" data-request="${esc(r.id)}" aria-pressed="${selected===r.id}"><span><strong>${esc(r.title)}</strong><small>${esc(r.id)} · ${esc(r.program)} · Revision ${r.revision}</small><small>Due ${esc(date(r.deadline))}</small></span><span class="request-status">${M.status(r)}</span></button>`).join('')||'<p>No requests match these filters.</p>';const r=matching.find(r=>r.id===selected);$('#request-detail').innerHTML=r?`<div class="eyebrow">${esc(r.id)}</div><h2>${esc(r.title)}</h2><p>${esc(r.purpose)}</p><p>${esc(r.templateName)} · Revision ${r.revision} · ${esc(r.program)}</p><p>Due ${esc(date(r.deadline))}</p><p>Response status: ${M.status(r)}</p>${r.recipients.map(v=>`<section><h3>${esc(v.name)} · ${v.role}</h3><dl><dt>Delivery</dt><dd>${esc(v.delivery)}</dd><dt>Response</dt><dd>${esc(v.response)}</dd><dt>Review</dt><dd>${esc(v.review)}</dd></dl></section>`).join('')}${r.recipients.some(v=>v.response==='Submitted')?'<button class="button" id="view-response">Inspect sample response</button>':''}`:'<h2>Select a request</h2><p>Inspect its pinned revision and recipient statuses.</p>'; }
  $('#template').insertAdjacentHTML('beforeend',M.templates.map(t=>`<option value="${t.id}">${t.name} · Revision ${t.revision}</option>`).join(''));
  $('#template').onchange=e=>{const t=M.templates.find(t=>t.id===e.target.value);$('#template-title').textContent=t?.name||'Select a template';$('#template-context').textContent=t?`Active sample revision ${t.revision} · ${t.program}`:'The approved revision is pinned when you send.';if(t)$('#program').value=t.program};
  form.elements.deadline.value=toLocal(Date.now()+21*86400000);form.elements.expiry.value=toLocal(Date.now()+20*86400000);
  $('#add').onclick=()=>{const name=$('#person').value;if(recipients.some(r=>r.name===name)){notify('This person is already selected. Remove them to change their role.');return}recipients.push({name,role:$('#role').value});renderRecipients();notify(name+' added.')};
  form.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(form));d.minutes=Number(d.minutes);d.recipients=structuredClone(recipients);const error=M.validate(d);$('#error').textContent=error;if(error){$('#error').focus();return}pending=d;const t=M.templates.find(t=>t.id===d.template);$('#confirmation').innerHTML=`<p><strong>${esc(d.title)}</strong></p><p>${esc(d.purpose)}</p><p>${t.name} · Revision ${t.revision} · ${esc(d.program)}</p><p>Deadline ${esc(date(d.deadline))} · Link expiry ${esc(date(d.expiry))}</p><p>${esc(form.elements.policy.selectedOptions[0].textContent)} · ${d.minutes} minutes</p><ul>${d.recipients.map(r=>`<li>${esc(r.name)} · ${r.role}</li>`).join('')}</ul>`;open($('#confirm'))};
  $('#cancel').onclick=()=>$('#confirm').close();$('#dispatch').onclick=()=>{if(!pending)return;try{const r=M.dispatch(pending,'REQ-'+Date.now().toString(36).toUpperCase());const current=JSON.parse(localStorage.getItem(key)||'[]');const next=[r,...current];localStorage.setItem(key,JSON.stringify(next));saved=next;pending=null;selected=r.id;recipients=[];renderRecipients();$('#confirm').close();tab('sent',true);notify('Sample request '+r.id+' created. Delivery has not occurred.')}catch(e){$('#confirm').close();$('#error').textContent=e.message;$('#error').focus()}};
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.tab)tab(b.dataset.tab);if(b.dataset.remove!==undefined){recipients.splice(Number(b.dataset.remove),1);renderRecipients();$('#add').focus()}if(b.dataset.request){selected=b.dataset.request;renderSent();$(`[data-request="${selected}"]`)?.focus()}if(b.id==='view-response')showResponse()});
  let reviewActor = 'reviewer';
  function showResponse() {
    renderResponse();
    open($('#response'));
  }
  function renderResponse() {
    const request = records().find(record => record.id === selected);
    const respondent = request?.recipients.find(recipient => recipient.response === 'Submitted');
    if (!request?.submission || !respondent) return;
    const submission = request.submission;
    $('#response-reference').textContent = request.id + ' / Sample response';
    $('#response-body').innerHTML = `
      <div class="response-intro"><h3>${esc(request.title)}</h3><span class="response-chip">Submitted</span></div>
      <dl class="response-metadata">
        <div><dt>Respondent</dt><dd>${esc(respondent.name)}</dd></div>
        <div><dt>Program</dt><dd>${esc(request.program)}</dd></div>
        <div><dt>Template revision</dt><dd>${esc(request.templateName)} · ${request.revision}</dd></div>
        <div><dt>Response revision</dt><dd>${submission.revision}</dd></div>
      </dl>
      <section class="response-card"><h3>Answer</h3><dl><dt>Accountable team</dt><dd>${esc(submission.answer)}</dd></dl></section>
      <section class="response-card"><h3>Referenced evidence</h3><strong>${esc(submission.evidence)}</strong><p>Scan status unavailable in this preview.</p></section>
      <section class="response-card"><h3>Review status</h3><strong>${esc(respondent.review)}</strong></section>
      <section class="response-card"><h3>Review history</h3>${(request.reviewHistory || []).map(entry=>`<article class="review-history-item"><strong>Revision ${entry.revision} · ${esc(entry.decision)}</strong><p>${esc(entry.rationale)}</p><p>${esc(entry.actor)} · ${esc(date(entry.at))}</p></article>`).join('')||'<p>No decisions recorded.</p>'}${(request.previousSubmissions || []).map(entry=>`<details><summary>View response revision ${entry.revision}</summary><p>Accountable team: ${esc(entry.answer)}</p></details>`).join('')}</section>
      <section class="response-card review-actions"><h3>Continue this sample workflow</h3><label>Sample role<select id="review-actor"><option value="reviewer">Independent reviewer · Alex</option><option value="respondent">Assigned respondent · Jordan</option></select></label>
      ${reviewActor==='reviewer' && respondent.review==='Awaiting independent review'?`<form id="response-action"><label>Decision<select name="action"><option>Changes requested</option><option>Review recorded</option></select></label><label>Rationale<textarea name="value" maxlength="1000" required></textarea></label><button class="button primary" type="submit">Record decision</button></form>`:reviewActor==='respondent' && respondent.review==='Changes requested'?`<form id="response-action"><input type="hidden" name="action" value="resubmit"><label>Revised accountable team<textarea name="value" maxlength="1000" required>${esc(submission.answer)}</textarea></label><button class="button primary" type="submit">Resubmit sample response</button></form>`:'<p>Choose the sample role responsible for the next step when an action is available.</p>'}<p id="response-feedback" role="status"></p></section>`;
    $('#review-actor').value=reviewActor;
    $('#review-actor').onchange=e=>{reviewActor=e.target.value;renderResponse();$('#review-actor').focus()};
    const actionForm=$('#response-action');
    if(actionForm)actionForm.onsubmit=e=>{
      e.preventDefault();
      const {action,value}=Object.fromEntries(new FormData(actionForm));
      try {
        const stored=JSON.parse(localStorage.getItem(key)||'[]');
        const latest=records(stored).find(record=>record.id===request.id);
        const next=M.updateResponse(latest,reviewActor,submission.revision,action,value);
        const updated=[next,...stored.filter(record=>record.id!==next.id)];
        localStorage.setItem(key,JSON.stringify(updated));
        saved=updated;
        renderSent();
        opener=$('#view-response');
        renderResponse();
        $('#response-feedback').textContent=action==='resubmit'?'New response revision submitted locally.':'Review decision saved locally.';
        $('#review-actor').focus();
      } catch (error) { $('#response-feedback').textContent=error.message }
    };
  }
  $('#close-response').onclick=()=>$('#response').close();$('#search').oninput=renderSent;$('#filter').onchange=renderSent;
  document.addEventListener('keydown',e=>{if(!e.target.dataset.tab||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();tab(e.key==='Home'?'send':e.key==='End'?'sent':e.target.dataset.tab==='send'?'sent':'send',true)});
  $$('.nav-item').forEach(a=>a.onclick=e=>{e.preventDefault();notify('This preview covers form distribution. Use the Send form and Sent forms tabs.')});
  const theme=$('#theme-toggle');if(theme)theme.onclick=()=>{const dark=document.body.dataset.theme!=='dark';document.body.dataset.theme=dark?'dark':'light';theme.setAttribute('aria-label',dark?'Switch to light appearance':'Switch to dark appearance');theme.setAttribute('aria-pressed',dark)};
  renderRecipients();tab(location.hash==='#sent'?'sent':'send');
})();
