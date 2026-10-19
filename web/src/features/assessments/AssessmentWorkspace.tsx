import { useState } from 'react'
import { Icon } from '../../shared/Icons'
import { useWorkspaceTabs } from '../../shared/useWorkspaceTabs'
import './assessment.css'

const modes=['questions','import','review'] as const
type Mode = typeof modes[number]

export function AssessmentWorkspace({openPrograms}:{openPrograms:()=>void}) {
  const [mode,setMode]=useState<Mode>('questions')
  const tabs=useWorkspaceTabs(modes,mode,setMode)
  return <>
    <nav className="crumbs" aria-label="Breadcrumb">
      <button type="button" className="assessment-breadcrumb" onClick={openPrograms}>Programs</button>
      <Icon name="next"/><span>Assessments</span><Icon name="next"/><span>Workspace</span>
    </nav>
    <header className="assessment-heading">
      <div className="heading-copy">
        <div className="eyebrow">ASSESSMENTS <span className="eyebrow-dot">·</span> WORKSPACE</div>
        <h1>Assessment workspace</h1>
        <p>Select an authorized assessment to review questions, responses and evidence.</p>
        <div className="heading-meta">
          <span className="status draft"><span className="status-dot"/>Not connected</span>
          <span>Owner <strong>Not assigned</strong></span>
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
        <span className="prototype-tag"><Icon name="info"/>No authorized assessment</span>
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
        <div className="sections-list"><div className="assessment-empty">
          <strong>No sections loaded</strong>Select an assessment to view its questionnaire.</div></div>
        <div className="section-separator"/>
        <div className="section-brief"><Icon name="info"/><p>Previously recorded answers require authorized source revision and confirmation.</p></div>
        <button type="button" className="secondary-link" onClick={()=>setMode('import')}>
          <Icon name="external"/>Excel import <Icon name="next" className="end"/></button>
      </aside>
      <div className="questions-column">
        <div className="section-title-row"><div>
          <div className="panel-eyebrow">Questions</div><h2>Questions unavailable</h2>
          <p>Questionnaire content will appear after assessment selection.</p></div>
          <span className="section-progress">—</span></div>
        <div className="questions-stack"><div className="assessment-empty">
          <strong>No authorized questions</strong>No responses, answer options or mappings are available.</div></div>
        <footer className="question-footer">
          <button type="button" className="button" disabled>Previous</button>
          <div className="question-footer-right"><span>Review responses before submission</span>
            <button type="button" className="button primary" disabled>Next section <Icon name="next"/></button></div>
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
