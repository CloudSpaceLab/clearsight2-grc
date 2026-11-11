(()=>{const M=BuilderModel,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],key='clearsight-create-form-prototype';let draft=null,selected=null,actor='author',dirty=false,opener=null,removeID=null, outlineTarget=null;const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function read(){return JSON.parse(localStorage.getItem(key)||'[]')}function msg(t){$('#message').textContent=t}function editable(){return actor==='author'&&['Draft','Changes requested'].includes(draft.status)}function openDialog(id){opener=document.activeElement;$('#'+id).showModal();$('#'+id+' button')?.focus()}$$('dialog').forEach(d=>d.addEventListener('close',()=>opener?.isConnected&&opener.focus()));$$('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
function capture(){if(!draft)return;const active=draft.fields.find(f=>f.id===selected);if(active&&$('#choices'))active.options=$('#choices').value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);if(active&&$('#min')){active.min=Number($('#min').value);active.max=Number($('#max').value);}draft.code=$('#form-code').value;draft.name=$('#form-name').value;draft.purpose=$('#form-purpose').value;$$('[data-section-title]').forEach(e=>draft.sections.find(s=>s.id===e.dataset.sectionTitle).title=e.value);$$('[data-section-help]').forEach(e=>draft.sections.find(s=>s.id===e.dataset.sectionHelp).guidance=e.value);$$('[data-label]').forEach(e=>draft.fields.find(f=>f.id===e.dataset.label).label=e.value);$$('[data-help]').forEach(e=>draft.fields.find(f=>f.id===e.dataset.help).description=e.value)}
function start(d){draft=structuredClone(d);selected=draft.fields[0]?.id;outlineTarget=null;$('.builder-layout').dataset.pane='canvas';dirty=false;$('#launcher').hidden=true;$('#editor').hidden=false;$('#receipt').hidden=true;render()}
function list(){const records=read();$('#saved-list').innerHTML=records.map(r=>`<button class="saved-row" data-open="${r.id}"><span><strong>${esc(r.name)}</strong><small>${esc(r.code)} · Revision ${r.version} · ${r.sections.length} sections · ${r.fields.length} questions</small></span><span>${esc(r.status)} →</span></button>`).join('')||'<p>No saved templates in this browser.</p>'}
function render(){const can=editable();$('#form-code').value=draft.code;$('#form-name').value=draft.name;$('#form-purpose').value=draft.purpose;$$('.form-identity input,.form-identity textarea').forEach(e=>e.disabled=!can);$('#record-status').textContent=(draft.name||'Untitled form')+' · '+draft.status+' · '+(draft.version?'Revision '+draft.version:'Not saved')+(dirty?' · Unsaved changes':'');$('#quality').textContent='Review · '+M.issues(draft).length;$('#save').disabled=!can;$('#send').disabled=!can||M.issues(draft).length>0;$('#add-section').disabled=!can||draft.sections.length>=20;
renderOutline();
$('#canvas').innerHTML=draft.sections.map((s,i)=>`<section class="canvas-section" id="section-${s.id}" tabindex="-1" aria-label="Section ${i+1}: ${esc(s.title || 'Untitled section')}"><label>Section ${i+1}<input data-section-title="${s.id}" value="${esc(s.title)}" maxlength="200" ${can?'':'disabled'}></label><label>Section guidance<input data-section-help="${s.id}" value="${esc(s.guidance||'')}" maxlength="1000" ${can?'':'disabled'}></label><div class="section-actions"><button class="button" data-section-up="${s.id}" ${!can||i===0?'disabled':''}>Move section up</button><button class="button" data-section-down="${s.id}" ${!can||i===draft.sections.length-1?'disabled':''}>Move section down</button><button class="button" data-section-copy="${s.id}" ${!can||draft.sections.length>=20?'disabled':''}>Duplicate section</button><button class="button" data-section-remove="${s.id}" ${!can||draft.sections.length<=1?'disabled':''}>Remove section</button></div>${draft.fields.filter(f=>f.section_id===s.id).map(f=>`<article class="canvas-question ${selected===f.id?'selected':''}" id="question-${f.id}" tabindex="-1" aria-label="Question ${draft.fields.indexOf(f)+1}: ${esc(f.label || 'Untitled question')}"><header><span class="question-type">Question ${draft.fields.indexOf(f)+1} · ${M.types[f.type]}</span><div class="question-actions"><button class="button" data-select="${f.id}">Settings</button><button class="button" data-up="${f.id}" aria-label="Move question up" ${can?'':'disabled'}>↑</button><button class="button" data-down="${f.id}" ${can?'':'disabled'}>↓</button><button class="button" data-duplicate="${f.id}" ${can?'':'disabled'}>Duplicate</button><button class="button" data-remove="${f.id}" ${can?'':'disabled'}>Remove</button></div></header><label>Question<input data-label="${f.id}" value="${esc(f.label)}" maxlength="250" placeholder="Ask a clear question…" ${can?'':'disabled'}></label><label>Response guidance<input data-help="${f.id}" value="${esc(f.description)}" maxlength="1000" placeholder="Help the respondent answer…" ${can?'':'disabled'}></label><p class="question-type">${f.required?'Required':'Optional'} · ${f.assessment==='MANUAL'?'Independent manual review':'No field assessment'}</p></article>`).join('')}<button class="button" data-add="${s.id}" ${can?'':'disabled'}>Add question</button></section>`).join('');inspect();}
function renderOutline() {
  const activeField = draft.fields.find(field => field.id === selected);
  const activeSection = activeField?.section_id
    ?? draft.sections.find(section => section.id === outlineTarget)?.id
    ?? draft.sections[0]?.id;
  const current = activeField?.id ?? outlineTarget ?? activeSection;
  const currentAttr = id => current === id ? ' aria-current="location"' : '';

  $('#outline').innerHTML = `<button type="button" class="outline-entry outline-form-settings" data-form-settings${currentAttr('settings')}>
    <strong>Form settings</strong><span aria-hidden="true">›</span>
  </button>` + draft.sections.map((section, index) => {
    const questions = draft.fields.filter(field => field.section_id === section.id);
    const expanded = section.id === activeSection;
    return `<div class="outline-group">
      <button type="button" class="outline-entry outline-section" data-section="${section.id}" data-active="${expanded}"${currentAttr(section.id)}>
        <span class="outline-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
        <span class="outline-copy"><strong>${esc(section.title || 'Untitled section')}</strong>
          <small>${questions.length} ${questions.length === 1 ? 'question' : 'questions'}</small></span>
        <span aria-hidden="true">›</span>
      </button>
      ${expanded && questions.length ? `<ul class="outline-questions">${questions.map(field => `<li>
        <button type="button" class="outline-question" data-select="${field.id}"${currentAttr(field.id)}>${esc(field.label || 'Untitled question')}</button>
      </li>`).join('')}</ul>` : ''}
    </div>`;
  }).join('');
}
function focusBuilderTarget(selector, pane) {
  $('.builder-layout').dataset.pane = pane;
  const target = $(selector);
  target.focus({preventScroll:true});
  target.scrollIntoView({block:'nearest'});
}
function inspect() {
  const field = draft.fields.find(f => f.id === selected);
  const disabled = editable() ? '' : 'disabled';
  const heading = $('#question-settings-heading');
  const context = $('#settings-context');
  const inspector = $('#inspector');

  if (!field) {
    heading.textContent = 'Form settings';
    context.textContent = 'Respondent experience';
    inspector.innerHTML = `<section class="surface settings-card">
      <h3>Presentation</h3>
      <label>Default layout<select id="layout" ${disabled}><option value="AUTOMATIC">Choose by form length</option><option value="CLASSIC">Show all questions</option><option value="WIZARD">One section at a time</option></select></label>
      <label class="required-label"><input id="switch-layout" type="checkbox" ${draft.allowModeSwitch?'checked':''} ${disabled}>Allow respondents to switch layouts</label>
    </section><section class="surface settings-card">
      <h3>Scoring</h3><p>No score · Scoring configuration is unavailable in this preview.</p>
    </section>`;
    $('#layout').value = draft.presentation;
    $('#layout').onchange = e => { draft.presentation = e.target.value; dirty = true; };
    $('#switch-layout').onchange = e => { draft.allowModeSwitch = e.target.checked; dirty = true; };
    return;
  }

  heading.textContent = 'Question settings';
  const section = draft.sections.find(s => s.id === field.section_id);
  context.innerHTML = `<div class="settings-selection">
    <span class="outline-number" aria-hidden="true">${String(draft.fields.indexOf(field) + 1).padStart(2, '0')}</span>
    <div><strong id="settings-question-label">${esc(field.label || 'Untitled question')}</strong><small id="settings-section-label">${esc(section?.title || 'Untitled section')}</small></div>
  </div><button type="button" class="settings-return" id="settings-return">Go to question <span aria-hidden="true">›</span></button>`;
  $('#settings-return').onclick = () => focusBuilderTarget('#question-' + field.id, 'canvas');
  inspector.innerHTML = `<section class="surface settings-card">
    <h3>Response</h3>
    <label>Response type<select id="field-type" ${disabled}>${Object.entries(M.types).map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select></label>
    <label class="required-label"><input id="field-required" type="checkbox" ${field.required?'checked':''} ${disabled}>Required response</label>
    <label>Section<select id="field-section" ${disabled}>${draft.sections.map(s => `<option value="${s.id}">${esc(s.title || 'Untitled section')}</option>`).join('')}</select></label>
    ${['single_select','multi_select'].includes(field.type) ? `<label>Choices · one per line<textarea id="choices" ${disabled}>${esc(field.options.join('\n'))}</textarea></label>` : ''}
  </section><section class="surface settings-card">
    <h3>Assessment</h3>
    <label>How this field is assessed<select id="assessment" ${disabled}><option value="NONE">No field assessment</option><option value="MANUAL">Manual independent review</option></select></label>
    <p>Automatic assessment is unavailable in this preview.</p>
  </section><section class="surface settings-card settings-options">
    <details><summary>Validation &amp; response options</summary>
      <label>Minimum length / value<input id="min" type="number" min="0" max="10000" value="${field.min}" ${disabled}></label>
      <label>Maximum length / value<input id="max" type="number" min="0" max="10000" value="${field.max}" ${disabled}></label>
      <p>The preview enforces the text maximum only.</p>
    </details>
    <details><summary>Logic</summary><p>Conditional rules are unavailable in this preview.</p></details>
    <details><summary>Data handling</summary><p>Classification, record targets and cache policy are unavailable in this preview.</p></details>
  </section>`;

  $('#field-type').value = field.type;
  $('#field-section').value = field.section_id;
  $('#assessment').value = field.assessment;
  for (const [id, property] of [['field-type', 'type'], ['field-required', 'required'], ['field-section', 'section_id']]) {
    $('#' + id).onchange = e => {
      capture();
      field[property] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      dirty = true;
      render();
      $('#' + id).focus({preventScroll:true});
    };
  }
  $('#assessment').onchange = e => { field.assessment = e.target.value; dirty = true; };
  if ($('#choices')) $('#choices').onchange = () => { capture(); dirty = true; };
  for (const key of ['min','max']) {
    $('#' + key).onchange = e => { field[key] = Number(e.target.value); dirty = true; };
  }
}
function save(){capture();const all=M.persist(read(),draft,actor,draft.version);localStorage.setItem(key,JSON.stringify(all));draft=structuredClone(all.find(r=>r.id===draft.id));dirty=false;render();list();msg('Draft revision '+draft.version+' saved in this browser. Not published or sent.');}
function preview(d){$('#preview-title').textContent=d.name||'Untitled form';$('#preview-body').innerHTML=d.sections.map(s=>`<h3>${esc(s.title)}</h3><p>${esc(s.guidance||'')}</p>`+d.fields.filter(f=>f.section_id===s.id).map(f=>{const label=esc(f.label||'Untitled question')+(f.required?' *':'');let control=['single_select','yes_no'].includes(f.type)?`<select><option>Choose an answer</option>${(f.type==='yes_no'?['Yes','No']:f.options).map(o=>`<option>${esc(o)}</option>`).join('')}</select>`:f.type==='multi_select'?f.options.map(o=>`<label><input type="checkbox">${esc(o)}</label>`).join(''):['file','photo','signature','vendor_document'].includes(f.type)?'<p>Capture unavailable in this preview; no upload or signature is recorded.</p>':f.type==='attestation'||f.type==='checkbox'?'<input type="checkbox">':f.type==='long_text'?`<textarea maxlength="${f.max}"></textarea>`:`<input type="${({email:'email',url:'url',telephone:'tel',integer:'number',decimal:'number',percentage:'number',currency:'number',date:'date'})[f.type]||'text'}" maxlength="${f.max}">`;return `<div class="preview-question"><label><strong>${label}</strong><small>${esc(f.description)}</small>${control}</label></div>`}).join('')).join('');openDialog('preview-dialog')}
function safe(fn){try{fn()}catch(e){msg(e.message)}}
$('#blank').onclick=()=>start(M.blank());$('#starter').onclick=()=>start(M.starter());$('#starter-preview').onclick=()=>preview(M.starter());$('#back').onclick=()=>{capture();if(dirty){msg('Unsaved changes remain in the editor. Save a draft before leaving.');return}$('#editor').hidden=true;$('#launcher').hidden=false;list()};$('#save').onclick=()=>safe(save);$('#preview').onclick=()=>{capture();preview(draft)};$('#quality').onclick=()=>{capture();const list=M.issues(draft);$('#quality-body').innerHTML=list.length?'<ul>'+list.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':'<p>No blocking template checks. Authority and activation are still separate.</p>';openDialog('quality-dialog')};$('#send').onclick=()=>{capture();$('#approval-error').textContent='';openDialog('approval-dialog')};$('#confirm-send').onclick=()=>{try{if(!$('#route').value)throw Error('Choose a review route.');if(dirty||draft.version===0)save();draft=M.send(draft,actor,$('#route').value,$('#handoff').value);const all=read().map(r=>r.id===draft.id?draft:r);localStorage.setItem(key,JSON.stringify(all));$('#approval-dialog').close();render();$('#receipt').hidden=false;$('#receipt').innerHTML='<h2>Sent for approval locally</h2><p>Revision '+draft.version+' · Compliance template review · pending independent decision. No live delivery occurred.</p>';msg('Template locked pending review. It is not active.')}catch(e){$('#approval-error').textContent=e.message}};
$('#actor').onchange=e=>{capture();actor=e.target.value;if(draft)render();list();msg('Sample role changed. Production authority is not connected.')};$('#add-section').onclick=()=>{if(!editable())return;capture();const id='s-'+Date.now();draft.sections.push({id,title:'New section',guidance:''});draft.fields.push(M.field(id));selected=draft.fields.at(-1).id;dirty=true;render()};$('#confirm-remove').onclick=()=>{draft.fields=draft.fields.filter(f=>f.id!==removeID);selected=draft.fields[0]?.id;dirty=true;$('#confirm-dialog').close();render()};
document.addEventListener('click',e=>{const b=e.target.closest('button,a');if(!b)return;if(b.dataset.open){start(read().find(r=>r.id===b.dataset.open));if(actor==='reviewer'&&draft.status==='Pending approval'){openDialog('decision-dialog')}return}if(b.dataset.pane){$('.builder-layout').dataset.pane=b.dataset.pane;return}if(!draft)return;if(b.hasAttribute('data-form-settings')){
  capture();
  selected=null;
  outlineTarget='settings';
  render();
  focusBuilderTarget('#question-settings-heading','settings');
  return;
}
if(b.dataset.select){
  const fromOutline=b.closest('#outline');
  capture();
  selected=b.dataset.select;
  outlineTarget=null;
  render();
  if(fromOutline){
    focusBuilderTarget('#question-'+selected,'canvas');
  }else{
    focusBuilderTarget('#question-settings-heading','settings');
  }
  return;
}
if(b.dataset.section){
  capture();
  selected=null;
  outlineTarget=b.dataset.section;
  render();
  focusBuilderTarget('#section-'+outlineTarget,'canvas');
  return;
}
if(!editable())return;let changed=false;if(b.dataset.add){capture();if(draft.fields.length>=200)return msg('Maximum 200 questions.');draft.fields.push(M.field(b.dataset.add));selected=draft.fields.at(-1).id;changed=true}if(b.dataset.duplicate){if(draft.fields.length>=200)return msg('Maximum 200 questions.');capture();const source=draft.fields.find(f=>f.id===b.dataset.duplicate);draft.fields.splice(draft.fields.indexOf(source)+1,0,{...structuredClone(source),id:M.field(source.section_id).id});changed=true}if(b.dataset.up){capture();let i=draft.fields.findIndex(f=>f.id===b.dataset.up),j=i-1;if(j>=0&&draft.fields[j].section_id===draft.fields[i].section_id){[draft.fields[j],draft.fields[i]]=[draft.fields[i],draft.fields[j]];changed=true}}if(b.dataset.sectionUp){capture();let i=draft.sections.findIndex(s=>s.id===b.dataset.sectionUp);if(i>0){[draft.sections[i-1],draft.sections[i]]=[draft.sections[i],draft.sections[i-1]];changed=true}}if(b.dataset.down){capture();let i=draft.fields.findIndex(f=>f.id===b.dataset.down),j=i+1;if(j<draft.fields.length&&draft.fields[j].section_id===draft.fields[i].section_id){[draft.fields[i],draft.fields[j]]=[draft.fields[j],draft.fields[i]];changed=true}}
if(b.dataset.sectionDown){capture();let i=draft.sections.findIndex(s=>s.id===b.dataset.sectionDown);if(i<draft.sections.length-1){[draft.sections[i],draft.sections[i+1]]=[draft.sections[i+1],draft.sections[i]];changed=true}}
if(b.dataset.sectionCopy){capture();if(draft.sections.length>=20)return;const source=draft.sections.find(s=>s.id===b.dataset.sectionCopy),id='s-'+Date.now();const fields=draft.fields.filter(f=>f.section_id===source.id);if(draft.fields.length+fields.length>200)return msg('Maximum 200 questions.');draft.sections.splice(draft.sections.indexOf(source)+1,0,{...source,id,title:source.title+' (copy)'});draft.fields.push(...fields.map(f=>({...structuredClone(f),id:M.field(id).id,section_id:id})));changed=true}
if(b.dataset.sectionRemove){if(draft.sections.length<=1)return;capture();const id=b.dataset.sectionRemove;draft.sections=draft.sections.filter(s=>s.id!==id);draft.fields.forEach(f=>{if(f.section_id===id)f.section_id=draft.sections[0].id});msg('Section removed. Its questions were retained in the first remaining section, matching v1.');changed=true}
if(b.dataset.remove){if(draft.fields.length<=1)return msg('Keep at least one question.');removeID=b.dataset.remove;openDialog('confirm-dialog')}if(changed){dirty=true;render()}});
$('#confirm-decision').onclick=()=>{try{const current=read().find(r=>r.id===draft.id);if(current.status!==draft.status||current.version!==draft.version)throw Error('Template changed. Reopen it.');draft=M.decide(draft,actor,$('#decision').value,$('#decision-note').value);localStorage.setItem(key,JSON.stringify(read().map(r=>r.id===draft.id?draft:r)));$('#decision-dialog').close();render();msg('Local decision recorded. Activation and distribution are unavailable.')}catch(e){$('#decision-error').textContent=e.message}};
$('#editor').addEventListener('change', e => {
  const {sectionTitle, label} = e.target.dataset;
  const title = sectionTitle && $('#outline [data-section="' + sectionTitle + '"] strong');
  const question = label && $('#outline [data-select="' + label + '"]');
  if (title) title.textContent = e.target.value || 'Untitled section';
  if (question) question.textContent = e.target.value || 'Untitled question';
  const field = draft.fields.find(f => f.id === selected);
  if (label && field?.id === label) $('#settings-question-label').textContent = question.textContent;
  if (sectionTitle && field?.section_id === sectionTitle) $('#settings-section-label').textContent = title.textContent;
});
$('#editor').addEventListener('input',e=>{if(e.target.matches('input,textarea')&&editable()){dirty=true;capture();$('#send').disabled=M.issues(draft).length>0;$('#quality').textContent='Review · '+M.issues(draft).length}});$$('.nav-item').forEach(a=>a.onclick=e=>{e.preventDefault();msg('Navigation outside template authoring is not implemented in this isolated prototype.')});const theme=$('#theme-toggle');if(theme)theme.onclick=()=>{const dark=document.body.dataset.theme!=='dark';document.body.dataset.theme=dark?'dark':'light';theme.setAttribute('aria-label',dark?'Switch to light appearance':'Switch to dark appearance');theme.setAttribute('aria-pressed',dark)};list();msg('Local design preview. No production changes.');})();
