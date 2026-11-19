// The role selector simulates two distinct actors in the local preview.
const isoMode = new URLSearchParams(location.search).get('framework') === 'iso';
const guidedProgramDemo = new URLSearchParams(location.search).get('demo') === 'guided';
const isoStorage = 'clearsight.iso-bank-lifecycle.v1' + (guidedProgramDemo ? '.guided' : '');
let isoState;
let isoActor = 'owner';
function selectIsoProgram(id) {
  isoActor = 'owner';
  isoState = {...freshIsoLifecycle(), scope:programs[id].scope};
  try {
    const saved = JSON.parse(localStorage.getItem(isoProgramStorage(id)) || 'null');
    if (saved && Array.isArray(saved.decisions)) isoState = saved;
  } catch { /* The preview can still be explored with an unsaved session. */ }
  if (!guidedProgramDemo && ['setup','requirement-review','activation-review'].includes(isoState.stage)) {
    isoState = {...freshIsoLifecycle(), scope:programs[id].scope, stage:'active'};
  }
}

function isoProgramStorage(id) {
  return id === 'iso' ? isoStorage : `${isoStorage}.${id}`;
}

function isoMove(action, reason, fields) {
  const next = advanceIso(isoState, action, isoActor, reason, fields);
  if (typeof next === 'string') return next;
  try {
    localStorage.setItem(isoProgramStorage(program), JSON.stringify(next));
  } catch {
    return 'This browser could not save the demo decision.';
  }
  isoState = next;
  return true;
}

function renderIso() {
  const stage = isoState.stage;
  const editing = stage === 'active' && isoActor === 'owner';
  const names = {setup:'Program draft','requirement-review':'Requirement awaiting CRO review',
    'activation-review':'Program awaiting CRO activation',active:'Program active',
    'adoption-review':'Adoption awaiting CRO review',adopted:'Adoption approved'};
  const panel = $('#iso-lifecycle');
  $('#iso-program-title').closest('section').hidden = !guidedProgramDemo;
  $('#iso-program-scope').innerHTML = `<div class="program-body">
    <div class="field"><span class="field-label">Program</span><strong>${isoProgram.name}</strong></div>
    <div class="field"><span class="field-label">Legal entity</span><strong>${esc(isoState.bank)}</strong></div>
    <div class="field"><span class="field-label">Organization scope</span><strong>Digital banking</strong></div>
  </div><p class="iso-scope-copy">${esc(isoState.scope)}</p>`;
  $('#iso-setup-progress').hidden = !editing;
  $('#iso-questionnaire').hidden = !editing;
  $('.source-panel').hidden = false;
  panel.hidden = false;
  for (const selector of ['.context-panel','.wizard-steps','#step-content','.wizard-footer','#save-draft','#draft-badge']) {
    $(selector).hidden = !editing;
  }
  $('#proposal-receipt').hidden = true;
  $('#scope-copy').textContent = isoState.scope;
  const context = $('.context-panel');
  if (!$('#iso-review-guide')) {
    context.insertAdjacentHTML('afterend', '<section id="iso-review-guide" class="panel rail-inner" aria-labelledby="iso-guide-title"><h2 id="iso-guide-title">Review the ISO template for this Program</h2><p>Every Program starts with the same ISO starter requirements and linked question groups. Your selection changes the scope and the draft you are editing.</p><p id="iso-scope-example"></p><p>Keep the default, tailor the Program copy, or flag an applicability question with a reason. Resolve flagged items before continuing to monitoring.</p></section>');
  }
  $('#iso-review-guide').hidden = !editing || draft().step !== 1;
  const example = program === 'iso' ? 'mobile and internet banking administrators' :
    program === 'cloud' ? 'cloud administrators with access to customer data or core banking workloads' :
    'administrators of services within the information security management scope';
  $('#iso-scope-example').textContent = `For ${programs[program].name}, a Program Owner could tailor the privileged access requirement to cover ${example}. The linked questions still ask when access was reviewed and request supporting evidence.`;
  $('#iso-question-count').textContent = `Version 1 · ${counts(draft()).questions} linked questions`;
  const recent = isoState.decisions.at(-1);
  const review = isoActor==='cro' && ['requirement-review','activation-review','adoption-review'].includes(stage);
  panel.innerHTML = `<div class="rail-heading"><h2 tabindex="-1" id="iso-status">${names[stage]}</h2>
    <label class="field"><span class="field-label">Demo role</span><select id="iso-role"><option value="owner">Program Owner</option><option value="cro">Chief Risk Officer</option></select></label></div>

    ${guidedProgramDemo && stage!=='setup'?`<div class="notice"><strong>Initial Program requirement · privileged access</strong><br>${esc(isoState.requirement)}</div>`:''}
    ${recent?`<p><strong>Latest rationale · ${recent.actor==='cro'?'CRO':'Program Owner'}</strong><br>${esc(recent.reason)}</p>`:''}
    ${stage==='setup'&&isoActor==='owner'?'<button class="button primary" id="iso-prepare">Prepare Program</button>':''}
    ${review?'<button class="button primary" id="iso-review">Open CRO review</button>':''}
    ${!review&&['requirement-review','activation-review','adoption-review'].includes(stage)?'<p>Select Chief Risk Officer to open the independent demo review.</p>':''}
    ${stage==='active'&&!editing?'<p>Select Program Owner to configure ISO adoption.</p>':''}
    ${stage==='adopted'?'<p>The demo Program is active and the ISO adoption has a recorded CRO decision.</p><button class="button secondary" id="iso-view">View approved setup</button>':''}
    ${isoState.decisions.length?`<details class="review-question-settings"><summary>Decision history</summary><ol>${isoState.decisions.map(entry=>`<li><strong>${({submit:'Program and requirement submitted',approveRequirement:'Initial requirement approved',activate:'Program activated',submitAdoption:'Adoption submitted',approveAdoption:'Adoption approved',returnProgram:'Program returned',returnAdoption:'Adoption returned'})[entry.action]}</strong> · ${entry.actor==='cro'?'CRO':'Program Owner'}<br>${esc(entry.reason)}</li>`).join('')}</ol></details>`:''}`;
  $('#iso-role').value = isoActor;
  $('#iso-role').onchange = event => {
    isoActor = event.target.value;
    render();
    $('#iso-role').focus();
  };
  if ($('#iso-prepare')) $('#iso-prepare').onclick = prepareIso;
  if ($('#iso-review')) $('#iso-review').onclick = reviewIso;
  if ($('#iso-view')) $('#iso-view').onclick = () => openReview(false);
}

