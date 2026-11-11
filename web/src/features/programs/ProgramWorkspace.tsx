import { useV1Session } from './V1Session'
import { ConnectedProgramWorkflows } from './ConnectedProgramWorkflows'
import { CreateProgramDialog } from './CreateProgramDialog'
import { useEffect, useRef, useState } from 'react'
import { isSupportingDocumentRequest, programRequests, scoped, v1 } from './v1Client'
import type { RequestRecord, V1Context } from './v1Client'
import { useWorkspaceTabs } from '../../shared/useWorkspaceTabs'
import { Icon } from '../../shared/Icons'
import { useProgramRecord } from './programRecord'
import { useProgramDirectory } from './programDirectory'
import { useApprovedRequirements } from './approvedRequirements'
import { ProgramInventoryPanel } from './ProgramInventoryPanel'
import { useProgramOverview } from './programOverview'
import { useProgramIssues } from './programIssues'
import { ProgramAssessmentPanel } from './ProgramAssessmentPanel'
import './program.css'

const sections = ['Overview','Issues','Assessment','Documents','Activity'] as const
type Section = typeof sections[number]
function RecentAssessments({context,programId}:{context:V1Context;programId:string}) {
  const [state,setState]=useState<{status:'loading'|'ready'|'unavailable';items:RequestRecord[]}>({status:'loading',items:[]})
  useEffect(()=>{let active=true;setState({status:'loading',items:[]});void v1<{items:RequestRecord[]}>(scoped('/api/v1/evidence/requests?limit=100',context)).then(result=>{if(active)setState({status:'ready',items:programRequests(result.items,programId).filter(r=>!isSupportingDocumentRequest(r)).sort((a,b)=>b.updated_at.localeCompare(a.updated_at)).slice(0,5)})}).catch(()=>{if(active)setState({status:'unavailable',items:[]})});return()=>{active=false}},[context,programId])
  return <tbody>{state.status==='loading'?<tr><td colSpan={4}>Loading assessments…</td></tr>:state.status==='unavailable'?<tr><td colSpan={4}>Assessments unavailable.</td></tr>:state.items.length?state.items.map(item=><tr key={item.id}><td>{item.title}</td><td>{item.recipient?.display_name?.trim()||(item.recipient?.principal_id===context.actor.id?context.actor.name:'Not available')}</td><td>{new Date(item.updated_at).toLocaleDateString()}</td><td>{item.status.replaceAll('_',' ')}</td></tr>):<tr><td colSpan={4}>No assessments available.</td></tr>}</tbody>
}
function useVisibleAssessmentCount(context:V1Context|null,programId:string|null,enabled:boolean) {
  const [state,setState]=useState<{key:string;count:number|null;limited:boolean}>({key:'',count:null,limited:false})
  const key=context&&programId?`${context.actor.id}:${context.tenant.id}:${context.legal_entity.id}:${programId}`:''
  useEffect(()=>{if(!enabled||!context||!programId)return;let active=true
    void v1<{items:RequestRecord[]}>(scoped('/api/v1/evidence/requests?limit=100',context)).then(result=>{
      if(!Array.isArray(result.items))throw Error('Invalid request list')
      if(active)setState({key,count:programRequests(result.items,programId).filter(r=>!isSupportingDocumentRequest(r)).length,limited:result.items.length>=100})
    }).catch(()=>{if(active)setState({key,count:null,limited:false})})
    return()=>{active=false}
  },[context,programId,enabled,key])
  return state.key===key?state:{key,count:null,limited:false}
}
const sectionId = (section: Section) => section.toLowerCase()
const metrics = [
  { label:'Assessment cycles', icon:'form', suffix:'records' },
  { label:'Responses to review', icon:'form', suffix:'records' },
  { label:'Open issues', icon:'info', suffix:'records' },
  { label:'Documents to review', icon:'form', suffix:'records' },
] as const

