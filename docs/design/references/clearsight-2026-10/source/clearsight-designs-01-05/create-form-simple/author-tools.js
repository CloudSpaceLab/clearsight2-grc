/* Additional authoring controls share the simple builder model and persistence. */
Object.assign(M.types, {grid_radio: 'Multiple choice grid', grid_checkbox: 'Checkbox grid', rating: 'Rating', linear_scale: 'Linear scale', time: 'Time', dropdown: 'Dropdown'});
types.push('grid_radio', 'grid_checkbox', 'rating', 'linear_scale', 'time', 'dropdown');
const toolsBar = document.createElement('div');
toolsBar.className = 'author-tools';
toolsBar.innerHTML = '<label>Add questions to<select id="section-target"></select></label><button class="button" id="new-section">New section</button><button class="button" id="import-questions">Import questions</button>';
$('#questions').before(toolsBar);
const originalRender = render;
const originalPreview = renderPreview;
let sectionTarget = form.sections[0].id;
let editingTarget = null;

renderPreview = function(previewId) {
  originalPreview(previewId);
  const container = $('#' + previewId + '-questions');
  const rows = [...container.children];
  container.replaceChildren();
  const sectionLabel = document.createElement('label');
  sectionLabel.className = 'preview-section-nav';
  sectionLabel.textContent = 'Preview section';
  const sectionSelect = document.createElement('select');
  sectionSelect.replaceChildren(...form.sections.map((section,index)=>new Option(section.title || 'Untitled section',index)));
  sectionSelect.onchange = () => container.querySelectorAll('.preview-section-title')[Number(sectionSelect.value)].scrollIntoView({block:'nearest'});
  sectionLabel.append(sectionSelect);
  container.append(sectionLabel);
  for (const section of form.sections) {
    const heading = document.createElement('h3');
    heading.className = 'preview-section-title';
    heading.textContent = section.title || 'Untitled section';
    container.append(heading);
    form.fields.forEach((field, index) => {
      if (field.section_id !== section.id) return;
      if (field.image) {
        const image = document.createElement('img');
        image.className = 'question-image';
        image.src = field.image.src;
        image.alt = field.image.alt;
        rows[index].append(image);
      }
      if (['short_text','long_text'].includes(field.type)) {
        const answer = rows[index].querySelector('input,textarea');
        answer.maxLength = field.max;
        answer.minLength = field.min;
      }
      rows[index].dataset.previewField = field.id;
      container.append(rows[index]);
    });
  }
  const check = document.createElement('button');
  check.className = 'button';
  check.textContent = 'Check answers';
  check.onclick = () => validatePreview(container);
  const receipt = document.createElement('p');
  receipt.className = 'preview-validation';
  receipt.setAttribute('role','status');
  container.append(check, receipt);
  if (previewId === 'inline-preview') followEditingTarget();
};

render = function() {
  originalRender();
  const select = $('#section-target');
  select.replaceChildren(...form.sections.map(section => new Option(section.title || 'Untitled section', section.id)));
  select.value = sectionTarget;
  select.disabled = !editable();
  $('#new-section').disabled = !editable() || form.sections.length >= 20;
  $('#import-questions').disabled = !editable();
  const cards = [...$('#questions').children];
  $('#questions').replaceChildren();
  for (const [index, section] of form.sections.entries()) {
    const group = document.createElement('section');
    group.className = 'form-section';
    group.dataset.section = section.id;
    const label = document.createElement('label');
    label.className = 'section-heading';
    label.textContent = 'Section ' + (index + 1);
    const title = document.createElement('input');
    title.value = section.title;
    title.maxLength = 200;
    title.disabled = !editable();
    title.oninput = event => {
      event.stopPropagation();
      section.title = title.value;
      select.options[index].textContent = title.value || 'Untitled section';
      update();
    };
    label.append(title);
    group.append(label);
    form.fields.forEach((field, fieldIndex) => {
      if (field.section_id !== section.id) return;
      const card = cards[fieldIndex];
      addImageControls(card, field);
      addDragHandle(card, field, fieldIndex);
      addTypeSettings(card, field);
      const disclosure = card.querySelector("details");
      disclosure?.addEventListener("toggle", () => disclosure.querySelector("summary").setAttribute("aria-expanded", disclosure.open));
      group.append(card);
    });
    $('#questions').append(group);
  }
  renderSummary();
  renderPreview('inline-preview');
};

