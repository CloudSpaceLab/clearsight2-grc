const M = BuilderModel;
const $ = selector => document.querySelector(selector);
const storageKey = 'clearsight-simple-form-v1';
const types = ['short_text', 'long_text', 'yes_no', 'single_select', 'multi_select', 'date', 'file', 'attestation'];
const followUpTypes = {short_text: 'Short answer', long_text: 'Long answer', date: 'Date'};
const sampleFollowUp = [
  {label: 'Which accounts were flagged?', type: 'long_text'},
  {label: 'Who owns the remediation?', type: 'short_text'},
  {label: 'What is the target completion date?', type: 'date'}
];
const hasFollowUp = field => field.type === 'yes_no' && Boolean(field.followUp?.length);
const isChoice = type => ['single_select', 'multi_select'].includes(type);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let stored = localStorage.getItem(storageKey);
let form = stored ? JSON.parse(stored) : M.blank();
for (const field of form.fields) {
  if (field.followUp) {
    field.followUp = field.followUp.map((prompt, index) =>
      typeof prompt === 'string' ? {label: prompt, type: sampleFollowUp[index]?.type || 'short_text'} : prompt);
  }
}
let opener;

function editable() {
  return form.status === 'Draft';
}

function status(message) {
  $('#draft-status').textContent = message;
}