export function ProgramWorkspace({openFrameworks,programId,onSelectProgram,onBackPrograms}:{openFrameworks:()=>void;programId:string|null;onSelectProgram:(id:string)=>void;onBackPrograms:()=>void}){
  const {context}=useV1Session()
  const connected=import.meta.env.VITE_PROGRAM_BACKEND==='v1' && !!context
  const activityExportRef=useRef<(()=>void)|null>(null)
  const [creatingProgram,setCreatingProgram]=useState(false)
  const [workflowAction,setWorkflowAction]=useState<'assessment'|'issue'|'document'|null>(null)
  const [searchInput,setSearchInput]=useState('')
  const [search,setSearch]=useState('')
  const [lifecycle,setLifecycle]=useState('')
  const directory = useProgramDirectory(programId === null,search,lifecycle)
  const [program, retry] = useProgramRecord(programId)
  const record = program.status === 'ready' ? program.record : null
  const programMessage = program.status === 'loading' ? 'Loading Program…'
    : program.status === 'unauthenticated' ? 'Sign in required'
    : program.status === 'forbidden' ? 'Access denied'
    : program.status === 'not_found' ? 'Program unavailable'
    : program.status === 'unavailable' ? 'Unable to load Program'
    : 'No Program selected'
  const [section,setSection]=useState<Section>('Overview')
  const [showRequirements,setShowRequirements]=useState(false)
  const tabs=useWorkspaceTabs(sections,section,setSection)
  const requirements=useApprovedRequirements(record?.id ?? null,record?.source_revision ?? null,section==='Overview' && showRequirements && !!record)
  const overview=useProgramOverview(record?.id ?? null,record?.source_revision ?? null,section==='Overview' && !!record)
  const coverage=overview.status==='ready' ? overview.overview.assessment_coverage : null
  const issues=useProgramIssues(record?.id ?? null,record?.source_revision ?? null,
    !!record && (section==='Overview'||section==='Issues'))
  const assessmentCount=useVisibleAssessmentCount(context,record?.id??null,connected&&section==='Overview')
  const requirementContent = record ? <><section className="surface program-section-message" aria-label="Approved requirement references">
            {requirements.state.status==='loading' ? <p role="status">Loading approved requirements…</p>
              :requirements.state.status==='ready' ?
                requirements.state.page.items.length===0 ? <p role="status">No current approved requirements.</p>
                : <div className="assessment-table-wrap"><table className="assessment-table">
                  <caption className="sr-only">Approved current requirements for {record.name}</caption>
                  <thead><tr><th>Code</th><th>Requirement</th><th>Version</th><th>Effective from</th></tr></thead>
                  <tbody>{requirements.state.page.items.map(item=><tr key={item.id}>
                    <td>{item.code}</td><td>{item.title}</td><td>{item.version}</td>
                    <td>{new Date(item.effective_from).toLocaleDateString()}</td>
                  </tr>)}</tbody>
                </table></div>
              :<div role={requirements.state.status==='unavailable'?'alert':'status'}>
                <p>{requirements.state.status==='unauthenticated'?'Sign in required.'
                  :requirements.state.status==='forbidden'?'Access denied.'
                  :requirements.state.status==='not_found'?'Program unavailable.'
                  :requirements.state.status==='changed'?'Program changed. Reload to review current requirements.'
                  :'Requirements unavailable.'}</p>
                {(requirements.state.status==='unavailable'||requirements.state.status==='changed') &&
                  <button className="text-link" type="button" onClick={()=>{
                    if (requirements.state.status==='changed') retry()
                    requirements.retry()
                  }}>{requirements.state.status==='changed'?'Reload Program':'Retry'}</button>}
              </div>}
            {requirements.state.status==='ready' && (requirements.hasPrevious||!!requirements.state.page.next_cursor) &&
              <nav aria-label="Requirement pages" className="program-directory-pagination">
                <button className="button" type="button" onClick={requirements.previous} disabled={!requirements.hasPrevious}>Previous</button>
                <button className="button" type="button" onClick={requirements.next} disabled={!requirements.state.page.next_cursor}>Next</button>
              </nav>}
            {requirements.state.status==='ready' && <p className="program-context-empty">
              Approved source references only. Applicability, controls and evidence are assessed separately.
            </p>}
          </section>
          <ProgramInventoryPanel kind="controls" programId={record.id}
            revision={record.source_revision} onRefreshProgram={retry}/>
          </> : <p className="program-context-empty">Select an authorized Program to view approved requirements.</p>
  if (!programId) return <>
    <nav className="crumbs" aria-label="Breadcrumb"><span>Programs</span></nav>
    <header className="program-directory-heading"><div className="eyebrow">PROGRAMS</div><h1>Programs</h1><p>Select a Program to review its workspace.</p></header>
    <section className="surface program-directory" aria-label="Available Programs">
      <div className="section-title-row">
        <div><h2>Available Programs</h2><p>Only Programs available to your organization and access scope are listed.</p></div>
        {connected && <button type="button" className="button primary" onClick={()=>setCreatingProgram(true)}>New Program</button>}
        {directory.page.status === 'unavailable' &&
          <button type="button" className="text-link" onClick={directory.retry}>Retry</button>}
      </div>
      <form className="program-directory-filters" role="search" onSubmit={event=>{
        event.preventDefault()
        setSearch(searchInput.trim())
      }}>
        <label htmlFor="program-search">Search Programs</label>
        <input id="program-search" type="search" maxLength={80}
          value={searchInput} onChange={event=>setSearchInput(event.target.value)}
          placeholder="Code or name"/>
        <button className="button" type="submit">Find</button>
        <label htmlFor="program-status">Status</label>
        <select id="program-status" value={lifecycle}
          onChange={event=>setLifecycle(event.target.value)}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="PAUSED">Paused</option>
          <option value="RETIRED">Retired</option>
        </select>
        <button className="text-link" type="button" onClick={()=>{setSearchInput('');setSearch('');setLifecycle('')}}>Clear filters</button>
      </form>
      {directory.page.status === 'loading' ? <p role="status" className="program-directory-message">Loading Programs…</p>
        : directory.page.status === 'unauthenticated' ? <p role="status" className="program-directory-message">Sign in to view Programs.</p>
        : directory.page.status === 'forbidden' ? <p role="status" className="program-directory-message">Access denied.</p>
        : directory.page.status === 'unavailable' ? <p role="alert" className="program-directory-message">Program list unavailable.</p>
        : directory.page.items.length === 0 ? <p role="status" className="program-directory-message">No Programs in your permitted scope.</p>
        : <div role="list" className="program-directory-list">
          {directory.page.items.map(item => <div role="listitem" key={item.id}>
            <button className="program-directory-entry" type="button" onClick={() => onSelectProgram(item.id)}>
              <span><strong>{item.name}</strong><small>{item.code} · {item.status.toLowerCase()} · Updated {new Date(item.updated_at).toLocaleDateString()}</small></span>
              <span className="program-directory-open">Open <Icon name="next"/></span>
            </button>
          </div>)}
        </div>}
      {directory.page.status === 'ready' && (directory.hasPrevious || directory.page.nextCursor) && <nav className="program-directory-pagination" aria-label="Program pages">
        <button type="button" className="button" onClick={directory.previous} disabled={!directory.hasPrevious}>Previous</button>
        <button type="button" className="button" onClick={directory.next} disabled={!directory.page.nextCursor}>Next</button>
      </nav>}
    </section>
    {creatingProgram&&context&&<CreateProgramDialog context={context} onClose={()=>setCreatingProgram(false)} onCreated={id=>{setCreatingProgram(false);directory.retry();onSelectProgram(id)}}/>}
  </>
  return <>
    <nav className="crumbs" aria-label="Breadcrumb"><button type="button" className="text-link" onClick={onBackPrograms}>Programs</button>
      <Icon name="next"/><span>{record?.name || 'Workspace'}</span></nav>
    <header className="program-heading">
      <div className="heading-copy">
        <div className="eyebrow">{record?.code || 'PROGRAMS'} <span className="eyebrow-dot">·</span> {record?.owning_function || 'WORKSPACE'}</div>
        <h1>{record?.name ?? 'Program workspace'}</h1>
        <p>{record ? [record.code, record.program_type, record.owning_function].join(' · ') : 'Select a Program to review requirements, assessments and evidence.'}</p>
        <div className="heading-meta"><span className="status program-status" role="status">{record ? record.status.charAt(0) + record.status.slice(1).toLowerCase() : programMessage}</span>
          <span>{record ? "Revision" : "Organization"} <strong>{record?.source_revision ?? "Not connected"}</strong></span></div>
      </div>
      <svg className="mountains" viewBox="0 0 700 200" aria-hidden="true" preserveAspectRatio="none"><defs><linearGradient id="mount1" x1="0" y1="1" x2="0" y2="0"><stop stopColor="#b5e3ff" stopOpacity="0"/><stop offset="1" stopColor="#a4d4ff" stopOpacity=".55"/></linearGradient><linearGradient id="mount2" x1="0" y1="1" x2="0" y2="0"><stop stopColor="#6dc2fb" stopOpacity="0"/><stop offset="1" stopColor="#77bfff" stopOpacity=".33"/></linearGradient></defs><path fill="url(#mount1)" d="M0 176Q68 128 122 153T262 103T395 114T531 73T700 145V200H0Z"/><path fill="url(#mount2)" d="M0 195Q90 177 164 139T332 161T472 98T700 127V200H0Z"/></svg>
      <div className="heading-tools">
        <span className="prototype-tag"><Icon name="info"/>{record ? coverage ? "Assessment coverage available" : "Operational metrics unavailable" : programMessage}</span>
        <div className="period-switch"><label htmlFor="program-period">Activity period</label>
          <select id="program-period" aria-label="Activity period" disabled><option>Last 90 days</option></select></div>
        <button className="button primary" disabled={!connected || !record} type="button" title={connected?'Create from an approved form':'Assessment creation is not connected'} onClick={()=>{setSection('Assessment');setWorkflowAction('assessment')}}>
          <Icon name="plus"/>New assessment</button>
      </div>
    </header>
    {program.status === 'unavailable' && <div role="alert" className="program-context-empty">
      Program data could not be retrieved. <button type="button" className="text-link" onClick={retry}>Retry</button>
    </div>}
    {record && <p className="program-context-empty">Updated {new Date(record.updated_at).toLocaleString()} · Compliance and assessment data require separate authorized projections.</p>}
    <div className="workspace-tabs" role="tablist" aria-label="Program sections" onKeyDown={tabs.onKeyDown}>
      {sections.map((name,i)=><button key={name} type="button" role="tab"
        id={'program-tab-'+sectionId(name)}
        ref={tabs.refAt(i)}
        aria-selected={section===name}
        aria-controls={'program-panel-'+sectionId(name)}
        tabIndex={section===name?0:-1}
        onClick={()=>setSection(name)}
        className={'workspace-tab'+(section===name?' selected':'')}>{name}</button>)}
    </div>
    {section==='Overview'
      ? <section role="tabpanel" aria-labelledby="program-tab-overview" id="program-panel-overview" className="page-panel">
        <div className="metric-grid" aria-label="Program measures">
          {metrics.map((item,index)=><article className="metric-card" key={item.label}>
            <div className="metric-top"><span>{item.label}</span>
              <Icon name={item.icon}/></div>
            <div className="metric-value empty-value">{index===0&&assessmentCount.count!==null ? `${assessmentCount.limited?'At least ':''}${assessmentCount.count}` : index===2&&issues.result.status==='ready' ? `${issues.result.page.next_cursor?'At least ':''}${issues.result.page.items.length}` : '—'} <span>{item.suffix}</span></div>
            <div className="metric-info">{index===0&&assessmentCount.count!==null?'Visible requests returned by v1':index===2&&issues.result.status==='ready'?'Visible open issues linked to this Program':'Summary unavailable'}</div>
            <button className="text-link" type="button" onClick={()=>setSection(index===2?'Issues':index===3?'Documents':'Assessment')}>View <Icon name="next"/></button>
          </article>)}
        </div>
        <div className="dashboard-grid">
          <div className="primary-stack">
            <section className="surface coverage-surface" aria-labelledby="program-coverage">
              <div className="surface-heading"><div><h2 id="program-coverage">Requirement coverage</h2>
                <p>Applicable requirements and assessment status</p></div>
                <button type="button" className="text-link" onClick={()=>setShowRequirements(true)}>
                  All requirements <Icon name="next"/></button></div>
              {coverage ? <div className="program-empty">
                  <strong>{coverage.assessed} of {coverage.eligible} assessed requirements</strong>
                  <progress value={coverage.assessed} max={Math.max(1,coverage.eligible)}
                    aria-label="Assessed requirement coverage"/>
                  <span>{coverage.excluded} excluded · {coverage.unknown} unknown · As of {new Date(coverage.generated_at).toLocaleDateString()}</span>
                  <p>Support and gap breakdowns require separate verified assessment records.</p>
                </div> : <div className="program-empty"><strong>Coverage unavailable</strong>
                  A current approved requirement assessment is required.</div>}
              <div className="area-head"><strong>By control area</strong>
                <div className="mini-tabs" role="group" aria-label="Control area filter">
                  <button type="button" className="selected" disabled>All</button>
                  <button type="button" disabled>Gaps</button>
                  <button type="button" disabled>Unassessed</button>
                </div></div>
              <div className="area-table-head"><span>Control area</span><span>Distribution</span><span>Assessed</span></div>
              <div className="area-rows"><div className="program-context-empty">Control-area assessment is unavailable. Open the requirements below to view approved references.</div></div>
              <footer className="surface-footer"><span>Assessment status requires reviewed responses and evidence.</span>
                <button type="button" className="text-link" onClick={()=>setShowRequirements(true)}>
                  Open requirements <Icon name="next"/></button></footer>
            </section>
            <section className="surface assessments-surface">
              <div className="surface-heading"><div><h2>Recent assessments</h2>
                <p>Responses and reviews</p></div><button className="text-link" type="button"
                  onClick={()=>setSection('Assessment')}>View assessments <Icon name="next"/></button></div>
              <div className="assessment-table-wrap"><table className="assessment-table">
                <thead><tr><th>Assessment</th><th>Owner</th><th>Updated</th><th>Status</th></tr></thead>
                {connected&&context&&programId?<RecentAssessments context={context} programId={programId}/>:<tbody><tr><td colSpan={4}>Sign in and select a Program to view assessments.</td></tr></tbody>}</table></div>
            </section>
          </div>
          <aside className="context-stack" aria-label="Program details and actions">
            <section className="surface actions-surface">
              <div className="surface-heading compact"><div><h2>Needs attention</h2>
                <p>Actionable items in this Program</p></div></div>
              {issues.result.status==='ready' ?
                issues.result.page.items.length===0 ?
                  <div className="program-context-empty" role="status">No visible open issues.</div>
                : <div className="program-attention-list">
                  {issues.result.page.items.slice(0,3).map(issue=>
                    <button className="action-entry" type="button" key={issue.id} onClick={()=>setSection('Issues')}>
                      <span className="action-symbol danger"><Icon name="info"/></span><span><strong>{issue.reference} · {issue.title}</strong><small>{issue.status.replaceAll('_',' ').toLowerCase()}</small></span><Icon name="next"/>
                    </button>)}
                  <button className="text-link" type="button" onClick={()=>setSection('Issues')}>
                    View issues <Icon name="next"/>
                  </button>
                </div>
              : <div className="program-context-empty" role={issues.result.status==='unavailable'?'alert':'status'}>
                {issues.result.status==='loading'?'Loading issues…':
                issues.result.status==='forbidden'?'Access denied.':
                issues.result.status==='unauthenticated'?'Sign in required.':
                'Issues unavailable.'}
              </div>}
            </section>
            <section className="surface links-surface">
              <div className="surface-heading compact"><h2>Program setup</h2></div>
              <div className="program-context-empty">
                {record ? <div>
                  <div>Function <strong>{record.owning_function}</strong></div>
                  <div>Jurisdiction <strong>{record.jurisdiction || 'Not specified'}</strong></div>
                  <div>Frameworks and forms <strong>Not connected</strong></div>
                </div> : 'Select a Program.'}
                <div><button className="text-link" type="button" onClick={openFrameworks}>
                  Browse framework references <Icon name="next"/></button></div></div>
            </section>
            <section className="surface assist-surface">
              <div className="assistant-header"><div className="assistant-name"><Icon name="info"/>
                <h2>ClearSight Copilot</h2></div><span className="tag neutral">Unavailable</span></div>
              <div className="program-context-empty">Suggestions require authorized Program records and verified source evidence.</div>
            </section>
          </aside>
        </div>
        <details className="surface program-requirements-reference" id="program-requirements" open={showRequirements}
          onToggle={event=>setShowRequirements(event.currentTarget.open)}>
          <summary>Requirements &amp; linked controls</summary>
          {showRequirements && requirementContent}
        </details>
      </section>
      : <section className="page-panel alternate-panel" id={'program-panel-'+sectionId(section)}
          role="tabpanel" aria-labelledby={'program-tab-'+sectionId(section)}>
          <div className="section-title-row"><div><h2>{section}</h2>
            <p>{section==='Assessment'?'Questions and responses, field-review decisions and recurrence configuration'
                :section==='Issues'?'Findings, corrective actions and independent closure verification.':section==='Documents'?'Program files, linked assessments and independent review status.':'Who changed a record, what changed and when.'}</p></div>
            {section==='Issues' && <button className="button primary" disabled={!connected || !record} title={connected?'Create linked issue':'Issue creation is not connected'} onClick={()=>setWorkflowAction('issue')}>New issue</button>}
            {section==='Assessment' && <button className="button primary" disabled={!connected || !record} title={connected?'Create an assessment from an approved form':'Assessment creation is not connected'} onClick={()=>setWorkflowAction('assessment')}>New assessment</button>}
            {section==='Documents' && <button className="button primary" disabled={!connected || !record} title={connected?'Submit supporting document':'Document submission service is not connected'} onClick={()=>setWorkflowAction('document')}>Add document</button>}
            {section==='Activity' && <button className="button" disabled={!connected} title={connected?'Exports the filtered v1 request snapshots shown below':'Activity export service is not connected'} onClick={()=>activityExportRef.current?.()}>Export filtered history</button>}
          </div>
          {section==='Issues' && !connected && <div className="program-register-tools"><label className="program-field">Search issues<input type="search" placeholder="Reference, title or owner" disabled title="Issue search is not supported by the current service"/></label><label className="program-field">Status<select disabled title="Current service returns visible open issues"><option>Visible open issues</option></select></label></div>}
          {connected && programId ? <ConnectedProgramWorkflows programId={programId} section={section} action={workflowAction} activityExportRef={activityExportRef} onActionDone={()=>setWorkflowAction(null)} onCreated={retry}/> : section==='Assessment' ? <ProgramAssessmentPanel/> : section==='Documents' ? <section className="surface program-document-register"><div className="surface-heading"><div><h2>Document register</h2><p>Submission, review and compliance conclusions are separate.</p></div></div><div className="program-register-tools program-register-inset"><label className="program-field">Search documents<input type="search" placeholder="Name or linked assessment" disabled/></label><label className="program-field">Review status<select disabled><option>All statuses</option><option>Submitted</option><option>Reviewed</option></select></label></div><p className="program-context-empty" role="status">Document uploads, downloads and reviews are not connected.</p>{record && <details className="program-contract-reference"><summary>Evidence collection contracts</summary><ProgramInventoryPanel kind="evidence-contracts" programId={record.id} revision={record.source_revision} onRefreshProgram={retry}/></details>}</section>
          : section==='Activity' ? <section className="surface program-activity-register"><div className="surface-heading"><div><h2>Program event history</h2><p>Newest first · UTC timestamps · actor shown when available</p></div></div><div className="program-register-tools program-register-inset"><label className="program-field">Search history<input type="search" placeholder="Actor, record reference or event" disabled/></label><label className="program-field">Event type<select disabled><option>All events</option></select></label></div><p className="program-context-empty" role="status">Program change history is not connected.</p></section>
          :section==='Issues' && record ?
            <section className="surface program-section-message" aria-label="Visible Program issues">
              {issues.result.status==='ready' ?
                issues.result.page.items.length===0 ?
                  <p role="status">No visible open issues.</p>
                : <div className="program-issue-records">
                    {issues.result.page.items.map(issue=><article className="program-record-row" key={issue.id}>
                      <div><strong>{issue.reference} · {issue.title}</strong><small>{issue.type.replaceAll('_',' ')} · Priority {issue.priority} · Updated {new Date(issue.updated_at).toLocaleDateString()}</small></div>
                      <span className="pill">{issue.status.replaceAll('_',' ')}</span>
                    </article>)}
                  </div>
              :<div className="program-context-empty" role={issues.result.status==='unavailable'?'alert':'status'}>
                {issues.result.status==='loading'?'Loading issues…':
                 issues.result.status==='unauthenticated'?'Sign in required.':
                 issues.result.status==='forbidden'?'Access denied.':
                 issues.result.status==='changed'?'Program changed. Reload the Program.':
                 'Issues unavailable.'}
                {(issues.result.status==='changed'||issues.result.status==='unavailable')&&
                  <button className="text-link" type="button" onClick={()=>{
                    if(issues.result.status==='changed')retry()
                    issues.retry()
                  }}>Retry</button>}
              </div>}
              {issues.result.status==='ready' && (issues.hasPrevious||!!issues.result.page.next_cursor)&&
                <nav className="program-directory-pagination" aria-label="Issue pages">
                  <button className="button" type="button" onClick={issues.previous} disabled={!issues.hasPrevious}>Previous</button>
                  <button className="button" type="button" onClick={issues.next}
                    disabled={!issues.result.page.next_cursor}>Next</button>
                </nav>}
            </section>
          :<div className="surface program-section-message" role="status">
            <h3>Select a Program</h3>
            <p>Connect an authorized organization and select a Program.</p>
          </div>}
        </section>}
  </>
}