function prepareIso() {
  openModal('Prepare Program','PROGRAM OWNER · DEMO',`
    <label class="field"><span class="field-label">Bank name</span><input id="iso-bank" maxlength="120" value="${esc(isoState.bank)}"></label>
    <label class="field"><span class="field-label">Program scope</span><textarea id="iso-scope">${esc(isoState.scope)}</textarea></label>
    <label class="field"><span class="field-label">Initial requirement</span><textarea id="iso-requirement">${esc(isoState.requirement)}</textarea></label>
    <label class="field"><span class="field-label">Submission rationale</span><textarea id="iso-reason" placeholder="Explain why this Program and requirement are needed"></textarea></label>`,
    'Send to CRO', () => {
      const fields = Object.fromEntries(['bank','scope','requirement'].map(key => [key,$('#iso-'+key).value.trim()]));
      const result = isoMove('submit',$('#iso-reason').value,fields);
      if (result===true) render();
      return result;
    },{onClose:()=>$('#iso-status').focus()});
}

function reviewIso() {
  const stage = isoState.stage;
  const labels = {
    'requirement-review':['Review initial requirement','Approve requirement','approveRequirement'],
    'activation-review':['Review Program activation','Approve and activate','activate'],
    'adoption-review':['Review ISO adoption','Approve adoption','approveAdoption']
  };
  const [title,button,action] = labels[stage];
  const returnAction = { 'requirement-review':'returnProgram','adoption-review':'returnAdoption' }[stage];
  openModal(title,'CHIEF RISK OFFICER · DEMO',`
    <p><strong>${esc(isoState.bank)} · ${esc(programs[program].name)}</strong></p><p>${esc(isoState.scope)}</p>
    ${guidedProgramDemo?`<p><strong>Initial requirement</strong><br>${esc(isoState.requirement)}</p>`:''}
    ${stage==='adoption-review'?reviewHTML():''}
    <label class="field"><span class="field-label">Decision rationale</span><textarea id="iso-reason"></textarea></label>
    ${returnAction?'<button class="button secondary" id="iso-return">Return for changes</button>':''}`,
    button, () => {
      const result = isoMove(action,$('#iso-reason').value);
      if (result===true) render();
      return result;
    },{onClose:()=>$('#iso-status').focus()});
  if (returnAction) $('#iso-return').onclick = () => {
    const result = isoMove(returnAction,$('#iso-reason').value);
    if (result===true) {render();closeModal();}
    else {$('#dialog-error').textContent=result;$('#dialog-error').hidden=false;}
  };
}

