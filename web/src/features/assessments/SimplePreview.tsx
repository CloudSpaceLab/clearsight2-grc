import { useLayoutEffect, useRef, useState } from 'react'
import type { SimpleDraft } from './simpleFormModel'

export type EditingTarget = {sectionId:string;questionId?:string}
type Props = {draft:SimpleDraft;answer:Record<string,string>;setAnswer:(v:Record<string,string>)=>void;prefix:string;editingTarget:EditingTarget|null}

/** Practice answers are local to this preview and are never submitted. */
export function SimplePreview({draft,answer,setAnswer,prefix,editingTarget}:Props){
  const root=useRef<HTMLDivElement>(null)
  const [result,setResult]=useState('')
  const [invalid,setInvalid]=useState<string[]>([])
  const sections=draft.sections||[{id:draft.sectionId,title:'Questions'}]
  const [selectedSection,setSelectedSection]=useState(draft.sectionId)
  useLayoutEffect(()=>{if(!editingTarget)return;const rootElement=root.current;if(!rootElement)return;const section=rootElement.querySelector<HTMLElement>(`[data-preview-section="${CSS.escape(editingTarget.sectionId)}"]`);const question=editingTarget.questionId?rootElement.querySelector<HTMLElement>(`[data-preview-id="${CSS.escape(editingTarget.questionId)}"]`):null;const destination=editingTarget.questionId==='__form__'?rootElement:question||section;setSelectedSection(editingTarget.sectionId);const panel=rootElement.closest<HTMLElement>('.simple-respondent, .simple-dialog');if(destination&&panel&&panel.getClientRects().length){const top=destination.getBoundingClientRect().top-panel.getBoundingClientRect().top;panel.scrollTop+=top-20}},[editingTarget])
  function check(){
    const bad:string[]=[]
    let first:HTMLElement|null=null
    for(const q of draft.questions){
      const field=root.current?.querySelector<HTMLElement>(`[data-preview-id="${CSS.escape(q.id)}"]`)
      if(!field)continue
      const controls=Array.from(field.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('input,textarea')).filter(c=>!c.closest('[data-follow-up]'))
      let failed=false
      if(q.required){
        if(['grid_radio','grid_checkbox'].includes(q.type))failed=Array.from(field.querySelectorAll('tbody tr')).some(row=>!row.querySelector('input:checked'))
        else if(['yes_no','single_select','multi_select','attestation','rating','linear_scale'].includes(q.type))failed=!controls.some(c=>(c as HTMLInputElement).checked)
        else if(q.type==='dropdown')failed=!field.querySelector<HTMLSelectElement>('select')?.value
        else if(q.type==='file')failed=!((controls[0] as HTMLInputElement|undefined)?.files?.length)
        else failed=!controls[0]?.value.trim()
      }
      if(!failed)failed=controls.some(c=>!!c.value&&!c.validity.valid)
      const follow=Array.from(field.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('[data-follow-up] input,[data-follow-up] textarea'))
      if(follow.some(c=>!c.value.trim()||!c.validity.valid))failed=true
      if(failed){bad.push(q.id);first??=controls[0]||field}
    }
    setInvalid(bad)
    setResult(bad.length?`${bad.length} ${bad.length===1?'question needs':'questions need'} attention.`:'All answers pass the preview checks. Nothing has been submitted.')
    first?.focus()
  }
  return <div className="simple-preview" ref={root}>
    <div className={editingTarget?.questionId==='__form__'?'simple-preview-current':undefined}><h3>{draft.name||'Untitled form'}</h3><p>{draft.purpose}</p></div>
    <label className="simple-preview-nav">Preview section<select aria-label="Preview section" value={sections.some(s=>s.id===selectedSection)?selectedSection:sections[0]?.id} onChange={e=>{setSelectedSection(e.target.value);const section=root.current?.querySelector<HTMLElement>(`[data-preview-section="${CSS.escape(e.target.value)}"]`);const panel=root.current?.closest<HTMLElement>('.simple-respondent, .simple-dialog');if(section&&panel)panel.scrollTop+=section.getBoundingClientRect().top-panel.getBoundingClientRect().top-20}}>{sections.map(s=><option value={s.id} key={s.id}>{s.title||'Untitled section'}</option>)}</select></label>
    {sections.map(section=><div key={section.id} data-preview-section={section.id} className={editingTarget?.sectionId===section.id&&!editingTarget.questionId?'simple-preview-current':undefined}><h3>{section.title||'Untitled section'}</h3>{draft.questions.filter(q=>(q.sectionId||draft.sectionId)===section.id).map(q=><fieldset className={`simple-preview-item${editingTarget?.questionId===q.id?' simple-preview-current':''}`} key={q.id} data-preview-id={q.id}>
      <legend>{q.label||'Untitled question'}{q.required?' (required)':''}</legend>
      {q.image&&<img className="simple-preview-image" src={q.image.data} alt={q.image.alt}/>}
      {['grid_radio','grid_checkbox'].includes(q.type)?<div className="simple-preview-grid" role="region" aria-label="Answer grid" tabIndex={0}><table><thead><tr><th scope="col">Item</th>{(q.columns||[]).map((col,i)=><th key={i} scope="col">{col}</th>)}</tr></thead><tbody>{(q.rows||[]).map((row,index)=><tr key={index}><th scope="row">{row}</th>{(q.columns||[]).map((col,i)=><td key={i}><input type={q.type==='grid_radio'?'radio':'checkbox'} aria-label={`${row} — ${col}`} name={`${prefix}-${q.id}-${index}`} value={col}/></td>)}</tr>)}</tbody></table></div>:['rating','linear_scale'].includes(q.type)?<div className="simple-preview-scale">{Array.from({length:q.scaleMax||5},(_,i)=>i+1).map(n=><label key={n}><input type="radio" name={`${prefix}-${q.id}`} value={n} aria-label={`${n} of ${q.scaleMax||5}`}/>{q.type==='rating'?'★':n}</label>)}</div>:q.type==='dropdown'?<select aria-label={`${q.label||'Untitled question'} preview answer`} defaultValue=""><option value="">Choose an answer</option>{q.options.filter(Boolean).map((o,i)=><option key={i}>{o}</option>)}</select>:q.type==='file'?<label>Select evidence file<input type="file" aria-label={`${q.label||'Evidence file'} preview answer`}/><small>Local preview only · file is not uploaded or scanned.</small></label>:q.type==='attestation'?<label><input type="checkbox"/> I confirm</label>:['yes_no','single_select','multi_select'].includes(q.type)?(q.type==='yes_no'?['Yes','No']:q.options.filter(Boolean)).map(option=><label key={option}><input type={q.type==='multi_select'?'checkbox':'radio'} name={`${prefix}-${q.id}`} value={option} checked={q.type==='multi_select'?undefined:answer[`${prefix}-${q.id}`]===option} onChange={()=>setAnswer({...answer,[`${prefix}-${q.id}`]:option})}/> {option}</label>):q.type==='long_text'?<textarea aria-label={`${q.label||'Untitled question'} preview answer`} rows={3}/>:<input aria-label={`${q.label||'Untitled question'} preview answer`} type={q.type==='date'?'date':q.type==='time'?'time':'text'}/>}
      {q.type==='yes_no'&&answer[`${prefix}-${q.id}`]==='Yes'&&q.followUp.length>0&&<div className="simple-follow" data-follow-up>{q.followUp.map(f=><label key={f.id}>{f.label||'Untitled follow-up question'}{f.type==='long_text'?<textarea rows={2}/>:<input type={f.type==='date'?'date':'text'}/>}</label>)}</div>}
      {invalid.includes(q.id)&&<p className="simple-preview-error" role="alert">Complete this question and any visible follow-up.</p>}
    </fieldset>)}</div>)}
    <button className="button" type="button" onClick={check}>Check answers</button><p role="status">{result}</p>
  </div>
}
