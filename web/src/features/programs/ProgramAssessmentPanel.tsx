import { useState } from 'react'
import { useWorkspaceTabs } from '../../shared/useWorkspaceTabs'

const views = ['Questions & responses', 'Configuration', 'Response history'] as const
type View = typeof views[number]

// Composition follows the reviewed prototype; no sample records enter the app.
export function ProgramAssessmentPanel() {
  const [view, setView] = useState<View>('Questions & responses')
  const tabs = useWorkspaceTabs(views, view, setView)
  return <>
    <div className="program-register-tools">
      <label className="program-field">Search assessments<input type="search" placeholder="Name, type or responsible team" disabled/></label>
      <label className="program-field">Status<select disabled><option>All statuses</option></select></label>
    </div>
    <div className="program-assessment-workspace">
      <section className="surface program-cycle-browser" aria-label="Assessment cycles">
        <div className="surface-heading"><h3>Assessment cycles</h3></div>
        <p className="program-context-empty" role="status">Assessment collection is not connected. No cycles can be loaded.</p>
      </section>
      <section className="surface program-response-workspace" aria-label="Selected assessment">
        <div className="surface-heading"><div><h3>Assessment details</h3><p>Select an assessment when the service is available.</p></div></div>
        <div className="program-response-tabs" role="tablist" aria-label="Assessment detail" onKeyDown={tabs.onKeyDown}>
          {views.map((name, index) => <button key={name} ref={tabs.refAt(index)} type="button" role="tab"
            id={`program-detail-tab-${index}`} aria-controls={`program-detail-panel-${index}`}
            aria-selected={view === name} tabIndex={view === name ? 0 : -1} onClick={() => setView(name)}>{name}</button>)}
        </div>
        {views.map((name, index) => view === name && <section key={name} role="tabpanel" tabIndex={0}
          id={`program-detail-panel-${index}`} aria-labelledby={`program-detail-tab-${index}`} className="program-detail-body">
          {index === 0 ? <><h4>Questions &amp; responses unavailable</h4><p>Questionnaire content, answers and review decisions require a connected assessment service.</p><div className="revision-actions"><button className="button" disabled>Save draft</button><button className="button primary" disabled>Submit response</button></div></>
            : index === 1 ? <><h4>Effective schedule unavailable</h4><p>No recurrence configuration or pending proposal is loaded. Scheduling and independent approval are not connected.</p><button className="button" disabled>Propose schedule change</button></>
            : <><h4>No response history loaded</h4><p>Submitted revisions require the authorized response-history service.</p></>}
        </section>)}
      </section>
    </div>
  </>
}