function addImageControls(card, field) {
  if (field.image) {
    const image = document.createElement('img');
    image.src = field.image.src;
    image.alt = field.image.alt;
    image.className = 'question-image';
    const label = document.createElement('label');
    label.textContent = 'Image description';
    const input = document.createElement('input');
    input.value = field.image.alt;
    input.maxLength = 250;
    input.disabled = !editable();
    input.oninput = event => { event.stopPropagation(); field.image.alt = input.value; image.alt = input.value; update(); };
    label.append(input);
    card.querySelector('.question-header').after(image, label);
  }
  if (!editable()) return;
  const button = document.createElement('button');
  button.className = 'text-button';
  button.textContent = field.image ? 'Replace image' : 'Add image';
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = 'image/png,image/jpeg,image/webp';
  picker.hidden = true;
  button.onclick = () => picker.click();
  picker.oninput = event => event.stopPropagation();
  picker.onchange = event => {
    event.stopPropagation();
    const file = picker.files[0];
    if (!file) return;
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      status('Choose a PNG, JPEG or WebP image up to 1 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (!editable() || !form.fields.includes(field)) return;
      field.image = {src: reader.result, alt: file.name.replace(/\.[^.]+$/, '')};
      render(); update();
    };
    reader.onerror = () => status('Image could not be opened. Choose another file.');
    reader.readAsDataURL(file);
  };
  card.querySelector('.question-footer').prepend(button, picker);
  if (field.image) {
    const remove = document.createElement('button');
    remove.className = 'text-button';
    remove.textContent = 'Remove image';
    remove.onclick = () => { delete field.image; render(); update(); };
    button.after(remove);
  }
}

$('#section-target').onchange = event => { sectionTarget = event.target.value; };
$('#new-section').onclick = () => {
  const section = {id: M.blank().sections[0].id, title: 'New section', guidance: ''};
  form.sections.push(section);
  sectionTarget = section.id;
  render(); update();
  [...document.querySelectorAll('.section-heading input')].at(-1).focus();
};

const importDialog = document.createElement('dialog');
importDialog.setAttribute('aria-labelledby', 'import-title');
importDialog.innerHTML = '<header><h2 id="import-title">Import questions</h2><button class="button" id="cancel-import">Cancel</button></header><p>Choose questions from sample templates or earlier builder drafts saved in this browser.</p><label>Source form<select id="import-source"></select></label><div id="import-list"></div><p id="import-error" role="alert"></p><button class="button primary" id="confirm-import">Add selected questions</button>';
document.body.append(importDialog);
let sources = [];
$('#import-questions').onclick = () => {
  sources = [M.starter(), ...JSON.parse(localStorage.getItem('clearsight-create-form-prototype') || '[]')];
  $('#import-source').replaceChildren(...sources.map((source, index) => new Option((source.name || 'Untitled form') + (index === 0 ? ' · Sample' : ' · Local draft'), index)));
  $('#import-error').textContent = '';
  showImport();
  openDialog(importDialog);
};
$('#cancel-import').onclick = () => importDialog.close();
importDialog.addEventListener('close', () => $('#import-questions').focus());
function showImport() {
  const source = sources[Number($('#import-source').value)];
  $('#import-list').innerHTML = source.fields.map((field, index) => '<label class="import-row"><input type="checkbox" value="' + index + '" ' + (types.includes(field.type) ? '' : 'disabled') + '><span><strong>' + esc(field.label || 'Untitled question') + '</strong><small>' + esc(M.types[field.type] || 'Unsupported type') + '</small></span></label>').join('');
}
$('#import-source').onchange = showImport;
$('#confirm-import').onclick = () => {
  const chosen = [...document.querySelectorAll('#import-list input:checked')];
  if (!chosen.length) { $('#import-error').textContent = 'Select at least one question.'; return; }
  if (chosen.length + form.fields.length > 200) { $('#import-error').textContent = 'Use up to 200 questions.'; return; }
  const source = sources[Number($('#import-source').value)];
  const imported = chosen.map(input => {
    const field = source.fields[Number(input.value)];
    return {...structuredClone(field), id: M.field(sectionTarget).id, section_id: sectionTarget,
      importedFrom: {form: source.id, revision: source.version, question: field.id}};
  });
  form.fields.push(...imported);
  render(); update();
  importDialog.close();
  focusQuestion(imported[0]);
};
render();


