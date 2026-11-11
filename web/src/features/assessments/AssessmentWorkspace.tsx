import { useEffect, useState } from 'react'
import { Icon } from '../../shared/Icons'
import { useWorkspaceTabs } from '../../shared/useWorkspaceTabs'
import { useV1Session } from '../programs/V1Session'
import { v1 } from '../programs/v1Client'
import { FormAuthoring } from './FormAuthoring'
import './assessment.css'

const modes=['questions','import','review'] as const
type Mode = typeof modes[number]
type LibraryForm = {id:string;name:string;purpose?:string;status:string;version:number;is_current:boolean;sections?:{id:string;title:string;help?:string}[];fields:{id:string;section_id?:string;label:string;type:string;required:boolean;description?:string}[]}

export function AssessmentWorkspace({onAuthoringDirty}:{onAuthoringDirty:(dirty:boolean)=>void}) {
  const [authoring,setAuthoring]=useState(false)
  return <><div hidden={authoring}><AssessmentBrowser openAuthoring={()=>setAuthoring(true)}/></div>{authoring&&<FormAuthoring onDirty={onAuthoringDirty} onBack={()=>setAuthoring(false)}/>}</>
}

function AssessmentBrowser({openAuthoring}:{openAuthoring:()=>void}) {
  const [mode,setMode]=useState<Mode>('questions')
  const {context}=useV1Session()
  const [forms,setForms]=useState<LibraryForm[]>([])
  const [formId,setFormId]=useState('')
  const [sectionId,setSectionId]=useState('')
  const [reload,setReload]=useState(0)
  const [loadState,setLoadState]=useState<'loading'|'ready'|'error'>('loading')
  useEffect(()=>{if(!context){setForms([]);setFormId('');setLoadState('ready');return}let active=true;setLoadState('loading');void v1<{items:LibraryForm[]}>('/api/v1/form-templates?limit=100').then(result=>{if(!Array.isArray(result.items))throw Error('Invalid form list');if(active){setForms(result.items.filter(item=>item&&typeof item.id==='string'&&typeof item.name==='string'&&typeof item.version==='number'&&Array.isArray(item.fields)));setLoadState('ready')}}).catch(()=>{if(active){setForms([]);setLoadState('error')}});return()=>{active=false}},[context,reload])
  const form=forms.find(item=>`${item.id}:${item.version}`===formId)
  const fields=form?.fields.filter(field=>!sectionId||field.section_id===sectionId)||[]
  const sections=form?.sections||[]
  const sectionIndex=sections.findIndex(section=>section.id===sectionId)
  const tabs=useWorkspaceTabs(modes,mode,setMode)
  return <>
    <nav className="crumbs assessment-crumbs" aria-label="Breadcrumb">
      <span>Forms</span><Icon name="next"/><span aria-current="page">Assessment workspace</span>
    </nav>
    <header className="assessment-heading">
      <div className="heading-copy">
        <div className="eyebrow">ASSESSMENTS <span className="eyebrow-dot">·</span> WORKSPACE</div>
        <h1>{form?.name||'Assessment workspace'}</h1>
        <p>{form?.purpose||'Select an authorized form to inspect its questions, then open a Program assessment to respond.'}</p>
        <div className="heading-meta">
          <span className="status draft"><span className="status-dot"/>{form?`${form.status} · Version ${form.version}`:'No form selected'}</span>
          <span>Source <strong>{form?'Authorized form library':'Not selected'}</strong></span>
        </div>
      </div>
      <svg className="mountains" viewBox="0 0 700 180" aria-hidden="true" preserveAspectRatio="none">
        <defs><linearGradient id="assessment-mountain-1" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#86c9ff" stopOpacity=".46"/><stop offset="1" stopColor="#c0e8ff" stopOpacity="0"/>
        </linearGradient></defs>
        <path d="M0 165Q85 125 135 149T267 112T430 125T562 70T700 135V180H0Z" fill="url(#assessment-mountain-1)"/>
        <path d="M0 178Q80 150 171 168T355 104T538 147T700 110V180H0Z" fill="#b4ddff" fillOpacity=".28"/>
      </svg>
      <div className="heading-tools">
        <span className="prototype-tag"><Icon name="info"/>{form?'Form definition · Read only':'No authorized assessment'}</span>
        <button type="button" className="button primary" onClick={openAuthoring}>+ Create form</button>
        <button type="button" disabled className="button secondary" title="An authorized assessment is required">Save draft</button>
        <button type="button" disabled className="button primary" title="Responses and a reviewer must be verified">Review responses <Icon name="next"/></button>
      </div>
    </header>
    <nav className="work-mode-tabs" role="tablist" aria-label="Assessment views" onKeyDown={tabs.onKeyDown}>
      {modes.map((id,i)=><button key={id} type="button" role="tab"
        id={'assessment-tab-'+id} aria-controls={'assessment-view-'+id}
        ref={tabs.refAt(i)} tabIndex={mode===id?0:-1} aria-selected={mode===id}
        className={'mode-tab'+(mode===id?' selected':'')} onClick={()=>setMode(id)}>
        {id==='questions'?<Icon name="form"/>:id==='import'?<Icon name="external"/>:<Icon name="shield"/>}
        {id==='questions'?'Questions':id==='import'?'Excel import':'Review'}
      </button>)}
      <div className="mode-meta"><Icon name="info"/>No draft loaded</div>
    </nav>
    <section className="completion-strip" aria-label="Assessment progress unavailable">
      <div className="completion-info"><div><span className="completion-label">Completion</span>
        <strong>Not available</strong></div><span>—</span></div>
      <div className="completion-meter" role="progressbar" aria-label="Assessment completion unavailable"/>
      <div className="completion-details">
        <span><i className="status-pin teal"/><strong>Answered —</strong></span>
        <span><i className="status-pin amber"/><strong>To verify —</strong></span>
        <span><i className="status-pin gray"/><strong>Unanswered —</strong></span>
      </div>
    </section>
    {mode==='questions'&&<div id="assessment-view-questions" role="tabpanel"
      aria-labelledby="assessment-tab-questions" className="assessment-body">
      <aside className="sections-panel surface" aria-label="Questionnaire sections">
        <div className="panel-eyebrow">Questionnaire</div><h2>Sections</h2>
        <label className="assessment-form-selector">Form<select value={formId} disabled={!context||loadState==='loading'} onChange={event=>{setFormId(event.target.value);setSectionId('')}}><option value="">Select a form</option>{forms.map(item=><option key={`${item.id}:${item.version}`} value={`${item.id}:${item.version}`}>{item.name} · v{item.version} · {item.status}</option>)}</select></label>
        <div className="sections-list">{form ? <><button type="button" className={'section-entry'+(!sectionId?' selected':'')} aria-pressed={!sectionId} onClick={()=>setSectionId('')}><span className="section-name">All questions</span><span className="section-count">{form.fields.length}</span></button>{sections.map(section=><button key={section.id} type="button" className={'section-entry'+(sectionId===section.id?' selected':'')} aria-pressed={sectionId===section.id} onClick={()=>setSectionId(section.id)}><span className="section-name">{section.title}</span><span className="section-count">{form.fields.filter(field=>field.section_id===section.id).length}</span></button>)}</> : <div className="assessment-empty"><strong>{loadState==='loading'?'Loading forms…':loadState==='error'?'Forms unavailable':context?'No form selected':'Sign in required'}</strong>{loadState==='error'?<>The form library could not be loaded. <button type="button" className="assessment-retry" onClick={()=>setReload(value=>value+1)}>Try again</button></>:context?'Select a form to inspect its questions.':'Sign in to load authorized forms.'}</div>}</div>
        <div className="section-separator"/>
        <div className="section-brief"><Icon name="info"/><p>Previously recorded answers require authorized source revision and confirmation.</p></div>
        <button type="button" className="secondary-link" onClick={()=>setMode('import')}>
          <Icon name="external"/>Excel import <Icon name="next" className="end"/></button>
      </aside>
      <div className="questions-column">
        <div className="section-title-row"><div>
          <div className="panel-eyebrow">Questions</div><h2>{form?(sectionId?form.sections?.find(section=>section.id===sectionId)?.title||'Questions':'All questions'):'Questions unavailable'}</h2>
          <p>{form?'Form definition · Responses are collected in a Program assessment.':'Questionnaire content will appear after form selection.'}</p></div>
          <span className="section-progress">{form?`${fields.length} questions`:'—'}</span></div>
        <div className="questions-stack">{form ? fields.length ? fields.map(field=><article className="question-card" key={field.id}><div className="question-number">Question {form.fields.indexOf(field)+1}{field.required?' · Required':''}</div><h3 className="question-text">{field.label}</h3>{field.description&&<p className="question-help">{field.description}</p>}<p className="assessment-field-type">Response type: {field.type.replaceAll('_',' ')}</p></article>) : <div className="assessment-empty">No questions in this section.</div> : <div className="assessment-empty"><strong>No authorized questions</strong>No responses, answer options or mappings are available.</div>}</div>
        <footer className="question-footer">
          <button type="button" className="button" disabled={!form||!sectionId} onClick={()=>setSectionId(sectionIndex>0?(sections[sectionIndex-1]?.id||''):'')}>Previous</button>
          <div className="question-footer-right"><span>Browse the form definition</span>
            <button type="button" className="button primary" disabled={!form||!sections.length||sectionIndex===sections.length-1} onClick={()=>setSectionId(sections[sectionIndex+1]?.id||'')}>Next section <Icon name="next"/></button></div>
        </footer>
      </div>
      <aside className="assistance-column" aria-label="Evidence and response assistance">
        <section className="surface review-summary"><div className="side-head">
          <h2>Review readiness</h2><span className="soft-pill gray">Unavailable</span></div>
          <div className="readiness-list">
            <div><span><i className="status-pin teal"/>Answered</span><strong>—</strong></div>
            <div><span><i className="status-pin amber"/>To verify</span><strong>—</strong></div>
            <div><span><i className="status-pin coral"/>Evidence needed</span><strong>—</strong></div>
          </div>
          <button type="button" className="side-link" onClick={()=>setMode('review')}>Review readiness <Icon name="next"/></button>
        </section>
        <section className="surface evidence-panel"><div className="side-head"><h2>Evidence</h2></div>
          <div className="assessment-empty evidence-placeholder">
            <strong>No evidence loaded</strong>Attachments require an authorized assessment and source record.</div>
        </section>
        <section className="surface assist-panel"><div className="side-head"><div className="copilot-name">
          <Icon name="info"/><h2>Contextual help</h2></div><span className="soft-pill gray">Unavailable</span></div>
          <div className="assessment-empty evidence-placeholder">Suggestions require verified questions and responses.</div>
        </section>
      </aside>
    </div>}
    {mode==='import'&&<section id="assessment-view-import" role="tabpanel"
      aria-labelledby="assessment-tab-import" className="import-view">
      <div className="import-layout"><div className="import-main">
        <div className="section-title-row"><div><div className="panel-eyebrow">Excel intake</div>
          <h2>Import questionnaire responses</h2>
          <p>Match spreadsheet answers to authorized questions before recording any response.</p></div></div>
        <div className="drop-zone unavailable" aria-disabled="true">
          <span className="drop-icon"><Icon name="external"/></span><strong>Excel import unavailable</strong>
          <small>Select an assessment with an approved questionnaire first.</small>
        </div>
        <div className="surface mapping-card"><div className="mapping-header"><div>
          <h3>Mapping review</h3><p>Responses are not imported without confirmed source and question IDs.</p></div></div>
          <div className="assessment-empty">No mappings available</div>
        </div>
      </div><aside className="import-context">
        <div className="surface"><div className="side-head"><h2>Import steps</h2></div>
          <ol className="import-steps">
            <li><strong>Select a file</strong><small>Preserve original cell values and source references.</small></li>
            <li><strong>Review matches</strong><small>Confirm each mapped question and response.</small></li>
            <li><strong>Provide evidence</strong><small>Attach files and submit to a reviewer.</small></li>
          </ol></div>
        <div className="surface notice-card"><Icon name="info"/>
          <p>Blank cells remain unanswered. Imported answers are not compliance conclusions.</p></div>
      </aside></div>
    </section>}
    {mode==='review'&&<section id="assessment-view-review" role="tabpanel"
      aria-labelledby="assessment-tab-review" className="final-review">
      <div className="review-view-header"><div className="panel-eyebrow">Submit</div>
        <h2>Review responses</h2><p>Check answers and evidence before submitting the assessment.</p></div>
      <div className="final-review-grid"><div className="surface">
        <div className="review-checkline"><div><strong>No assessment loaded</strong>
          <span>Submission requires recorded responses and a current source revision.</span></div>
          <span className="soft-pill gray">Unavailable</span></div>
        <div className="review-actions">
          <button className="button" type="button" onClick={()=>setMode('questions')}>Back to questions</button>
          <button className="button primary" type="button" disabled>Submit for review <Icon name="next"/></button>
        </div>
      </div><aside className="surface review-context"><h3>Reviewer</h3>
        <p>No reviewer or authority route is connected.</p></aside></div>
    </section>}
  </>
}
