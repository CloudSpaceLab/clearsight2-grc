import { useState } from 'react'
import { useWorkspaceTabs } from '../../shared/useWorkspaceTabs'
import { Icon } from '../../shared/Icons'
import { useProgramRecord } from './programRecord'
import { useProgramDirectory } from './programDirectory'
import { useApprovedRequirements } from './approvedRequirements'
import { ProgramInventoryPanel } from './ProgramInventoryPanel'
import { useProgramOverview } from './programOverview'
import './program.css'

const sections = ['Overview','Requirements','Assessments','Evidence','Issues','Activity'] as const
type Section = typeof sections[number]
const metrics = [
  { label:'Assessment coverage', icon:'chart', suffix:'requirements' },
  { label:'Supported', icon:'shield', suffix:'requirements' },
  { label:'Open gaps', icon:'info', suffix:'requirements' },
  { label:'Evidence to review', icon:'form', suffix:'items' },
] as const

export function ProgramWorkspace({openFrameworks,programId,onSelectProgram}:{openFrameworks:()=>void;programId:string|null;onSelectProgram:(id:string)=>void}){
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
  const tabs=useWorkspaceTabs(sections,section,setSection)
  const requirements=useApprovedRequirements(record?.id ?? null,record?.source_revision ?? null,section==='Requirements' && !!record)
  const overview=useProgramOverview(record?.id ?? null,record?.source_revision ?? null,section==='Overview' && !!record)
  const coverage=overview.status==='ready' ? overview.overview.assessment_coverage : null
  return <>
    <nav className="crumbs" aria-label="Breadcrumb"><span>Programs</span>
      <Icon name="next"/><span>Workspace</span></nav>
    <header className="program-heading">
      <div className="heading-copy">
        <div className="eyebrow">PROGRAMS <span className="eyebrow-dot">·</span> WORKSPACE</div>
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
        <button className="button primary" disabled type="button" title="Requires an authorized Program">
          <Icon name="plus"/>New assessment</button>
      </div>
    </header>
    {program.status === 'unavailable' && <div role="alert" className="program-context-empty">
      Program data could not be retrieved. <button type="button" className="text-link" onClick={retry}>Retry</button>
    </div>}
    {record && <p className="program-context-empty">Updated {new Date(record.updated_at).toLocaleString()} · Compliance and assessment data require separate authorized projections.</p>}
    {!programId && <section className="surface program-directory" aria-label="Available Programs">
      <div className="section-title-row">
        <div><h2>Programs</h2><p>Only Programs available to your organization and access scope are listed.</p></div>
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
    </section>}
    <div className="workspace-tabs" role="tablist" aria-label="Program sections" onKeyDown={tabs.onKeyDown}>
      {sections.map((name,i)=><button key={name} type="button" role="tab"
        id={'program-tab-'+name.toLowerCase()}
        ref={tabs.refAt(i)}
        aria-selected={section===name}
        aria-controls={'program-panel-'+name.toLowerCase()}
        tabIndex={section===name?0:-1}
        onClick={()=>setSection(name)}
        className={'workspace-tab'+(section===name?' selected':'')}>{name}</button>)}
    </div>
    {section==='Overview'
      ? <section role="tabpanel" aria-labelledby="program-tab-overview" id="program-panel-overview" className="page-panel">
        <div className="metric-grid" aria-label="Program measures unavailable">
          {metrics.map((item,index)=><article className="metric-card" key={item.label}>
            <div className="metric-top"><span>{item.label}</span>
              <Icon name={item.icon}/></div>
            {index===0 && coverage ?
              <><div className="metric-value">{coverage.assessed} <span>/ {coverage.eligible} requirements</span></div>
                <div className="metric-info">{coverage.quality==='partial'?'Coverage incomplete':'Assessed requirements'} · {coverage.unknown} unknown</div></>
              : <><div className="metric-value empty-value">— <span>{item.suffix}</span></div>
                <div className="metric-info">{index===0 && overview.status==='loading' && record ? 'Loading' : 'Not available'}</div></>}
          </article>)}
        </div>
        <div className="dashboard-grid">
          <div className="primary-stack">
            <section className="surface coverage-surface" aria-labelledby="program-coverage">
              <div className="surface-heading"><div><h2 id="program-coverage">Requirement coverage</h2>
                <p>Applicable requirements and assessment status</p></div>
                <button type="button" className="text-link" onClick={()=>setSection('Requirements')}>
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
              <div className="area-rows"><div className="program-context-empty">No requirements available</div></div>
              <footer className="surface-footer"><span>Assessment status requires reviewed responses and evidence.</span>
                <button type="button" className="text-link" onClick={()=>setSection('Requirements')}>
                  Open requirements <Icon name="next"/></button></footer>
            </section>
            <section className="surface assessments-surface">
              <div className="surface-heading"><div><h2>Recent assessments</h2>
                <p>Responses and reviews</p></div><button className="text-link" type="button"
                  onClick={()=>setSection('Assessments')}>View assessments <Icon name="next"/></button></div>
              <div className="assessment-table-wrap"><table className="assessment-table">
                <thead><tr><th>Assessment</th><th>Owner</th><th>Updated</th><th>Status</th></tr></thead>
                <tbody><tr><td colSpan={4}>No assessments available</td></tr></tbody></table></div>
            </section>
          </div>
          <aside className="context-stack" aria-label="Program details and actions">
            <section className="surface actions-surface">
              <div className="surface-heading compact"><div><h2>Needs attention</h2>
                <p>Actionable items in this Program</p></div></div>
              <div className="program-context-empty">No authorized action items available.</div>
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
      </section>
      : <section className="page-panel alternate-panel" id={'program-panel-'+section.toLowerCase()}
          role="tabpanel" aria-labelledby={'program-tab-'+section.toLowerCase()}>
          <div className="section-title-row"><div><h2>{section}</h2>
            <p>{section==='Requirements'?'Approved requirements and linked controls'
                :section==='Assessments'?'Submitted and outstanding responses'
                :section==='Evidence'?'Evidence collection contracts'
                :section==='Issues'?'Open gaps and corrective actions':'Program changes and review history'}</p></div>
          </div>
          {section==='Requirements' && record ? <><section className="surface program-section-message" aria-label="Approved requirement references">
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
          </>
          : section==='Evidence' && record
            ? <ProgramInventoryPanel kind="evidence-contracts" programId={record.id}
                revision={record.source_revision} onRefreshProgram={retry}/>
          :<div className="surface program-section-message" role="status">
            <h3>{section==='Requirements'?'Select a Program':`No ${section.toLowerCase()} available`}</h3>
            <p>{section==='Requirements'?'Open an authorized Program to view current approved requirements.'
              :'Connect an authorized organization and select a Program.'}</p>
          </div>}
        </section>}
  </>
}
