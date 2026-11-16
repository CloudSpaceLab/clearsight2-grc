import { useEffect, useState } from 'react'
import { useV1Session } from './V1Session'
import { v1, command, scoped, programMatters, programRequests } from './v1Client'
import type { AssessmentWorkspace, MatterAggregate, RequestRecord, Template } from './v1Client'
import type { AssessmentReviewReceipt } from './AssessmentReview'
import { RecordDialog } from './RecordDialog'
import { V1Responses } from './V1Responses'
import { AdoptedAssessmentDialog } from './AdoptedAssessmentDialog'
type Action = 'assessment'|'issue'|'document'|null
type Operation = {command:string;label:string;can_act:boolean;reason?:string;allowed_targets?:string[]}
const issueStateLabel=(value:string)=>({OPEN:'Open',IN_PROGRESS:'In progress',RESOLVED:'Resolved',CLOSED:'Closed',CANCELLED:'Cancelled'}[value]||value.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()))
export function ConnectedProgramWorkflows({programId,section,action,activityExportRef,onActionDone,onCreated,onOpenAssessment}:{programId:string;section:string;action:Action;activityExportRef:{current:(()=>void)|null};onActionDone:()=>void;onCreated:()=>void;onOpenAssessment:()=>void}) {
  const {context}=useV1Session()
  const [requests,setRequests]=useState<RequestRecord[]>([]),[templates,setTemplates]=useState<Template[]>([]),[matters,setMatters]=useState<MatterAggregate[]>([])
  const [workspace,setWorkspace]=useState<AssessmentWorkspace|null>(null)
  const [selected,setSelected]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true)
  const [search,setSearch]=useState(''),[status,setStatus]=useState(''),[issue,setIssue]=useState<MatterAggregate|null>(null),[operations,setOperations]=useState<Operation[]>([])
  const [reviewOptions,setReviewOptions]=useState<AssessmentReviewReceipt[]>([])
  const [sourceReview,setSourceReview]=useState<AssessmentReviewReceipt|null>(null)
  useEffect(()=>{
    setReviewOptions([])
    if(action!=='issue'||!context)return
    let active=true
    void v1<{items:AssessmentReviewReceipt[]}>(scoped(`/api/v1/programs/${programId}/assessment-reviews`,context))
      .then(result=>{if(active)setReviewOptions(result.items.filter(review=>review.status==='FOLLOW_UP_REQUIRED'))})
      .catch(()=>{if(active)setError('Assessment reviews could not be loaded.')})
    return()=>{active=false}
  },[action,context,programId])
  async function refresh(){
    if(!context)return
    setLoading(true)
    const results=await Promise.allSettled([
      v1<AssessmentWorkspace>(scoped(`/api/v1/programs/${programId}/assessment-workspace`,context)),
      v1<{items:Template[]}>(scoped(`/api/v1/programs/${programId}/form-templates?limit=100`,context)),
      v1<{items:MatterAggregate[]}>(scoped('/api/v1/matters?limit=100',context)),
    ])
    if(results[0].status==='fulfilled'){setRequests(programRequests(results[0].value.items,programId));setWorkspace(results[0].value)}
    if(results[1].status==='fulfilled')setTemplates(results[1].value.items.filter(t=>t.is_current&&t.status==='ACTIVE'))
    if(results[2].status==='fulfilled')setMatters(programMatters(results[2].value.items,programId))
    const failures=results.filter(r=>r.status==='rejected');if(failures.length)setError(failures.map(r=>r.status==='rejected'?String(r.reason):'').join('; '))
    setLoading(false)
  }
  useEffect(()=>{void refresh()},[programId,context?.actor.id])
  async function run(work:()=>Promise<void>){setBusy(true);setError('');try{await work();await refresh();onCreated()}catch(e){setError(e instanceof Error?e.message:'Command failed')}finally{setBusy(false)}}
  async function openIssue(value:MatterAggregate){if(!context)return;setIssue(value);setOperations([]);setError('');try{const result=await v1<{matter_id:string;matter_version:number;operations:Operation[]}>(scoped(`/api/v1/matters/${value.matter.id}/operations`,context));if(result.matter_id!==value.matter.id||result.matter_version!==value.matter.version)throw Error('Issue changed. Refresh before acting.');setOperations(result.operations)}catch(e){setError(String(e))}}
  if(!context)return <p className="program-context-empty" role="status">Sign in to load authorized Program workflows.</p>
  const transition=operations.find(o=>o.command==='matter.transition')
  const editDetails=operations.find(o=>o.command==='matter.details.update')
  return <>
    {error&&<p className="program-context-empty" role="alert">{error}</p>}{message&&<p className="program-context-empty" role="status">{message}</p>}
    {workspace?.limited&&<p className="program-context-empty" role="status">Showing the latest 100 requests for this Program. Overview totals include all authorized records.</p>}
    {loading&&<p className="program-context-empty" role="status">Loading authorized records…</p>}
    {section==='Issues'?<><div className="program-register-tools"><label className="program-field">Search issues<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Reference or title"/></label><label className="program-field">Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{['Open','In progress','Resolved','Closed'].map(s=><option key={s} value={s}>{s}</option>)}</select></label></div>{(()=>{const visible=matters.filter(a=>(!status||issueStateLabel(a.matter.status)===status)&&`${a.matter.reference} ${a.matter.title}`.toLowerCase().includes(search.toLowerCase()));return <><div className="program-issue-records">{visible.map(a=><button className="program-record-row program-register-record" key={a.matter.id} onClick={()=>void openIssue(a)}><span><strong>{a.matter.reference} · {a.matter.title}</strong><small>{a.matter.priority ? `Priority ${a.matter.priority} · ` : ''}{a.matter.due_at?`Due ${new Date(a.matter.due_at).toLocaleDateString(undefined,{timeZone:'UTC'})}`:`Updated ${new Date(a.matter.updated_at).toLocaleDateString()}`}</small></span><span className="pill">{issueStateLabel(a.matter.status)}</span><span className="program-row-open">Open <span aria-hidden="true">→</span></span></button>)}</div>{!loading&&!visible.length&&<p className="program-context-empty" role="status">No issues match these filters.</p>}<p className="program-context-empty">Showing {visible.length} issues from the authorized records returned by v1.</p></>})()}</>
      :<V1Responses context={context} programId={programId} requests={requests} activities={workspace?.activities||[]} activitiesLimited={workspace?.activities_limited||false} onOpenAssessment={onOpenAssessment} templates={templates} selected={selected} onSelect={setSelected} section={section==='Documents'?'Documents':section==='Activity'?'Activity':'Assessment'} activityExportRef={activityExportRef} onRefresh={refresh} onMessage={setMessage} openDocument={action==='document'} onDocumentHandled={onActionDone}/>}
    {action==='assessment'&&<AdoptedAssessmentDialog context={context} programId={programId} templates={templates} onClose={onActionDone} onCreated={async record=>{setSelected(record.id);setMessage('Assessment created for the assigned respondent.');onActionDone();await refresh();onCreated()}}/>}
    {action==='issue'&&<RecordDialog title="New issue" onClose={onActionDone} closeDisabled={busy}><form onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);void run(async()=>{
      const due=String(data.get('due')||'')
      await command(scoped('/api/v1/matters',context),{tenant_id:context.tenant.id,legal_entity_id:context.legal_entity.id,program_id:programId,type:'CONTROL_GAP',priority:Number(data.get('priority')),title:data.get('title'),summary:data.get('summary'),owner_principal_id:String(data.get('owner')||''),...(due?{due_at:`${due}T23:59:59Z`}:{}),...(data.get('review')?{source_type:'ASSESSMENT_REVIEW',source_id:data.get('review')}:{}),scope:{program_id:programId},known_facts:{},missing_facts:[],contradictions:[]})
      setMessage('Linked issue created in the v1 database.');onActionDone()
    })}}>{reviewOptions.length>0&&<label className="program-field">Source assessment review<select name="review"><option value="">No linked review</option>{reviewOptions.map(review=><option key={review.id} value={review.id}>{requests.find(request=>request.id===review.request_id)?.title||'Assessment'} · Review {review.version} · {new Date(review.created_at).toLocaleDateString()}</option>)}</select></label>}<label className="program-field">Issue title<input name="title" required maxLength={200}/></label><label className="program-field">Description<textarea name="summary" rows={3} required maxLength={2000}/></label><div className="program-dialog-grid"><label className="program-field">Owner<select name="owner"><option value="">Unassigned</option><option value={context.actor.id}>{context.actor.name} (me)</option></select></label><label className="program-field">Priority<select name="priority" defaultValue="3">{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label><label className="program-field">Due date<input name="due" type="date"/></label></div><p role="alert">{error}</p><div className="program-dialog-actions"><button type="button" className="button" onClick={onActionDone} disabled={busy}>Cancel</button><button className="button primary" disabled={busy||loading}>Save issue</button></div></form></RecordDialog>}
    {sourceReview&&<RecordDialog title="Source assessment review" onClose={()=>setSourceReview(null)}>
      <p>Review {sourceReview.version} · {new Date(sourceReview.created_at).toLocaleString()}</p>
      <p>{sourceReview.rationale}</p>
      <ul>{sourceReview.groups.filter(group=>group.outcome==='FOLLOW_UP_REQUIRED').map(group=><li key={group.group_id}>{group.rationale}</li>)}</ul>
      {requests.some(request=>request.id===sourceReview.request_id)&&<button type="button" className="button" onClick={()=>{setSelected(sourceReview.request_id);setSourceReview(null);onOpenAssessment()}}>Open assessment</button>}
    </RecordDialog>}
    {issue&&<RecordDialog title={`${issue.matter.reference} · ${issue.matter.title}`} onClose={()=>setIssue(null)}>{issue.matter.source_type==='ASSESSMENT_REVIEW'&&issue.matter.source_id&&<button type="button" className="button" disabled={busy} onClick={()=>{setBusy(true);setError('');void v1<AssessmentReviewReceipt>(scoped(`/api/v1/programs/${programId}/assessment-review-records/${encodeURIComponent(issue.matter.source_id!)}`,context)).then(receipt=>{setIssue(null);setSourceReview(receipt)}).catch(error=>setError(error instanceof Error?error.message:'Review unavailable.')).finally(()=>setBusy(false))}}>View source assessment review</button>}<form onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);const due=String(d.get('due')||'');if(issue.matter.scope==null){setError('Issue scope is unavailable. Reload before editing.');return}void run(async()=>{await command(scoped(`/api/v1/matters/${issue.matter.id}/details`,context),{tenant_id:context.tenant.id,expected_version:issue.matter.version,title:d.get('title'),summary:d.get('summary'),priority:Number(d.get('priority')),due_at:due?(issue.matter.due_at?.slice(0,10)===due?issue.matter.due_at:`${due}T23:59:59Z`):null,scope:issue.matter.scope,rationale:d.get('rationale')});setIssue(null);setMessage('Issue details updated.')})}}><label className="program-field">Issue title<input name="title" defaultValue={issue.matter.title} maxLength={200} required disabled={!editDetails?.can_act}/></label><label className="program-field">Description<textarea name="summary" defaultValue={issue.matter.summary} rows={3} required disabled={!editDetails?.can_act}/></label><div className="program-dialog-grid"><label className="program-field">Owner<input value={issue.matter.owner_principal_id===context.actor.id?context.actor.name:issue.matter.owner_principal_id||'Unassigned'} readOnly/></label><label className="program-field">Priority<select name="priority" defaultValue={issue.matter.priority} disabled={!editDetails?.can_act}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}</option>)}</select></label><label className="program-field">Due date<input name="due" type="date" defaultValue={issue.matter.due_at?.slice(0,10)||''} disabled={!editDetails?.can_act}/></label><label className="program-field">Status<input value={issueStateLabel(issue.matter.status)} readOnly/></label></div>{editDetails?.can_act&&<><label className="program-field">Reason for change<textarea name="rationale" rows={3} required/></label><div className="program-dialog-actions"><button type="button" className="button" onClick={()=>setIssue(null)}>Cancel</button><button className="button primary" disabled={busy}>Save issue</button></div></>}<p role="alert">{error}</p>{!editDetails?.can_act&&<p>{editDetails?.reason||'Issue details are read-only for this account.'}</p>}</form>{transition?.can_act&&transition.allowed_targets?.length?<form className="program-issue-transition" onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);void run(async()=>{await command(scoped(`/api/v1/matters/${issue.matter.id}/transition`,context),{tenant_id:context.tenant.id,expected_version:issue.matter.version,to:d.get('to'),rationale:d.get('rationale')});setIssue(null);setMessage('Issue transition recorded by the backend.')})}}><h3>Change status</h3><label className="program-field">Next state<select name="to">{transition.allowed_targets.map(t=><option key={t} value={t}>{issueStateLabel(t)}</option>)}</select></label><label className="program-field">Rationale<textarea name="rationale" required/></label><button className="button" disabled={busy}>Record transition</button></form>:<p>{transition?.reason||'No authorized state transition is available for this account and record.'}</p>}</RecordDialog>}
  </>
}
