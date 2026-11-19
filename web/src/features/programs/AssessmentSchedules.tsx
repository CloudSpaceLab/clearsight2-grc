import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { command, scoped, v1 } from './v1Client'
import type { V1Context } from './v1Client'
import { RecordDialog } from './RecordDialog'

type Option = {
  adoption_id: string
  form_template_id: string
  form_template_version: number
  name: string
  ready: boolean
  respondents: { id: string; name: string }[]
}

type Schedule = {
  id: string
  owner_id: string
  version: number
  state: 'PENDING' | 'ACTIVE' | 'STOPPED' | 'COMPLETE' | 'BLOCKED'
  adoption_id: string
  form_template_id: string
  form_template_version: number
  respondent_principal_id: string
  first_period_start: string
  time_zone: string
  interval_months: number
  interval_days?: number
  response_days: number
  cycle_limit: number
  cycle_index: number
  next_attempt_at: string
  last_outcome?: string
  rationale: string
}

type SchedulePage = { items: Schedule[]; can_propose: boolean; can_approve: boolean; can_stop: boolean }

const stateLabel = {
  PENDING: 'Awaiting approval',
  ACTIVE: 'Active',
  STOPPED: 'Stopped',
  COMPLETE: 'Complete',
  BLOCKED: 'Dispatch blocked',
}

const stateTone = {
  PENDING: 'review',
  ACTIVE: 'received',
  STOPPED: 'closed',
  COMPLETE: 'received',
  BLOCKED: 'incomplete',
}

const cadence: Record<number, string> = { 1: 'Monthly', 3: 'Quarterly', 6: 'Every six months', 12: 'Annually' }

function cyclePreview(start: string, months: number, days: number, responseDays: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || (months > 0 && !start.endsWith('-01')) ||
    (!months && !days) || months > 24 || days > 365 || responseDays < 1 || responseDays > 365) return null
  const opens = new Date(start + 'T00:00:00Z')
  if (!Number.isFinite(opens.getTime())) return null
  opens.setUTCMonth(opens.getUTCMonth() + months)
  opens.setUTCDate(opens.getUTCDate() + days)
  const due = new Date(opens)
  due.setUTCDate(due.getUTCDate() + responseDays - 1)
  return { opens: opens.toISOString().slice(0, 10), due: due.toISOString().slice(0, 10) }
}

