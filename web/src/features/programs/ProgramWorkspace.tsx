import { useState } from 'react'
import { useWorkspaceTabs } from '../../shared/useWorkspaceTabs'
import { Icon } from '../../shared/Icons'
import './program.css'

const sections = ['Overview','Requirements','Assessments','Evidence','Issues','Activity'] as const
type Section = typeof sections[number]
const metrics = [
  { label:'Assessment coverage', icon:'chart', suffix:'requirements' },
  { label:'Supported', icon:'shield', suffix:'requirements' },
  { label:'Open gaps', icon:'info', suffix:'requirements' },
  { label:'Evidence to review', icon:'form', suffix:'items' },
] as const

export function ProgramWorkspace({openFrameworks}:{openFrameworks:()=>void}){
  const [section,setSection]=useState<Section>('Overview')
  const tabs=useWorkspaceTabs(sections,section,setSection)
  return <>
    <nav className="crumbs" aria-label="Breadcrumb"><span>Programs</span>
      <Icon name="next"/><span>Workspace</span></nav>
    <header className="program-heading">
      <div className="heading-copy">
        <div className="eyebrow">PROGRAMS <span className="eyebrow-dot">·</span> WORKSPACE</div>
        <h1>Program workspace</h1>
        <p>Select a Program to review requirements, assessments and evidence.</p>
        <div className="heading-meta"><span className="status program-status">No Program selected</span>
          <span>Organization <strong>Not connected</strong></span></div>
      </div>
      <svg className="mountains" viewBox="0 0 700 200" aria-hidden="true" preserveAspectRatio="none"><defs><linearGradient id="mount1" x1="0" y1="1" x2="0" y2="0"><stop stopColor="#b5e3ff" stopOpacity="0"/><stop offset="1" stopColor="#a4d4ff" stopOpacity=".55"/></linearGradient><linearGradient id="mount2" x1="0" y1="1" x2="0" y2="0"><stop stopColor="#6dc2fb" stopOpacity="0"/><stop offset="1" stopColor="#77bfff" stopOpacity=".33"/></linearGradient></defs><path fill="url(#mount1)" d="M0 176Q68 128 122 153T262 103T395 114T531 73T700 145V200H0Z"/><path fill="url(#mount2)" d="M0 195Q90 177 164 139T332 161T472 98T700 127V200H0Z"/></svg>
      <div className="heading-tools">
        <span className="prototype-tag"><Icon name="info"/>No authorized Program data</span>
        <div className="period-switch"><label htmlFor="program-period">Activity period</label>
          <select id="program-period" aria-label="Activity period" disabled><option>Last 90 days</option></select></div>
        <button className="button primary" disabled type="button" title="Requires an authorized Program">
          <Icon name="plus"/>New assessment</button>
      </div>
    </header>
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
          {metrics.map(item=><article className="metric-card" key={item.label}>
            <div className="metric-top"><span>{item.label}</span>
              <Icon name={item.icon}/></div>
            <div className="metric-value empty-value">— <span>{item.suffix}</span></div>
            <div className="metric-info">Not connected</div>
          </article>)}
        </div>
        <div className="dashboard-grid">
          <div className="primary-stack">
            <section className="surface coverage-surface" aria-labelledby="program-coverage">
              <div className="surface-heading"><div><h2 id="program-coverage">Requirement coverage</h2>
                <p>Applicable requirements and assessment status</p></div>
                <button type="button" className="text-link" onClick={()=>setSection('Requirements')}>
                  All requirements <Icon name="next"/></button></div>
              <div className="program-empty"><strong>Coverage unavailable</strong>
                No applicable requirements have been loaded for an authorized Program.</div>
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
              <div className="program-context-empty">Program owner, framework editions and linked forms are not connected.
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
            <p>{section==='Requirements'?'Applicable obligations and assessment results'
                :section==='Assessments'?'Submitted and outstanding responses'
                :section==='Evidence'?'Submitted and expiring files'
                :section==='Issues'?'Open gaps and corrective actions':'Program changes and review history'}</p></div>
          </div>
          <div className="surface program-section-message" role="status">
            <h3>No {section.toLowerCase()} available</h3>
            <p>Connect an authorized organization and select a Program.</p>
          </div>
        </section>}
  </>
}
