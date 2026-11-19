import type { Matter, MatterAggregate } from './v1Client.ts'

export const issueStates = ['DRAFT','TRIAGE','ASSESSMENT','DECISION_REQUIRED','ACTION_IN_PROGRESS','RESPONSE_PREPARATION','VERIFICATION','CLOSED','CANCELLED'] as const
export const issueStateLabel = (value: string) => ({DRAFT:'Draft',TRIAGE:'Triage',ASSESSMENT:'Assessment',DECISION_REQUIRED:'Decision needed',ACTION_IN_PROGRESS:'Actions in progress',RESPONSE_PREPARATION:'Response preparation',VERIFICATION:'Verification',CLOSED:'Closed',CANCELLED:'Cancelled'}[value] || humanLabel(value))
export function humanLabel(value: string) { return value.replaceAll('_',' ').toLowerCase().replace(/^\w/,c=>c.toUpperCase()) }
export const priorityLabel = (value: number) => `Priority ${value}`
export const issueTone = (value: string) => value==='CLOSED'?'received':value==='CANCELLED'?'closed':['VERIFICATION','DECISION_REQUIRED'].includes(value)?'review':'closed'
export type Principal = {id:string;display_name:string}
export type IssueOperation = {command:string;subresource_id?:string;label:string;can_act:boolean;reason?:string;allowed_targets?:string[];candidates?:Principal[];assigned_to?:Principal}
export type IssueOperations = {matter_id:string;matter_version:number;authority_available:boolean;operations:IssueOperation[];responsible_parties?:{scope:string;subresource_id?:string;responsibility:string;display_name:string}[]}
export type CorrectiveAction = {id:string;title:string;description:string;owner_principal_id?:string;status:string;due_at?:string;implemented_at?:string}
export type OutcomeCheck = {id:string;action_id?:string;expected_outcome:string;status:string;authority_principal_id?:string;observation_period_minutes:number;created_at:string;failure_response:string;baseline?:{description?:string};threshold?:{description?:string}}
export type OutcomeResult = {id:string;contract_id:string;result:string;rationale:string;observations?:{description?:string};evidence_references?:string[];reviewer_principal_id?:string;observed_at:string;created_at:string}
export type IssueRecord = MatterAggregate & {matter:Matter & {type:string;tenant_id:string;legal_entity_id:string;closure_reason?:string;closed_at?:string};status_label?:string;next_action?:string;actions:CorrectiveAction[];verification_contracts:OutcomeCheck[];verification_results:OutcomeResult[];closure:{ready:boolean;reasons:string[]}}
export type IssueActivity = {event_id:string;event_type:string;matter_version:number;actor_id?:string;actor_type:string;occurred_at:string;comment?:{body:string;action_id?:string}}
export type IssueActivityPage = {items:IssueActivity[];next_before_version?:number}
export function isIssueOverdue(matter: Pick<Matter,'status'|'due_at'>, now=Date.now()) { return !['CLOSED','CANCELLED'].includes(matter.status) && !!matter.due_at && Date.parse(matter.due_at)>0 && Date.parse(matter.due_at)<now }
export function issueOwner(record: MatterAggregate, operations: IssueOperations | undefined, actor:{id:string;name:string}) {
  if(!record.matter.owner_principal_id)return 'Unassigned'
  return operations?.responsible_parties?.find(p=>p.scope==='RECORD'&&p.responsibility==='ACCOUNTABLE_OWNER')?.display_name || (record.matter.owner_principal_id===actor.id?actor.name:'Assigned owner')
}
export function filterIssues(items:MatterAggregate[],term:string,status:string,owner:string,actorId:string,now=Date.now()) {
  const query=term.trim().toLowerCase()
  return items.filter(r=>(!status||r.matter.status===status)&&(!owner||(owner==='mine'?r.matter.owner_principal_id===actorId:owner==='unassigned'?!r.matter.owner_principal_id:isIssueOverdue(r.matter,now)))&&`${r.matter.reference} ${r.matter.title} ${r.matter.summary}`.toLowerCase().includes(query))
}
export function verifyIssueScope(record:IssueRecord,programId:string,tenantId:string,entityId:string) {
  if(!record?.matter?.id||record.matter.tenant_id!==tenantId||record.matter.legal_entity_id!==entityId||!Number.isSafeInteger(record.matter.version)||record.matter.version<1||!record.links?.some(l=>l.program_id===programId&&!l.retired_at))throw Error('This issue is no longer available in the selected Program. Refresh the issue list.')
  return record
}
export function issueCommandBase(reviewed:IssueRecord,current:IssueRecord,permissions:IssueOperations,command:string,subresource?:string,target?:string) {
  if(reviewed.matter.id!==current.matter.id||reviewed.matter.version!==current.matter.version||permissions.matter_id!==current.matter.id||permissions.matter_version!==current.matter.version)throw Error('This issue changed. Refresh it before saving; your draft has been kept.')
  if(!permissions.authority_available||!permissions.operations.some(o=>o.command===command&&o.subresource_id===subresource&&o.can_act&&(!target||o.allowed_targets?.includes(target))))throw Error('Your current responsibility does not allow this action. Refresh the issue to check permissions.')
  if(target==='CLOSED'&&!current.closure.ready)throw Error('Closure is blocked. Complete the outstanding actions and outcome checks first.')
  return {tenant_id:current.matter.tenant_id,expected_version:current.matter.version}
}
export function verificationBlocker(record:IssueRecord,check:OutcomeCheck,actorId:string,now=Date.now()) {
  if(check.status!=='ACTIVE')return 'This outcome check is no longer active.'
  const action=record.actions.find(a=>a.id===check.action_id)
  if(check.action_id&&!action)return 'The linked action is unavailable.'
  if(action&&actorId===action.owner_principal_id)return 'A reviewer independent of the action owner must verify this outcome.'
  if(action&&(action.status!=='IMPLEMENTED'||!action.implemented_at))return 'The linked action must be implemented before verification.'
  const anchor=Math.max(Date.parse(check.created_at),Date.parse(action?.implemented_at||check.created_at))
  if(!Number.isFinite(anchor))return 'The observation period could not be confirmed. Refresh the issue.'
  if(now<anchor+check.observation_period_minutes*60000)return 'The observation period has not finished.'
  return ''
}
export function evidenceReferences(value:string) { return [...new Set(value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean))] }
