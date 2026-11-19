import { useV1Session } from './V1Session'
import { ConnectedProgramWorkflows } from './ConnectedProgramWorkflows'
import { CreateProgramDialog } from './CreateProgramDialog'
import { CreateRequirement } from './CreateRequirement'
import { RequirementReviewPanel } from './RequirementReviewPanel'
import { ProgramActivation } from './ProgramActivation'
import { ProgramOverview } from './OverviewPanel'
import type { OverviewTarget } from './OverviewPanel'
import { useOverviewData } from './useOverviewData'
import { RecordDialog } from './RecordDialog'
import { useEffect, useRef, useState } from 'react'
import { useWorkspaceTabs } from '../../shared/useWorkspaceTabs'
import { Icon } from '../../shared/Icons'
import { useProgramRecord } from './programRecord'
import { useProgramDirectory } from './programDirectory'
import { useApprovedRequirements } from './approvedRequirements'
import { ProgramInventoryPanel } from './ProgramInventoryPanel'
import { useProgramIssues } from './programIssues'
import { ProgramAssessmentPanel } from './ProgramAssessmentPanel'
import './program.css'

const sections = ['Overview','Issues','Assessment','Documents','Activity'] as const
type Section = typeof sections[number]
const sectionId = (section: Section) => section.toLowerCase()

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
  const readSection=()=>sections.find(s=>s.toLowerCase()===new URLSearchParams(window.location.search).get('tab'))||'Overview'
  const [section,updateSection]=useState<Section>(readSection)
  function setSection(next:Section){
    updateSection(next)
    if(next==='Overview')overviewData.retry()
    const url=new URL(window.location.href)
    url.searchParams.set('tab',next.toLowerCase())
    for(const key of ['request','issue','queue','schedules','submission','field','schedule'])url.searchParams.delete(key)
    window.history.pushState(null,'',url)
  }
  const [showRequirements,setShowRequirements]=useState(false)
  const [requirementRefresh,setRequirementRefresh]=useState(0)
  const tabs=useWorkspaceTabs(sections,section,setSection)
  const requirements=useApprovedRequirements(record?.id ?? null,record?.source_revision ?? null,section==='Overview' && showRequirements && !!record)
  const readPeriod = () => { const value = Number(new URLSearchParams(window.location.search).get('activity_days')); return [7,30,90].includes(value) ? value : 90 }
  const [period,setPeriod]=useState(readPeriod)
  const readTarget=():OverviewTarget|null=>{
    const params=new URLSearchParams(window.location.search), tab=readSection()
    if(!['Assessment','Issues','Documents'].includes(tab))return null
    return {section:tab as OverviewTarget['section'],requestId:params.get('request')||undefined,issueId:params.get('issue')||undefined,submissionId:params.get('submission')||undefined,scheduleId:params.get('schedule')||undefined,queue:params.get('queue')==='documents'?'documents':undefined,schedules:params.get('schedules')==='true'}
  }
  const [target,setTarget]=useState<OverviewTarget|null>(readTarget)
  useEffect(()=>{const sync=()=>{updateSection(readSection());setTarget(readTarget());setPeriod(readPeriod())};window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync)},[])

  const overviewData=useOverviewData(context,record?.id??null,record?.source_revision??'')
  const canStartAssessment = !!context && connected && record?.status === 'ACTIVE' &&
    overviewData.aggregate?.program.owner_principal_id === context.actor.id
  function openOverviewTarget(next:OverviewTarget){
    setSection(next.section);setTarget(next)
    const url=new URL(window.location.href)
    if(next.requestId)url.searchParams.set('request',next.requestId)
    if(next.issueId)url.searchParams.set('issue',next.issueId)
    if(next.queue)url.searchParams.set('queue',next.queue)
    if(next.schedules)url.searchParams.set('schedules','true')
    if(next.submissionId)url.searchParams.set('submission',next.submissionId)
    if(next.scheduleId)url.searchParams.set('schedule',next.scheduleId)
    window.history.replaceState(null,'',url)
    requestAnimationFrame(()=>document.getElementById('program-tab-'+next.section.toLowerCase())?.focus())
  }
  const issues=useProgramIssues(record?.id ?? null,record?.source_revision ?? null,
    !!record && (section==='Overview'||section==='Issues'))
  const requirementContent = record ? <><section className="surface program-section-message" aria-label="Approved requirement references">
            {connected&&context&&<CreateRequirement context={context} programId={record.id} onCreated={()=>{setRequirementRefresh(n=>n+1);retry();requirements.retry()}}/>}{connected&&context&&<RequirementReviewPanel context={context} programId={record.id} refreshKey={requirementRefresh} onChanged={()=>{retry();requirements.retry()}}/>}
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
              Approved requirements. Applicability, controls and evidence are assessed separately.
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
        <p>{record ? [[...new Set(overviewData.aggregate?.framework_adoptions?.map(a=>a.configuration.requirements[0]?.form_name.replace(/ starter assessment$/,'')||a.template_code)||[])].join(', '), context?.legal_entity.name, record.jurisdiction].filter(Boolean).join(' · ') : 'Select a Program to review requirements, assessments and evidence.'}</p>
        <div className="heading-meta"><span className="status program-status" role="status">{record ? record.status.charAt(0) + record.status.slice(1).toLowerCase() : programMessage}</span>
          <span>Owner <strong>{overviewData.operations?.responsible_parties?.find(p=>p.scope==='RECORD'&&p.responsibility==='ACCOUNTABLE_OWNER')?.display_name || 'Name unavailable'}</strong></span><span>Next review not configured</span></div>
      </div>
      <svg className="mountains" viewBox="0 0 700 200" aria-hidden="true" preserveAspectRatio="none"><defs><linearGradient id="mount1" x1="0" y1="1" x2="0" y2="0"><stop stopColor="#b5e3ff" stopOpacity="0"/><stop offset="1" stopColor="#a4d4ff" stopOpacity=".55"/></linearGradient><linearGradient id="mount2" x1="0" y1="1" x2="0" y2="0"><stop stopColor="#6dc2fb" stopOpacity="0"/><stop offset="1" stopColor="#77bfff" stopOpacity=".33"/></linearGradient></defs><path fill="url(#mount1)" d="M0 176Q68 128 122 153T262 103T395 114T531 73T700 145V200H0Z"/><path fill="url(#mount2)" d="M0 195Q90 177 164 139T332 161T472 98T700 127V200H0Z"/></svg>
      <div className="heading-tools">
        <div className="period-switch"><label htmlFor="program-period">Activity period</label>
          <select id="program-period" aria-label="Activity period" value={period} onChange={event=>{
            const value=Number(event.target.value),url=new URL(window.location.href)
            url.searchParams.set('activity_days',String(value));url.searchParams.delete('activity_from');url.searchParams.delete('activity_to')
            window.history.replaceState(null,'',url);setPeriod(value)
          }}>{[90,30,7].map(days=><option key={days} value={days}>Last {days} days</option>)}</select></div>
        {canStartAssessment && <button className="button primary" type="button" onClick={()=>{setSection('Assessment');setWorkflowAction('assessment')}}>
          <Icon name="plus"/>New assessment</button>}
      </div>
    </header>
    {program.status === 'unavailable' && <div role="alert" className="program-context-empty">
      Program data could not be retrieved. <button type="button" className="text-link" onClick={retry}>Retry</button>
    </div>}
    {connected&&context&&record&&record.status!=='ACTIVE'&&<ProgramActivation context={context} programId={record.id} revision={record.source_revision} onChanged={retry} onOpenRequirements={()=>{setSection('Overview');setShowRequirements(true);requestAnimationFrame(()=>document.getElementById('program-requirements')?.scrollIntoView({block:'start',behavior:'smooth'}))}}/>}
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
        <ProgramOverview context={context} record={record} data={overviewData} issues={issues} days={period} onOpen={openOverviewTarget} onRequirements={()=>setShowRequirements(true)} openFrameworks={openFrameworks} onChanged={retry}/>
        {showRequirements&&<RecordDialog title="Requirements & linked controls" onClose={()=>setShowRequirements(false)}>{requirementContent}</RecordDialog>}
      </section>
      : <section className="page-panel alternate-panel" id={'program-panel-'+sectionId(section)}
          role="tabpanel" aria-labelledby={'program-tab-'+sectionId(section)}>
          <div className="section-title-row"><div><h2>{section}</h2>
            <p>{section==='Assessment'?'Questions and responses, field-review decisions and recurrence configuration'
                :section==='Issues'?'Findings, corrective actions and independent closure verification.':section==='Documents'?'Program files, linked assessments and independent review status.':'Who changed a record, what changed and when.'}</p></div>
            {section==='Issues' && <button className="button primary" disabled={!connected || !record} title={connected?'Create linked issue':'Issue creation is not connected'} onClick={()=>setWorkflowAction('issue')}>New issue</button>}
            {section==='Assessment' && canStartAssessment && <button className="button primary" type="button" onClick={()=>setWorkflowAction('assessment')}>New assessment</button>}
            {section==='Documents' && <button className="button primary" disabled={!connected || !record} title={connected?'Submit supporting document':'Document submission service is not connected'} onClick={()=>setWorkflowAction('document')}>Add document</button>}
            {section==='Activity' && <button className="button" disabled={!connected} title={connected?'Exports all authorized events matching the Activity filters':'Activity export service is not connected'} onClick={()=>activityExportRef.current?.()}>Export filtered history</button>}
          </div>
          {section==='Issues' && !connected && <div className="program-register-tools"><label className="program-field">Search issues<input type="search" placeholder="Reference, title or owner" disabled title="Issue search is not supported by the current service"/></label><label className="program-field">Status<select disabled title="Current service returns visible open issues"><option>Visible open issues</option></select></label></div>}
          {connected && programId ? <ConnectedProgramWorkflows key={JSON.stringify([programId, context?.legal_entity.id, context?.actor.id])} days={period} onOpenActivityTarget={openOverviewTarget} target={target} onTargetHandled={()=>setTarget(null)} programId={programId} section={section} action={workflowAction} activityExportRef={activityExportRef} onActionDone={()=>setWorkflowAction(null)} onCreated={()=>{retry();overviewData.retry()}} onOpenAssessment={id=>id?openOverviewTarget({section:'Assessment',requestId:id}):setSection('Assessment')} onOpenDocuments={()=>openOverviewTarget({section:'Documents'})}/> : section==='Assessment' ? <ProgramAssessmentPanel/> : section==='Documents' ? <section className="surface program-document-register"><div className="surface-heading"><div><h2>Document register</h2><p>Submission, review and compliance conclusions are separate.</p></div></div><div className="program-register-tools program-register-inset"><label className="program-field">Search documents<input type="search" placeholder="Name or linked assessment" disabled/></label><label className="program-field">Review status<select disabled><option>All statuses</option><option>Submitted</option><option>Reviewed</option></select></label></div><p className="program-context-empty" role="status">Document uploads, downloads and reviews are not connected.</p>{record && <details className="program-contract-reference"><summary>Evidence collection contracts</summary><ProgramInventoryPanel kind="evidence-contracts" programId={record.id} revision={record.source_revision} onRefreshProgram={retry}/></details>}</section>
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