function moveQuestion(sourceId, targetId, after = false) {
  if (!editable() || sourceId === targetId) return;
  const source = form.fields.find(field => field.id === sourceId);
  const target = form.fields.find(field => field.id === targetId);
  if (!source || !target) return;
  const ordered = form.sections.flatMap(section => form.fields.filter(field => field.section_id === section.id && field.id !== sourceId));
  source.section_id = target.section_id;
  ordered.splice(ordered.indexOf(target) + Number(after), 0, source);
  form.fields = ordered;
  render(); update();
  focusQuestion(source, '.drag-handle');
  status('Question moved. Unsaved changes.');
}
function addDragHandle(card, field) {
  if (!editable()) return;
  const handle = document.createElement('button');
  handle.className = 'text-button drag-handle';
  handle.setAttribute('aria-label', 'Reorder question ' + (form.fields.indexOf(field) + 1));
  handle.title = 'Drag to reorder. Use Arrow Up or Arrow Down on the handle.';
  handle.innerHTML = '<span aria-hidden="true">⠿</span>';
  let target = null;
  let after = false;
  let start = null;
  function clearTarget() {
    document.querySelectorAll('.drop-before,.drop-after').forEach(item => item.classList.remove('drop-before','drop-after'));
  }
  handle.onpointerdown = event => {
    if (event.button !== 0) return;
    event.preventDefault();
    handle.focus();
    start = {x: event.clientX, y: event.clientY};
    target = null;
    handle.setPointerCapture(event.pointerId);
  };
  handle.onpointermove = event => {
    if (!start || Math.hypot(event.clientX-start.x, event.clientY-start.y) < 5) return;
    card.classList.add('dragging');
    clearTarget();
    const hovered = document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-question]');
    target = hovered && hovered !== card ? hovered : null;
    if (target) {
      after = event.clientY > target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2;
      target.classList.add(after ? 'drop-after' : 'drop-before');
    }
    if (event.clientY > window.innerHeight-60) window.scrollBy(0,18);
    if (event.clientY < 130) window.scrollBy(0,-18);
  };
  handle.onpointerup = () => {
    start = null;
    card.classList.remove('dragging');
    clearTarget();
    if (target) moveQuestion(field.id,target.dataset.question,after);
    target = null;
  };
  handle.onpointercancel = () => { start=null; target=null; card.classList.remove('dragging'); clearTarget(); };
  handle.onkeydown = event => {
    if (!['ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const ordered = form.sections.flatMap(section => form.fields.filter(item => item.section_id === section.id));
    const direction = event.key === 'ArrowUp' ? -1 : 1;
    const next = ordered[ordered.indexOf(field) + direction];
    if (next) moveQuestion(field.id,next.id,direction === 1);
  };
  card.prepend(handle);
}

function addTypeSettings(card, field) {
  const grid = ['grid_radio','grid_checkbox'].includes(field.type);
  const scale = ['rating','linear_scale'].includes(field.type);
  if (!grid && !scale && field.type !== 'dropdown') return;
  if (grid) { field.rows ??= ['Row 1','Row 2']; field.columns ??= ['Yes','No','Not applicable']; }
  if (scale) { field.scaleMax ??= 5; }
  if (field.type === 'dropdown' && field.options.length < 2) field.options = ['Option 1','Option 2'];
  const settings = document.createElement('div');
  settings.className = 'type-settings';
  function listEditor(labelText, property) {
    const list = document.createElement('section');
    list.className = 'option-editor';
    list.setAttribute('aria-label',labelText);
    const heading = document.createElement('h3');
    heading.textContent = labelText;
    const items = document.createElement('div');
    const add = document.createElement('button');
    add.className = 'text-button add-option';
    const singular = property === 'rows' ? 'row' : property === 'columns' ? 'column' : 'option';
    add.textContent = '+ Add ' + singular;
    const maximum = grid ? 20 : 50;
    const minimum = property === 'options' ? 2 : 1;
    function renderList() {
      items.replaceChildren();
      field[property].forEach((value,index) => {
        const row = document.createElement('div');
        row.className = 'editable-option';
        const marker = document.createElement('span');
        marker.className = property === 'columns' ? 'option-marker ' + (field.type === 'grid_checkbox' ? 'square' : 'circle') : 'option-number';
        marker.setAttribute('aria-hidden','true');
        if (property !== 'columns') marker.textContent = (index + 1) + '.';
        const input = document.createElement('input');
        input.value = value;
        input.maxLength = 150;
        input.placeholder = singular[0].toUpperCase() + singular.slice(1) + ' ' + (index+1);
        input.setAttribute('aria-label',singular[0].toUpperCase()+singular.slice(1)+' '+(index+1));
        input.disabled = !editable();
        input.oninput = event => {
          event.stopPropagation();
          field[property][index] = input.value;
          update();
        };
        const remove = document.createElement('button');
        remove.className = 'text-button remove-option';
        remove.textContent = '×';
        remove.setAttribute('aria-label','Remove '+singular+' '+(index+1));
        remove.disabled = !editable() || field[property].length <= minimum;
        remove.onclick = () => {
          field[property].splice(index,1);
          renderList(); update();
          items.querySelectorAll('input')[Math.min(index,field[property].length-1)].focus();
        };
        row.append(marker,input,remove);
        items.append(row);
      });
      add.disabled = !editable() || field[property].length >= maximum;
    }
    add.onclick = () => {
      field[property].push('');
      renderList(); update();
      [...items.querySelectorAll('input')].at(-1).focus();
    };
    renderList();
    list.append(heading,items,add);
    settings.append(list);
  }
  if (grid) { settings.classList.add('grid-authoring'); listEditor('Rows','rows'); listEditor('Columns','columns'); }
  if (field.type === 'dropdown') listEditor('Options','options');
  if (scale) {
    const label = document.createElement('label');
    label.textContent = field.type === 'rating' ? 'Number of stars' : 'Scale from 1 to';
    const select = document.createElement('select');
    for (let n=2;n<=10;n++) select.add(new Option(n,n));
    select.value = field.scaleMax;
    select.disabled = !editable();
    select.onchange = event => { event.stopPropagation(); field.scaleMax=Number(select.value); update(); };
    label.append(select); settings.append(label);
  }
  card.querySelector('.question-header').after(settings);
}

const basicPreviewControl = previewControl;
previewControl = function(field, previewId) {
  if (field.type === 'file') return '<label>Select evidence file<input type="file" aria-label="' + esc(field.label || 'Evidence file') + '"></label><small>Local preview only · file is not uploaded or scanned.</small>';
  if (field.type === 'time') return '<input type="time" aria-label="' + esc(field.label || 'Time') + '">';
  if (field.type === 'dropdown') return '<select aria-label="' + esc(field.label || 'Dropdown') + '"><option value="">Choose an answer</option>' + field.options.map(option => '<option>'+esc(option)+'</option>').join('')+'</select>';
  if (['rating','linear_scale'].includes(field.type)) {
    const max = field.scaleMax || 5;
    return '<div class="scale-options '+(field.type==='rating'?'star-options':'number-options')+'">' + Array.from({length:max},(_,index) => '<label><input aria-label="'+(index+1)+' of '+max+(field.type==='rating'?' stars':'')+'" type="radio" name="'+previewId+'-'+field.id+'" value="'+(index+1)+'"><span aria-hidden="true">'+(field.type==='rating'?'★':index+1)+'</span>'+(field.type==='rating'?'<small aria-hidden="true">'+(index+1)+'</small>':'')+'</label>').join('')+'</div><small class="scale-range">1 to '+max+'</small>';

  }
  if (['grid_radio','grid_checkbox'].includes(field.type)) {
    const columns = field.columns || ['Yes','No','Not applicable'];
    const inputType = field.type === 'grid_radio' ? 'radio' : 'checkbox';
    return '<div class="grid-options" tabindex="0" role="region" aria-label="Answer grid"><table><thead><tr><th scope="col">Item</th>' + columns.map(column=>'<th scope="col">'+esc(column)+'</th>').join('')+'</tr></thead><tbody>' + (field.rows || ['Row 1','Row 2']).map((row,index)=>'<tr><th scope="row">'+esc(row)+'</th>'+columns.map(column=>'<td><input aria-label="'+esc(row+' — '+column)+'" type="'+inputType+'" name="'+previewId+'-'+field.id+'-'+index+'" value="'+esc(column)+'"></td>').join('')+'</tr>').join('')+'</tbody></table></div>';

  }
  return basicPreviewControl(field,previewId);
};
const basicIssues = approvalIssues;
approvalIssues = function() {
  const issues = basicIssues();
  form.fields.forEach((field,index) => {
    for (const property of ['rows','columns']) {
      if (['grid_radio','grid_checkbox'].includes(field.type)) {
        const values=field[property] || [];
        if (!values.length || values.length>20 || values.some(value=>!value.trim()) || new Set(values.map(value=>value.trim())).size!==values.length) issues.push('Question '+(index+1)+' needs 1–20 unique, nonblank '+property+'.');
      }
    }
    if (['rating','linear_scale'].includes(field.type) && (!Number.isInteger(field.scaleMax) || field.scaleMax<2 || field.scaleMax>10)) issues.push('Question '+(index+1)+' needs a scale between 2 and 10.');
    if (field.type==='dropdown' && (field.options.length<2 || field.options.some(value=>!value.trim()) || new Set(field.options.map(value=>value.trim())).size!==field.options.length)) issues.push('Question '+(index+1)+' needs unique, nonblank choices.');
  });
  return issues;
};
render();

for (const previewId of ['preview','inline-preview']) {
  $('#' + previewId + '-questions').addEventListener('change', event => {
    if (event.target.type !== 'file') return;
    let receipt = event.target.parentElement.querySelector('.file-selection');
    if (!receipt) {
      receipt = document.createElement('span');
      receipt.className = 'file-selection';
      receipt.setAttribute('role','status');
      event.target.after(receipt);
    }
    receipt.textContent = event.target.files[0] ? 'Selected locally · ' + event.target.files[0].name : 'No file selected';
  });
}

function validatePreview(container) {
  let invalidCount = 0;
  let firstInvalid;
  for (const fieldset of container.querySelectorAll('[data-preview-field]')) {
    const field = form.fields.find(item => item.id === fieldset.dataset.previewField);
    fieldset.querySelectorAll('.answer-error').forEach(error => error.remove());
    fieldset.querySelectorAll('[aria-invalid]').forEach(control => {
      control.removeAttribute('aria-invalid');
      control.removeAttribute('aria-describedby');
    });
    const messages = [];
    function reject(control, message) {
      control ??= fieldset;
      if (control === fieldset) control.tabIndex = -1;
      const error = document.createElement('p');
      error.className = 'answer-error';
      error.id = container.id + '-error-' + field.id + '-' + messages.length;
      error.textContent = message;
      control.setAttribute('aria-invalid','true');
      control.setAttribute('aria-describedby',error.id);
      fieldset.append(error);
      firstInvalid ??= control;
      messages.push(message);
    }
    const controls = [...fieldset.querySelectorAll('input,textarea,select')].filter(control => !control.disabled && !control.closest('[data-preview-follow-up]'));
    if (['grid_radio','grid_checkbox'].includes(field.type)) {
      for (const row of fieldset.querySelectorAll('tbody tr')) {
        if (field.required && !row.querySelector('input:checked')) reject(row.querySelector('input'),'Choose an answer for ' + row.querySelector('th').textContent + '.');
      }
    } else if (['yes_no','single_select','multi_select','attestation','rating','linear_scale'].includes(field.type)) {
      if (field.required && !controls.some(control => control.checked)) reject(controls[0],'Choose an answer.');
    } else {
      const control = controls[0];
      if (control) {
        const empty = control.type === 'file' ? control.files.length === 0 : !control.value.trim();
        if (field.required && empty) reject(control,control.type === 'file' ? 'Select an evidence file.' : 'Enter an answer.');
        else if (!empty && !control.validity.valid) reject(control,'Enter a valid answer.');
      }
    }
    for (const control of fieldset.querySelectorAll('[data-preview-follow-up] input:not(:disabled),[data-preview-follow-up] textarea:not(:disabled)')) {
      if (!control.value.trim()) reject(control,'Complete the follow-up question.');
      else if (!control.validity.valid) reject(control,'Enter a valid follow-up answer.');
    }
    if (messages.length) invalidCount++;
  }
  container.querySelector('.preview-validation').textContent = invalidCount
    ? invalidCount + (invalidCount === 1 ? ' question needs attention.' : ' questions need attention.') : 'All answers pass the preview checks. Nothing has been submitted.';
  firstInvalid?.focus();
}

function followEditingTarget(previewId = 'inline-preview') {
  if (!editingTarget) return;
  const panel = previewId === 'preview' ? $('#preview-dialog') : $('#respondent-panel');
  if (!panel || panel.getBoundingClientRect().width === 0) return;
  const container = $('#' + previewId + '-questions');
  const targets = [...container.querySelectorAll('[data-preview-field]')];
  const previewQuestion = targets.find(item => item.dataset.previewField === editingTarget.field);
  const sectionIndex = form.sections.findIndex(section => section.id === editingTarget.section);
  const target = previewQuestion || container.querySelectorAll('.preview-section-title')[sectionIndex];
  if (!target) return;
  container.querySelectorAll('.is-editing-preview').forEach(item=>item.classList.remove('is-editing-preview'));
  target.classList.add('is-editing-preview');
  const sectionSelect = container.querySelector('.preview-section-nav select');
  if (sectionIndex >= 0) sectionSelect.value = sectionIndex;
  panel.scrollTop += target.getBoundingClientRect().top - panel.getBoundingClientRect().top - 20;
}
function trackEditingTarget(event) {
  const section = event.target.closest('.form-section');
  if (!section) return;
  const question = event.target.closest('[data-question]');
  editingTarget = {section:section.dataset.section,field:question?.dataset.question};
  document.querySelectorAll('.is-editing-question').forEach(item=>item.classList.remove('is-editing-question'));
  question?.classList.add('is-editing-question');
  followEditingTarget();
}
$('#questions').addEventListener('focusin',trackEditingTarget);
$('#questions').addEventListener('click',trackEditingTarget,true);
$('#section-target').addEventListener('change',event=>{
  editingTarget={section:event.target.value};
  followEditingTarget();
});

$('#preview').addEventListener('click', () => followEditingTarget('preview'));
