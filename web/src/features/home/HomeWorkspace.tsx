import { useEffect, useState } from 'react'
import { useV1Session } from '../programs/V1Session'
import { scoped, v1 } from '../programs/v1Client'
import { hasDueDate, isOverdue, workScopeMatches } from './homeWork'
import { summarizeProgramReferences } from './programReferences'
import type { ProgramReferenceSummary } from './programReferences'
import { summarizeVisibleFormRequests } from './formRequestSummary'
import type { FormRequestSummary } from './formRequestSummary'
import { formatMinorUnits, validLossSnapshot, validMetricSnapshot, validOversightSnapshot, validRiskBreakdown, validVendorPage } from './homeOversight'
import type { LossSnapshot, MetricSnapshot, OversightSnapshot, RiskBreakdown, VendorPage } from './homeOversight'
import { Icon } from '../../shared/Icons'
import { useWorkspaceTabs } from '../../shared/useWorkspaceTabs'
import type { Screen } from '../../shared/DesignShell'
import './home.css'

const views = ['Oversight', 'Attention', 'My work'] as const
const measures = [
  {label:'Risks outside appetite', icon:'shield', basis:'Current risk posture'},
  {label:'Evidence reviews due', icon:'form', basis:'Upcoming and overdue reviews'},
  {label:'Assessment coverage', icon:'chart', basis:'Assessed / eligible requirements'},
  {label:'Net operational loss', icon:'chart', basis:'Recorded losses less recoveries'},
] as const