function questionCard(field, index) {
  const disabled = editable() ? '' : 'disabled';
  const hint = {
    file: 'Respondents provide a supporting document.',
    attestation: 'Respondents confirm the statement above.',
    yes_no: 'Respondents select Yes or No.'
  }[field.type];
  return `<section class="simple-card" data-question="${field.id}">
    <div class="question-header">
      <label>${field.type === 'attestation' ? 'Statement' : 'Question'} ${index + 1}
        <input data-field="label" maxlength="250" value="${esc(field.label)}" placeholder="${field.type === 'attestation' ? 'Enter a statement to confirm' : 'Enter your question'}" ${disabled}>
      </label>
      <label>Answer type<select data-field="type" ${disabled}>${types.map(type => `<option value="${type}" ${field.type === type ? 'selected' : ''}>${M.types[type]}</option>`).join('')}</select></label>
    </div>
    ${hint ? `<p class="question-hint">${hint}</p>` : ''}
    ${isChoice(field.type) ? `<div class="choice-list">${field.options.map((value, i) => `<div class="choice-row">
      <input aria-label="Choice ${i + 1}" data-option="${i}" maxlength="150" placeholder="Choice ${i + 1}" value="${esc(value)}" ${disabled}>
      <button class="text-button" data-action="remove-choice" data-index="${i}" aria-label="Remove choice ${i + 1}" ${editable() && field.options.length > 2 ? '' : 'disabled'}>×</button>
    </div>`).join('')}<button class="text-button" data-action="add-choice" ${editable() && field.options.length < 50 ? '' : 'disabled'}>+ Add choice</button></div>` : ''}
    ${hasFollowUp(field) ? `<fieldset class="follow-up">
      <legend>If the answer is Yes</legend>
      ${field.followUp.map((prompt, i) => `<div class="follow-up-row">
        <label>Follow-up question ${i + 1}<input data-follow-up="${i}" maxlength="250" placeholder="Enter a follow-up question" value="${esc(prompt.label)}" ${disabled}></label>
        <label>Answer type<select data-follow-up-type="${i}" ${disabled}>${Object.entries(followUpTypes).map(([type, label]) =>
          `<option value="${type}" ${prompt.type === type ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
        ${editable() ? `<button class="text-button" data-action="remove-follow-up-question" data-index="${i}" aria-label="Remove follow-up question ${i + 1}">Remove</button>` : ''}
      </div>`).join('')}
      ${editable() ? '<button class="text-button" data-action="add-follow-up-question">+ Add follow-up question</button>' : ''}
    </fieldset>` : ''}
    <div class="question-footer">
      ${editable() ? `<details class="question-more"><summary class="text-button" aria-label="Question ${index + 1} actions"><span class="more-closed">More</span><span class="more-open">Close actions</span></summary>
        <div class="question-tools">
          ${field.type === 'yes_no' && !hasFollowUp(field) ? '<button class="text-button" data-action="add-follow-up">Add follow-up</button>' : ''}
          <button class="text-button" data-action="duplicate" ${form.fields.length >= 200 ? 'disabled' : ''}>Duplicate</button>
        </div></details>` : ''}
      ${editable() ? `<button class="text-button delete-question" data-action="remove" aria-label="Delete question ${index + 1}" title="Delete question"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg></button>` : ''}
      <label class="required"><input type="checkbox" data-field="required" ${field.required ? 'checked' : ''} ${disabled}>Required</label>
    </div>
  </section>`;
}

function render() {
  $('#form-name').value = form.name;
  $('#description').value = form.purpose;
  for (const id of ['form-name', 'description', 'save', 'send', 'add-question']) {
    $('#' + id).disabled = !editable();
  }
  $('#add-question').disabled ||= form.fields.length >= 200;
  $('#example').hidden = !editable() || form.name !== '' || form.purpose !== '' ||
    form.fields.length !== 1 || form.fields[0].label !== '' || form.fields[0].type !== 'short_text';
  $('#questions').innerHTML = form.fields.map(questionCard).join('');
  renderSummary();
  renderPreview("inline-preview");
}

function focusQuestion(field, control = '[data-field=label]') {
  $([`[data-question="${field.id}"]`, control].join(' '))?.focus();
}

function update() {
  status('Unsaved changes');
  renderSummary();
  renderPreview("inline-preview");
  $('#example').hidden = true;
}

$('#form-name').oninput = e => { form.name = e.target.value; update(); };
$('#description').oninput = e => { form.purpose = e.target.value; update(); };
$('#questions').addEventListener('input', e => {
  if (!e.target.closest('[data-question]')) return;
  const field = form.fields.find(item => item.id === e.target.closest('[data-question]').dataset.question);
  const {field: property, option, followUp, followUpType} = e.target.dataset;
  if (property === 'type') return;
  if (followUp !== undefined) field.followUp[Number(followUp)].label = e.target.value;
  if (followUpType !== undefined) field.followUp[Number(followUpType)].type = e.target.value;
  if (option !== undefined) field.options[Number(option)] = e.target.value;
  if (property === 'label') field.label = e.target.value;
  if (property === 'required') field.required = e.target.checked;
  update();
});
$('#questions').addEventListener('change', e => {
  if (e.target.dataset.field !== 'type') return;
  if (!e.target.closest('[data-question]')) return;
  const field = form.fields.find(item => item.id === e.target.closest('[data-question]').dataset.question);
  field.type = e.target.value;
  if (isChoice(field.type) && field.options.length < 2) field.options = ['', ''];
  render();
  update();
  focusQuestion(field, '[data-field=type]');
});

$('#questions').addEventListener('click', e => {
  const button = e.target.closest('[data-action]');
  if (!button || !editable()) return;
  const index = form.fields.findIndex(item => item.id === button.closest('[data-question]').dataset.question);
  let field = form.fields[index];
  let target = '[data-field=label]';
  switch (button.dataset.action) {
    case 'add-follow-up':
    case 'add-follow-up-question':
      field.followUp ??= [];
      field.followUp.push({label: '', type: 'short_text'});
      target = `[data-follow-up="${field.followUp.length - 1}"]`;
      break;
    case 'remove-follow-up-question': {
      const removed = Number(button.dataset.index);
      field.followUp.splice(removed, 1);
      target = field.followUp.length
        ? `[data-follow-up="${Math.min(removed, field.followUp.length - 1)}"]` : 'summary';
      break;
    }
    case 'add-choice':
      field.options.push('');
      target = `[data-option="${field.options.length - 1}"]`;
      break;
    case 'remove-choice':
      field.options.splice(Number(button.dataset.index), 1);
      target = '[data-option="0"]';
      break;
    case 'duplicate':
      field = {...structuredClone(field), id: M.field(field.section_id).id};
      form.fields.splice(index + 1, 0, field);
      break;
    case 'remove':
      form.fields.splice(index, 1);
      field = form.fields[Math.min(index, form.fields.length - 1)];
      break;

  }
  render();
  update();
  if (field) focusQuestion(field, target);
  else $('#add-question').focus();
});

$('#add-question').onclick = () => {
  const field = M.field($('#section-target')?.value || form.sections[0].id);
  form.fields.push(field);
  render();
  update();
  focusQuestion(field);
};

$('#example').onclick = () => {
  form.name = 'Quarterly privileged access review';
  form.purpose = 'Confirm ownership, record access exceptions and attach evidence for the quarterly review.';
  const section = form.sections[0].id;
  form.fields = [
    {...M.field(section), label: 'Who is accountable for this access review?'},
    {...M.field(section), label: 'Were any privileged accounts flagged for removal?', type: 'yes_no', followUp: structuredClone(sampleFollowUp)},
    {...M.field(section), label: 'Attach the completed access review register.', type: 'file'},
    {...M.field(section), label: 'I confirm that all flagged accounts have an assigned follow-up owner.', type: 'attestation'}
  ];
  render();
  update();
  $('#form-name').focus();
};

function save(next) {
  if (localStorage.getItem(storageKey) !== stored) throw Error('This form changed in another tab. Reload to open the saved copy.');
  const serialized = JSON.stringify(next);
  localStorage.setItem(storageKey, serialized);
  stored = serialized;
}
$('#save').onclick = () => {
  try {
    save(form);
    status('Draft saved in this browser');
  } catch (error) { status(error.message); }
};

function openDialog(dialog) {
  opener = document.activeElement;
  dialog.showModal();
}
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.addEventListener('close', () => (opener?.disabled ? $('#preview') : opener)?.focus());
}

function previewControl(field, previewId) {
  if (field.type === 'file') return '<p>Evidence upload is unavailable in preview.</p>';
  if (field.type === 'attestation') return '<label><input type="checkbox"> I confirm</label>';
  if (field.type === 'yes_no' || isChoice(field.type)) {
    const options = field.type === 'yes_no' ? ['Yes','No'] : field.options.filter(option => option.trim());
    const type = field.type === 'multi_select' ? 'checkbox' : 'radio';
    return options.map(option => `<label><input type="${type}" name="${previewId}-${field.id}" value="${esc(option)}"> ${esc(option)}</label>`).join('') || '<p>Add choices in the editor.</p>';
  }
  const label = esc(field.label || 'Untitled question');
  return field.type === 'long_text' ? `<textarea aria-label="${label}" rows="3"></textarea>`
    : `<input aria-label="${label}" type="${field.type === 'date' ? 'date' : 'text'}">`;
}

function renderPreview(previewId) {
  $('#' + previewId + '-title').textContent = form.name || 'Untitled form';
  $('#' + previewId + '-description').textContent = form.purpose;
  $('#' + previewId + '-questions').innerHTML = form.fields.map(field =>
    `<fieldset class="preview-item"><legend>${esc(field.label || 'Untitled question')}${field.required ? ' <small>(required)</small>' : ''}</legend>${previewControl(field, previewId)}${hasFollowUp(field) ? `<div class="follow-up preview-follow-up" data-preview-follow-up hidden>
      ${field.followUp.map(prompt => `<label>${esc(prompt.label || "Untitled follow-up question")}
        ${prompt.type === 'long_text' ? '<textarea rows="2" required disabled></textarea>' : `<input type="${prompt.type === 'date' ? 'date' : 'text'}" required disabled>`}
      </label>`).join('')}
    </div>` : ''}</fieldset>`
  ).join('');
}

$('#preview').onclick = () => {
  renderPreview('preview');
  openDialog($('#preview-dialog'));
};

function showPreviewFollowUp(event) {
  if (!event.target.matches('input[type=radio]')) return;
  const followUp = event.target.closest('fieldset').querySelector('[data-preview-follow-up]');
  if (!followUp) return;
  followUp.hidden = event.target.value !== 'Yes';
  for (const control of followUp.querySelectorAll('input, textarea')) {
    control.disabled = followUp.hidden;
  }
}

$('#preview-questions').addEventListener('change', showPreviewFollowUp);
$('#inline-preview-questions').addEventListener('change', showPreviewFollowUp);

function approvalIssues() {
  const candidate = {...form, code: form.code || form.id.toUpperCase()};
  const issues = M.issues(candidate).map(issue => issue.replace('form name', 'form title').replace('form purpose', 'form description'));
  form.fields.forEach((field, index) => {
    if (hasFollowUp(field) && field.followUp.some(prompt => !prompt.label.trim())) {
      issues.push('Question ' + (index + 1) + ' needs text for each follow-up prompt.');
    }
  });
  return issues;
}

function renderSummary() {
  $('#question-count').textContent = form.fields.length;
  $('#required-count').textContent = form.fields.filter(field => field.required).length;
  const count = approvalIssues().length;
  $('#check-count').textContent = count ? count + ' to resolve' : 'Ready';
  $('#check-count').dataset.ready = count === 0;
}

$('#send').onclick = () => {
  const issues = approvalIssues();
  $('#approval-context').textContent = `${form.name || 'Untitled form'} · ${form.fields.length} ${form.fields.length === 1 ? 'question' : 'questions'}`;
  $('#approval-error').replaceChildren();
  for (const issue of issues) {
    const line = document.createElement('span');
    line.textContent = issue;
    $('#approval-error').append(line);
  }
  $('#confirm-send').disabled = issues.length > 0;
  openDialog($('#approval-dialog'));
};

$('#confirm-send').onclick = () => {
  try {
    const candidate = {...form, code: form.code || form.id.toUpperCase()};
    const [revision] = M.persist([], candidate, 'author', 0);
    const submitted = M.send(revision, 'author', 'compliance', $('#handoff').value.trim());
    save(submitted);
    form = submitted;
    render();
    status('Pending approval · Revision ' + form.version + ' · Saved in this browser');
    $('#approval-dialog').close();
  } catch (error) { $('#approval-error').textContent = error.message; }
};

const theme = $('#theme-toggle');
theme.onclick = () => {
  const dark = document.body.dataset.theme !== 'dark';
  document.body.dataset.theme = dark ? 'dark' : 'light';
  theme.setAttribute('aria-pressed', dark);
  theme.setAttribute('aria-label', dark ? 'Switch to light appearance' : 'Switch to dark appearance');
};
for (const link of document.querySelectorAll('.nav-item')) {
  link.addEventListener('click', e => {
    e.preventDefault();
    const feedback = $('#navigation-feedback');
    feedback.hidden = false;
    feedback.textContent = 'This preview opens Create form only.';
    feedback.scrollIntoView({block: 'nearest'});
  });
}
render();
if (stored) status(editable() ? 'Draft saved in this browser' : 'Pending approval · Revision ' + form.version + ' · Saved in this browser');