export function AssessmentSchedules({ context, programId, initialOpen = false, compact = false }: { context: V1Context; programId: string; initialOpen?: boolean; compact?: boolean }) {
  const [page, setPage] = useState<SchedulePage>()
  const [options, setOptions] = useState<Option[]>([])
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState('')
  const [start, setStart] = useState('')
  const [frequency, setFrequency] = useState('3')
  const [customUnit, setCustomUnit] = useState('weeks')
  const [customInterval, setCustomInterval] = useState(2)
  const [showProposal, setShowProposal] = useState(false)
  const [open, setOpen] = useState(initialOpen)
  const [focusedSchedule,setFocusedSchedule]=useState(() => new URLSearchParams(window.location.search).get('schedule') || '')
  const scheduleButton = useRef<HTMLButtonElement>(null)
  const months = frequency === 'custom' ? (customUnit === 'months' ? customInterval : 0) : Number(frequency)
  const days = frequency === 'custom' && customUnit !== 'months' ? customInterval * (customUnit === 'weeks' ? 7 : 1) : 0
  const [responseDays, setResponseDays] = useState(15)
  const [decision, setDecision] = useState<{ schedule: Schedule; action: 'approve' | 'stop' }>()
  const path = `/api/v1/programs/${encodeURIComponent(programId)}/assessment-schedules`
  const tenantId = context.tenant.id
  const actorId = context.actor.id
  const entityId = context.legal_entity.id

  useEffect(() => {
    let active = true
    const query = `?tenant_id=${encodeURIComponent(tenantId)}${focusedSchedule ? '&schedule_id=' + encodeURIComponent(focusedSchedule) : ''}`
    void v1<SchedulePage>(path + query).then(async schedules => {
      if (!active) return
      setPage(schedules)
      if (schedules.can_propose || schedules.can_approve || schedules.items.length > 0) {
        const setup = await v1<{ items: Option[] }>(`/api/v1/programs/${encodeURIComponent(programId)}/assessment-setup` + query)
        if (active) setOptions(setup.items)
      }
    }).catch(error => {
      if (active) setError(error instanceof Error ? error.message : 'Could not load assessment schedules.')
    })
    return () => { active = false }
  }, [path, programId, tenantId, entityId, actorId, revision, focusedSchedule])

  const selected = form === '' ? undefined : options[Number(form)]
  const preview = cyclePreview(start, months, days, responseDays)

  async function save(url: string, body: unknown) {
    setBusy(true)
    setError('')
    try {
      await command(scoped(url, context), body)
      if (url === path) setShowProposal(false)
      setDecision(undefined)
      setRevision(value => value + 1)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save the schedule.')
    } finally {
      setBusy(false)
    }
  }

  function propose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected?.ready || !preview || busy) return
    const data = new FormData(event.currentTarget)
    void save(path, {
      adoption_id: selected.adoption_id,
      form_template_id: selected.form_template_id,
      form_template_version: selected.form_template_version,
      respondent_principal_id: data.get('respondent'),
      first_period_start: start,
      time_zone: data.get('zone'),
      interval_months: months,
      interval_days: days,
      response_days: responseDays,
      cycle_limit: Number(data.get('cycles')),
      rationale: data.get('reason'),
    })
  }

  if (page && !page.can_propose && !page.can_approve && !page.can_stop && page.items.length === 0) return null

  const scheduleCount = page?.items.length
  return <>
    <div className={compact ? 'assessment-schedule-link' : 'surface assessment-schedule-entry'}>
      {!compact && <div><strong>Recurring assessments</strong>
        <span>{scheduleCount === undefined ? 'Schedule settings' : `${scheduleCount} ${scheduleCount === 1 ? 'schedule' : 'schedules'}`}</span>
      </div>}
      <button className="button sm" type="button" ref={scheduleButton} aria-haspopup="dialog" onClick={() => setOpen(true)}>View schedules</button>
    </div>
    {open && <RecordDialog title={showProposal ? 'Propose a recurring assessment' : 'Recurring assessments'} closeDisabled={busy} onClose={() => {
      setOpen(false)
      requestAnimationFrame(() => scheduleButton.current?.focus())
      setShowProposal(false)
      setDecision(undefined)
    }}>
      <div className="schedule-panel">
      {error && <p role="alert">{error}</p>}
      {!page && !error && <p role="status">Loading schedules…</p>}
      {!showProposal && <div className="schedule-toolbar">
        {page?.items.length === 0 && <p>No recurring assessments are scheduled for this Program.</p>}
        {page?.can_propose && <button className="button primary" type="button" onClick={() => {
          setStart('')
          setShowProposal(true)
          setDecision(undefined)
          setError('')
        }}>Propose schedule</button>}
      </div>}
      {focusedSchedule && <p>Selected schedule <code>{focusedSchedule}</code> <button type="button" className="text-link" onClick={() => {
        setFocusedSchedule(''); setError(''); const url = new URL(window.location.href); url.searchParams.delete('schedule'); window.history.replaceState(null, '', url)
      }}>Show all schedules</button></p>}
      {!showProposal && page?.items.map(schedule => {
        const option = options.find(item => item.adoption_id === schedule.adoption_id &&
          item.form_template_id === schedule.form_template_id && item.form_template_version === schedule.form_template_version)
        const respondent = option?.respondents.find(person => person.id === schedule.respondent_principal_id)
        const canStop = page.can_stop && ['PENDING', 'ACTIVE', 'BLOCKED'].includes(schedule.state)
        const canApprove = page.can_approve && schedule.state === 'PENDING' && schedule.owner_id !== context.actor.id
        const first = cyclePreview(schedule.first_period_start, schedule.interval_months, schedule.interval_days || 0, schedule.response_days)
        return <article className="schedule-record" key={schedule.id}>
          <header className="schedule-record-heading">
          <h3>{option?.name || 'Scheduled questionnaire'} · v{schedule.form_template_version}</h3>
          <span className={`pill ${stateTone[schedule.state]}`}>{stateLabel[schedule.state]}</span></header>
          <dl className="schedule-facts">
            <div><dt>Frequency</dt><dd>{schedule.interval_days ? (schedule.interval_days % 7 === 0 ? `Every ${schedule.interval_days / 7} weeks` : `Every ${schedule.interval_days} days`) : cadence[schedule.interval_months] || `Every ${schedule.interval_months} months`}</dd></div>
            <div><dt>Respondent</dt><dd>{respondent?.name || 'Assigned respondent unavailable'}</dd></div>
            <div><dt>First response due</dt><dd>{first?.due} · {schedule.time_zone}</dd></div>
            <div><dt>Cycles processed</dt><dd>{schedule.cycle_index} of {schedule.cycle_limit} · {schedule.response_days} days to respond</dd></div>
          </dl>
          <p>First reporting period starts {schedule.first_period_start}{first && ` and opens for responses ${first.opens}`}.</p>
          {schedule.state === 'ACTIVE' && <p>Next dispatch check {new Date(schedule.next_attempt_at).toLocaleString(undefined, { timeZone: schedule.time_zone })}.</p>}
          <p>{schedule.rationale}</p>
          {schedule.last_outcome && <p>{schedule.last_outcome}</p>}
          {decision?.schedule.id === schedule.id ? <form onSubmit={event => {
            event.preventDefault()
            const data = new FormData(event.currentTarget)
            void save(`${path}/${schedule.id}/${decision.action}`, { expected_version: decision.schedule.version, reason: data.get('reason') })
          }}>
            <label className="program-field">Decision reason<textarea name="reason" required maxLength={2000}/></label>
            <div className="program-dialog-actions">
              <button type="button" className="button" disabled={busy} onClick={() => setDecision(undefined)}>Cancel</button>
              <button className="button primary" disabled={busy}>{decision.action === 'approve' ? 'Approve and activate schedule' : 'Stop future assessments'}</button>
            </div>
          </form> : <div className="program-dialog-actions">
            {canApprove && <button type="button" className="button" onClick={() => setDecision({ schedule, action: 'approve' })}>Review schedule</button>}
            {canStop && <button type="button" className="button" onClick={() => setDecision({ schedule, action: 'stop' })}>Stop schedule</button>}
          </div>}
        </article>
      })}
      {page?.can_propose && showProposal && <form className="schedule-record schedule-proposal" id="schedule-proposal" onSubmit={propose}>

        <div className="schedule-fields">
        <label className="program-field">Approved questionnaire<select required value={form} onChange={event => setForm(event.target.value)}>
          <option value="">Choose a questionnaire</option>
          {options.map((option, index) => option.ready && <option key={index} value={index}>{option.name} · v{option.form_template_version}</option>)}
        </select></label>
        <label className="program-field">Respondent<select key={form} name="respondent" required defaultValue="" disabled={!selected}>
          <option value="">Choose an eligible respondent</option>
          {selected?.respondents.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select></label>
        <label className="program-field">First reporting period starts<input type="date" required onInput={event => setStart(event.currentTarget.value)} aria-describedby="schedule-anchor-help"/></label>
        <p id="schedule-anchor-help">{months ? 'Choose the first day of a month. ' : ''}Each assessment opens after its reporting period ends.</p>
        <label className="program-field">Time zone<input name="zone" required defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone}/></label>
        <label className="program-field">Frequency<select value={frequency} onChange={event => setFrequency(event.target.value)}>
          {Object.entries(cadence).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          <option value="custom">Custom interval</option>
        </select></label>
        {frequency === 'custom' && <>
          <label className="program-field">Repeat every<input type="number" min={1} max={customUnit === 'months' ? 24 : customUnit === 'weeks' ? 52 : 365} required value={customInterval} onChange={event => setCustomInterval(Number(event.target.value))}/></label>
          <label className="program-field">Interval unit<select value={customUnit} onChange={event => setCustomUnit(event.target.value)}>
            <option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option>
          </select></label>
        </>}
        <label className="program-field">Days to respond<input type="number" required min={1} max={365} value={responseDays} onChange={event => setResponseDays(Number(event.target.value))}/></label>
        <label className="program-field">Number of cycles<input name="cycles" type="number" required min={1} max={12} defaultValue={4}/></label>
        </div>
        {preview && <p className="schedule-preview" role="status">First cycle opens {preview.opens}. Response due {preview.due} in the selected time zone.</p>}
        <label className="program-field">Reason for scheduling<textarea name="reason" required maxLength={2000}/></label>
        <div className="program-dialog-actions">
          <button className="button" type="button" disabled={busy} onClick={() => setShowProposal(false)}>Back to schedules</button>
          <button className="button primary" disabled={busy || !selected || !preview}>Send schedule for approval</button>
        </div>
      </form>}
    </div>
    </RecordDialog>}
  </>
}