function initIso() {
  if (!isoMode) return;
  $('#wizard-main').classList.add('iso-adoption');
  const layout = $('.wizard-layout');
  const rail = $('.adoption-rail');
  const main = document.createElement('div');
  main.className = 'adoption-main';
  layout.classList.add('adoption-grid');
  layout.prepend(main);
  main.innerHTML = `<section class="panel program-card" aria-labelledby="iso-program-title">
    <div class="panel-head"><div class="panel-title"><span class="panel-index">1</span><h2 id="iso-program-title">Program &amp; scope</h2></div></div>
    <div id="iso-program-scope"></div>
  </section>`;
  main.append($('.wizard-steps'),$('#page-error'),$('#step-content'),$('.wizard-footer'));
  main.insertAdjacentHTML('beforeend',`<section class="panel form-card" id="iso-questionnaire" aria-labelledby="iso-form-title">
    <div class="panel-head"><div class="panel-title"><span class="panel-index">3</span><h2 id="iso-form-title">Questionnaire</h2></div></div>
    <div class="form-body"><span class="form-icon">${icon('form')}</span><div class="form-info"><strong>Digital banking ISMS assessment</strong><small id="iso-question-count"></small></div>
    <button class="form-btn" id="iso-view-questions">View question groups</button></div>
  </section>`);
  $('#iso-view-questions').onclick=()=>openReview(false);
  rail.prepend($('#iso-lifecycle'));
  const progress = rail.querySelector('.panel:not(.iso-lifecycle)');
  progress.id = 'iso-setup-progress';
  progress.querySelector('h2').textContent = 'Adoption review';
  progress.querySelector('.rail-inner').append($('#save-draft'));
  $('.header-actions').insertAdjacentHTML('beforeend',`<a class="button secondary" href="library.html">${icon('layers')}Library</a>`);
  $('.heading-text p').textContent='Information security management systems';
  $('.heading-meta .neutral').textContent='2022 edition';
  $('.heading-meta').insertAdjacentHTML('beforeend','<span class="mini-label neutral">Citations only</span>');
  document.title = 'ClearSight — ISO/IEC 27001:2022 adoption';
  document.querySelectorAll('.adoption-heading h1,.heading-meta .tint,.crumbs span:nth-child(3)').forEach(el=>el.textContent='ISO/IEC 27001:2022');
  $('.heading-meta .tint').textContent='Global';
  $('.source-panel .crest').textContent='ISO';
  const [publisher,edition,reference] = $('.source-facts').querySelectorAll('strong');
  publisher.textContent='ISO/IEC';
  edition.textContent='2022';
  reference.textContent='ISO/IEC 27001';
  $('.source-head a').href='https://www.iso.org/standard/27001';
  $('.source-note').textContent='Sample bank requirements and question groups with illustrative ISO references. Use the licensed standard to assess applicability and coverage.';
  const programIds = guidedProgramDemo ? ['iso'] : Object.keys(programs);
  $('#program-select').replaceChildren(...programIds.map(id => {
    const record = programs[id];
    return new Option(`${record.code} · ${record.name}`, id);
  }));
  selectIsoProgram(program);
  $('.scope-copy .field-label').textContent='Approved Program scope';
  $('.prototype-footnote').textContent='Demo decisions are saved in this browser. The prototype models Program activation and framework adoption.';
}