export function HomeWorkspace({onNavigate}:{onNavigate:(screen:Screen)=>void}) {
  const [view,setView]=useState<typeof views[number]>('Oversight')
  const [lossDays,setLossDays]=useState(90)
  const {context}=useV1Session()
  const scopeKey=context?[context.actor.id,context.tenant.id,context.legal_entity.id].join(':'):''
  const [oversight,setOversight]=useState<{key:string;days:number;domain:MetricSnapshot|null;home:MetricSnapshot|null;snapshot:OversightSnapshot|null;loss:LossSnapshot|null;risk:RiskBreakdown|null}|null>(null)
  useEffect(()=>{if(!context||import.meta.env.VITE_PROGRAM_BACKEND!=='v1')return;let active=true;const key=scopeKey;const entity=context.legal_entity.id
    void Promise.allSettled([v1<unknown>('/api/v1/metrics/domain'),v1<unknown>('/api/v1/metrics/home'),v1<unknown>('/api/v1/oversight')]).then(async ([domain,home,snapshot])=>{
      const homeData=home.status==='fulfilled'&&validMetricSnapshot(home.value,entity)?home.value:null
      const domainData=domain.status==='fulfilled'&&validMetricSnapshot(domain.value,entity)?domain.value:null
      const period=homeData?.reporting_period
      let loss:LossSnapshot|null=null
      let risk:RiskBreakdown|null=null
      if(period&&/^\d{4}-\d{2}-\d{2}$/.test(period.end_date))try{const end=new Date(`${period.end_date}T00:00:00Z`);const start=new Date(end.getTime()-(lossDays-1)*86400000).toISOString().slice(0,10);const result=await v1<unknown>(`/api/v1/metrics/losses/period?start_date=${start}&end_date=${period.end_date}`);if(validLossSnapshot(result,entity))loss=result}catch{/* Other oversight data remains available. */}
      const riskMetric=domainData?.items.find(item=>item.id==='risks_outside_appetite')
      if(domainData?.source_id&&domainData.definition_revision&&riskMetric)try{const q=new URLSearchParams({source_id:domainData.source_id,definition_revision:domainData.definition_revision});const result=await v1<unknown>(`/api/v1/metrics/domain/risks_outside_appetite/organization-breakdown?${q}`);if(validRiskBreakdown(result,domainData.source_id,domainData.definition_revision,riskMetric.value))risk=result}catch{/* A missing breakdown does not change the headline. */}
      if(active)setOversight({key,days:lossDays,domain:domainData,home:homeData,snapshot:snapshot.status==='fulfilled'&&validOversightSnapshot(snapshot.value)?snapshot.value:null,loss,risk})
    });return()=>{active=false}
  },[context,scopeKey,lossDays])
  const currentOversight=oversight?.key===scopeKey?oversight:null
  const riskMetric=currentOversight?.domain?.items.find(item=>item.id==='risks_outside_appetite')
  const loss=currentOversight?.days===lossDays?currentOversight.loss:null
  const [vendors,setVendors]=useState<{key:string;page:VendorPage}|null>(null)
  useEffect(()=>{if(!context||import.meta.env.VITE_PROGRAM_BACKEND!=='v1')return;let active=true;const key=scopeKey
    void v1<unknown>('/api/v1/vendors?limit=100').then(page=>{if(validVendorPage(page,context.tenant.id,context.legal_entity.id)){if(active)setVendors({key,page})}else if(active)setVendors(null)}).catch(()=>{if(active)setVendors(null)})
    return()=>{active=false}
  },[context,scopeKey])
  const vendorPage=vendors?.key===scopeKey?vendors.page:null
  const [forms,setForms]=useState<{key:string;summary:FormRequestSummary}|null>(null)
  useEffect(()=>{if(!context||import.meta.env.VITE_PROGRAM_BACKEND!=='v1')return;let active=true;const key=scopeKey
    void v1<unknown>('/api/v1/evidence/requests?limit=100').then(value=>{const summary=summarizeVisibleFormRequests(value);if(active)setForms(summary?{key,summary}:null)}).catch(()=>{if(active)setForms(null)})
    return()=>{active=false}
  },[context,scopeKey])
  const formSummary=forms?.key===scopeKey?forms.summary:null
  const [programs,setPrograms]=useState<{key:string;summary:ProgramReferenceSummary}|null>(null)
  useEffect(()=>{if(!context||import.meta.env.VITE_PROGRAM_BACKEND!=='v1')return;let active=true;const key=scopeKey
    void v1<unknown>(scoped('/api/v1/programs?limit=100',context)).then(value=>{const summary=summarizeProgramReferences(value,context.tenant.id,context.legal_entity.id);if(active)setPrograms(summary?{key,summary}:null)}).catch(()=>{if(active)setPrograms(null)})
    return()=>{active=false}
  },[context,scopeKey])
  const programSummary=programs?.key===scopeKey?programs.summary:null
  const [work,setWork]=useState<{actor:string;status:'loading'|'ready'|'unavailable';items:{id:string;title:string;state:string;due_at?:string;why_now?:string}[];asOf:string;hasMore:boolean;total:number;overdue:number}|null>(null)
  useEffect(()=>{if(!context||import.meta.env.VITE_PROGRAM_BACKEND!=='v1')return;let active=true;const actor=context.actor.id;const scopeKey=[actor,context.tenant.id,context.legal_entity.id].join(':')
    void Promise.all([v1<{items:{id:string;title:string;state:string;due_at?:string;why_now?:string}[];has_more:boolean;as_of:string;scope:{principal_id:string;tenant_id:string;legal_entity_id:string}}>('/api/v1/work/assignments?limit=25'),v1<{total:number;overdue:number;scope:{principal_id:string;tenant_id:string;legal_entity_id:string}}>('/api/v1/work/assignment-counts')]).then(([page,counts])=>{
      const validScope=(scope:{principal_id:string;tenant_id:string;legal_entity_id:string}|undefined)=>workScopeMatches(scope,actor,context.tenant.id,context.legal_entity.id)
      if(!validScope(page.scope)||!validScope(counts.scope)||!Array.isArray(page.items)||typeof counts.total!=='number'||typeof counts.overdue!=='number'||!Number.isFinite(Date.parse(page.as_of)))throw Error('Invalid work summary')
      if(active)setWork({actor:scopeKey,status:'ready',items:page.items,asOf:page.as_of,hasMore:page.has_more,total:counts.total,overdue:counts.overdue})
    }).catch(()=>{if(active)setWork({actor:scopeKey,status:'unavailable',items:[],asOf:'',hasMore:false,total:0,overdue:0})})
    return()=>{active=false}
  },[context])
  const myWork=context&&work?.actor===[context.actor.id,context.tenant.id,context.legal_entity.id].join(':')?work:null
  const overdue=myWork?.status==='ready'?myWork.items.filter(item=>isOverdue(item.due_at,myWork.asOf)):[]
  const tabs=useWorkspaceTabs(views,view,setView)
  return <div className="home-workspace">
    <section className="page-heading"><div className="heading-copy">
      <div className="eyebrow">HOME / ORGANIZATION SUMMARY</div>
      <h1>Enterprise Control Tower</h1>
      <p>Risk, compliance, vendor oversight and work across the organization.</p>
    </div></section>
    <div className="home-notice" role="status"><Icon name="info"/><div><strong>Organization summaries unavailable</strong>
      <p>{context?'Some organization-wide summaries are not available for this account.':'Sign in to load your authorized work.'} Unavailable values do not mean zero.</p></div></div>
    <div className="home-tabs" role="tablist" aria-label="Home views" onKeyDown={tabs.onKeyDown}>
      {views.map((item,i)=><button key={item} ref={tabs.refAt(i)} type="button" role="tab"
        id={`home-tab-${i}`} aria-controls={`home-panel-${i}`} aria-selected={view===item}
        tabIndex={view===item?0:-1} onClick={()=>setView(item)}>{item}</button>)}
    </div>
    <section role="tabpanel" id="home-panel-0" aria-labelledby="home-tab-0" tabIndex={0} hidden={view!=='Oversight'}>
      <div className="home-metrics">{measures.map(measure=><article className="home-card home-metric" key={measure.label}>
        <div className="home-card-heading"><h2>{measure.label}</h2><Icon name={measure.icon}/></div>
        <strong className="home-unavailable">{measure.label==='Risks outside appetite'&&riskMetric?riskMetric.value:measure.label==='Net operational loss'&&loss?(loss.event_count===0?'No ledger events':loss.currencies.length===1?formatMinorUnits(loss.currencies[0]!.net.minor_units,loss.currencies[0]!.currency):loss.currencies.length>1?'Multiple currencies':'Total unavailable'):'Unavailable'}</strong><p>{measure.basis}</p>
        <small>{measure.label==='Risks outside appetite'&&riskMetric?`${riskMetric.freshness} · ${riskMetric.completeness} · ${riskMetric.population} in scope · ${riskMetric.excluded} excluded · ${riskMetric.unknown} unknown · As of ${new Date(riskMetric.generated_at).toLocaleString()}`:measure.label==='Net operational loss'&&loss?`${loss.event_count} events · ${loss.period_start.slice(0,10)} to ${loss.period_end.slice(0,10)} · Legal entity`:'Source / as-of unavailable'}</small>
      </article>)}</div>
      {currentOversight?.home&&<article className="home-card home-signals"><h2>Oversight signals</h2><p>Authorized legal-entity snapshot from v1.</p><dl>{currentOversight.home.items.map(item=><div key={item.id}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl><small>{currentOversight.home.items[0]?.freshness} · {currentOversight.home.items[0]?.completeness} · {currentOversight.home.items[0]?.excluded} excluded · As of {currentOversight.home.items[0]&&new Date(currentOversight.home.items[0].generated_at).toLocaleString()}</small></article>}
      <div className="home-domains">
        <article className="home-card"><h2>Vendors &amp; onboarding</h2><p>Relationship status and due diligence</p>
          <dl>{[{label:'Active',status:'ACTIVE'},{label:'Proposed',status:'PROPOSED'},{label:'Under review',status:'UNDER_REVIEW'}].map(({label,status})=><div key={status}><dt>{label}</dt><dd>{vendorPage?`${vendorPage.next_cursor?'At least ':''}${vendorPage.items.filter(item=>item.relationship.status===status).length}`:'Unavailable'}</dd></div>)}<div><dt>Overdue due diligence</dt><dd>Unavailable</dd></div></dl>
          <small>{vendorPage?`Visible relationships returned by v1${vendorPage.next_cursor?' · first page only':''}. Other relationship states are not included in these rows.`:'Vendor summaries require authorized relationship records.'}</small>
          <button className="button home-action" disabled>Vendor register unavailable</button>
        </article>
        <article className="home-card"><h2>Forms &amp; assessments</h2><p>Form-linked requests visible to this account</p>
          <dl>{([{label:'Draft',status:'DRAFT'},{label:'Open',status:'OPEN'},{label:'Ready',status:'READY'},{label:'Submitted',status:'SUBMITTED'},{label:'Expired',status:'EXPIRED'}] as const).map(({label,status})=><div key={status}><dt>{label}</dt><dd>{formSummary?`${formSummary.limited?'At least ':''}${formSummary.counts[status]}`:'Unavailable'}</dd></div>)}<div><dt>Review decisions</dt><dd>Unavailable</dd></div></dl>
          <small>{formSummary?`Manageable requests returned by v1, not all organization assessments${formSummary.limited?' · first 100 requests only':''}${formSummary.other?` · ${formSummary.other} in other states`:''}. Submission does not mean reviewed.`:'Sign in with access to load form-linked requests. Submission does not mean reviewed.'}</small>
          <button className="button home-action" onClick={()=>onNavigate('assessment')}>Open assessment workspace <Icon name="next"/></button>
        </article>
        <article className="home-card"><h2>Compliance &amp; Programs</h2><p>Requirement assessment coverage</p>
          {programSummary&&<p>{programSummary.limited?'At least ':''}{programSummary.programs} visible Programs · {programSummary.limited?'At least ':''}{programSummary.approvedRequirements} current approved requirement references · As of {new Date(programSummary.asOf).toLocaleString()}</p>}
          <dl>{['Assessed requirements','Unassessed requirements','Control follow-up','Compliance conclusion'].map(label=><div key={label}><dt>{label}</dt><dd>Unavailable</dd></div>)}</dl>
          <small>Assessment completeness does not establish compliance.</small>
          <button className="button home-action" onClick={()=>onNavigate('programs')}>Browse authorized Programs <Icon name="next"/></button>
        </article>
      </div>
      <button className="button home-attention-link" onClick={()=>{setView('Attention');document.getElementById('home-tab-1')?.focus()}}>View attention queue <Icon name="next"/></button>
      <div className="home-analysis">
        <article className="home-card"><div className="home-card-heading"><h2>Risk concentration</h2><Icon name="shield"/></div>
          {currentOversight?.risk?<div className="home-work-list"><p>{currentOversight.risk.count} risks outside appetite · authorized snapshot</p>{currentOversight.risk.items.length?currentOversight.risk.items.map(item=><div className="home-risk-row" key={item.key}><span>{item.label}</span><div className="home-risk-track" aria-hidden="true"><span style={{width:`${currentOversight.risk!.count?100*item.value/currentOversight.risk!.count:0}%`}}/></div><strong>{item.value}</strong></div>):<p>No risks outside appetite in this snapshot.</p>}</div>:<div className="home-empty"><Icon name="chart"/><h3>Risk distribution unavailable</h3><p>Business-unit comparisons appear when authorized risk records and appetite definitions are available.</p></div>}
        </article>
        <article className="home-card"><div className="home-card-heading"><h2>Operational losses</h2>
          <label className="home-period">Period <select disabled={!currentOversight?.home} value={lossDays} onChange={e=>setLossDays(Number(e.target.value))} aria-label="Operational loss reporting period"><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option><option value={180}>Last 180 days</option></select></label></div>
          {loss?<div className="home-work-list"><p>{loss.event_count} recorded ledger events · {loss.period_start.slice(0,10)} to {loss.period_end.slice(0,10)}</p>{loss.currencies.length?loss.currencies.map(c=><div className="home-work-row" key={c.currency}><strong>{c.currency}</strong><span>Gross {formatMinorUnits(c.gross.minor_units,c.currency)} · Recoveries {formatMinorUnits(c.recovery.minor_units,c.currency)} · Net {formatMinorUnits(c.net.minor_units,c.currency)}</span></div>):<p>No monetary loss totals were returned for this period.</p>}{loss.currencies.map(c=>{const points=loss.flow_points.map(point=>({start:point.start,flow:point.currencies.find(x=>x.currency===c.currency)}));const values=points.flatMap(point=>point.flow?[BigInt(point.flow.gross.minor_units),BigInt(point.flow.recovery.minor_units)]:[]).map(value=>value<0n?-value:value);const max=values.reduce((a,b)=>a>b?a:b,0n);return <div key={c.currency}><strong>{c.currency} · period movement</strong><div className="home-loss-chart" role="img" aria-label={`${c.currency} gross losses and recoveries by period; details in table below`} >{points.map(point=>{const gross=point.flow?BigInt(point.flow.gross.minor_units):0n;const recovery=point.flow?BigInt(point.flow.recovery.minor_units):0n;const pct=(n:bigint)=>max?Number((n<0n?-n:n)*100n/max):0;return <div className="home-loss-point" key={point.start}><span style={{height:`${pct(gross)}%`}}/><span style={{height:`${pct(recovery)}%`}}/></div>})}</div><small>Gross and recovery amounts shown separately; bars use absolute values.</small><div className="home-loss-table"><table><caption>{c.currency} movement by period</caption><thead><tr><th>Period start</th><th>Gross</th><th>Recoveries</th></tr></thead><tbody>{points.map(point=><tr key={point.start}><td>{point.start.slice(0,10)}</td><td>{formatMinorUnits(point.flow?.gross.minor_units??'0',c.currency)}</td><td>{formatMinorUnits(point.flow?.recovery.minor_units??'0',c.currency)}</td></tr>)}</tbody></table></div></div>})}</div>:<div className="home-empty"><Icon name="chart"/><h3>Loss history unavailable</h3><p>Gross losses, recoveries, net losses and currency require an authorized ledger and reporting period.</p></div>}
          <small>The loss period applies to loss activity; current posture is separate.</small>
        </article>
      </div>
    </section>
    <section role="tabpanel" id="home-panel-1" aria-labelledby="home-tab-1" tabIndex={0} hidden={view!=='Attention'}>
      <article className="home-card"><h2>Needs attention</h2><p>Organization-wide exceptions and follow-up</p>
        {currentOversight?.snapshot?<div className="home-work-list"><h3>Organization interventions</h3><p>{currentOversight.snapshot.freshness} · {currentOversight.snapshot.coverage.excluded} excluded · {currentOversight.snapshot.coverage.unknown} unknown · As of {new Date(currentOversight.snapshot.generated_at).toLocaleString()}</p>{currentOversight.snapshot.interventions.length?currentOversight.snapshot.interventions.map(item=><article className="home-work-row" key={`${item.target_type}:${item.target_id}`}><strong>{item.title}</strong><span>{item.state} · Priority {item.priority}{hasDueDate(item.due_at)?` · Due ${new Date(item.due_at).toLocaleDateString(undefined,{timeZone:'UTC'})}`:''}</span><small>{item.reason} · {item.next_action}</small></article>):<p>No interventions returned in this snapshot.</p>}</div>:<div className="home-empty"><Icon name="info"/><h3>Attention queue unavailable</h3><p>Organization-wide oversight requires authorized access and a current v1 snapshot.</p></div>}
        {myWork?.status==='ready'&&<div className="home-work-list"><h3>Your overdue work · {myWork.overdue}</h3><p>Assigned to {context?.actor.name}; organization-wide attention is not included.</p>{overdue.length?overdue.map(item=><article className="home-work-row" key={item.id}><strong>{item.title}</strong><span>{item.state} · Due {new Date(item.due_at!).toLocaleDateString(undefined,{timeZone:'UTC'})}</span><small>{item.why_now}</small></article>):<p>{myWork.overdue?'No overdue items appear on the first page.':'No overdue assignments.'}</p>}{myWork.hasMore&&<small>Showing the first 25 assignments; more may be available in v1.</small>}</div>}
        <button className="button" onClick={()=>onNavigate('programs')}>Open Programs <Icon name="next"/></button>
      </article>
    </section>
    <section role="tabpanel" id="home-panel-2" aria-labelledby="home-tab-2" tabIndex={0} hidden={view!=='My work'}>
      <article className="home-card"><h2>My work</h2><p>Your assigned reviews, assessments and approvals</p>
        {myWork?.status==='ready'?<div className="home-work-list"><p>{myWork.total} assigned items · {myWork.overdue} overdue · As of {new Date(myWork.asOf).toLocaleString()}</p>{myWork.items.length?myWork.items.map(item=><article className="home-work-row" key={item.id}><strong>{item.title}</strong><span>{item.state}{hasDueDate(item.due_at)?` · Due ${new Date(item.due_at).toLocaleDateString(undefined,{timeZone:'UTC'})}`:''}</span><small>{item.why_now}</small></article>):<p>No assignments returned for this account.</p>}{myWork.hasMore&&<small>Showing the first 25 assignments; more may be available in v1.</small>}</div>:<div className="home-empty"><Icon name="users"/><h3>Personal work unavailable</h3><p>Sign-in and authorized assignments are required to show your work. No completion or approval is inferred.</p></div>}
        <button className="button" onClick={()=>onNavigate('assessment')}>Open assessment workspace <Icon name="next"/></button>
      </article>
    </section>
  </div>
}
