import { useEffect, useState } from 'react'
import { useV1Session } from './V1Session'
import { v1, scoped, programRequests } from './v1Client'
import type { AssessmentWorkspace, RequestRecord, Template } from './v1Client'
import { V1Responses } from './V1Responses'
import { AdoptedAssessmentDialog } from './AdoptedAssessmentDialog'
import { ProgramIssues } from './IssuesPanel'
import type { OverviewTarget } from './OverviewPanel'
import { ProgramActivity } from './ProgramActivity'

type Action = 'assessment'|'issue'|'document'|null
export function ConnectedProgramWorkflows({programId,section,action,activityExportRef,days,onOpenActivityTarget,onActionDone,onCreated,onOpenAssessment,onOpenDocuments,target,onTargetHandled}:{days:number;onOpenActivityTarget:(target:OverviewTarget)=>void;target?:OverviewTarget|null;onTargetHandled?:()=>void;programId:string;section:string;action:Action;activityExportRef:{current:(()=>void)|null};onActionDone:()=>void;onCreated:()=>void;onOpenAssessment:(id?:string)=>void;onOpenDocuments:()=>void}) {
  const {context}=useV1Session()
  const [requests,setRequests]=useState<RequestRecord[]>([]),[templates,setTemplates]=useState<Template[]>([])
  const [workspace,setWorkspace]=useState<AssessmentWorkspace|null>(null)
  const [selected,setSelected]=useState(() => target?.requestId || new URLSearchParams(window.location.search).get('request') || ''),[error,setError]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(true)
  async function refresh(){
    if(!context||section==='Issues'||section==='Activity')return
    setLoading(true);setError('')
    const results=await Promise.allSettled([
      v1<AssessmentWorkspace>(scoped(`/api/v1/programs/${programId}/assessment-workspace`,context)),
      v1<{items:Template[]}>(scoped(`/api/v1/programs/${programId}/form-templates?limit=100`,context)),
    ])
    if(results[0].status==='fulfilled'){setRequests(programRequests(results[0].value.items,programId));setWorkspace(results[0].value)}
    if(results[1].status==='fulfilled')setTemplates(results[1].value.items.filter(t=>t.is_current&&t.status==='ACTIVE'))
    const failures=results.filter(r=>r.status==='rejected');if(failures.length)setError(failures.map(r=>r.status==='rejected'?String(r.reason):'').join('; '))
    setLoading(false)
  }
  useEffect(()=>{void refresh()},[programId,context?.actor.id,section])
  useEffect(()=>{if(target?.requestId&&!loading){setSelected(target.requestId);onTargetHandled?.()}},[target,loading])
  if(!context)return <p className="program-context-empty" role="status">Sign in to load authorized Program workflows.</p>
  if(section==='Activity')return <ProgramActivity context={context} programId={programId} days={days} exportRef={activityExportRef} onOpen={onOpenActivityTarget}/>
  if(section==='Issues')return <ProgramIssues context={context} programId={programId} creating={action==='issue'} onCreateHandled={onActionDone} onChanged={onCreated} initialIssueId={target?.issueId} onTargetHandled={onTargetHandled} onAssessment={id=>{setSelected(id);onOpenAssessment(id)}} onDocuments={onOpenDocuments}/>
  return <>
    {error&&<p className="program-context-empty" role="alert">{error}</p>}{message&&<p className="program-context-empty" role="status">{message}</p>}
    {workspace?.limited&&<p className="program-context-empty" role="status">Showing the latest 100 requests for this Program. Overview totals include all authorized records.</p>}
    {loading&&<p className="program-context-empty" role="status">Loading authorized records…</p>}
    <V1Responses loading={loading} openSchedules={target?.schedules} initialDocumentQueue={target?.queue==='documents'} context={context} programId={programId} requests={requests} activities={workspace?.activities||[]} activitiesLimited={workspace?.activities_limited||false} onOpenAssessment={id=>{setSelected(id);onOpenAssessment(id)}} templates={templates} selected={selected} onSelect={setSelected} section={section==='Documents'?'Documents':'Assessment'} activityExportRef={activityExportRef} onRefresh={refresh} onMessage={setMessage} openDocument={action==='document'} onDocumentHandled={onActionDone}/>
    {action==='assessment'&&<AdoptedAssessmentDialog context={context} programId={programId} templates={templates} onClose={onActionDone} onCreated={async record=>{setSelected(record.id);setMessage('Assessment created for the assigned respondent.');onActionDone();await refresh();onCreated()}}/>}
  </>
}
