export type ActivationProgram = {
  id:string; tenant_id:string; legal_entity_id:string; version:number; status:string;
  name:string; code:string; scope?:unknown; owning_function:string; jurisdiction?:string;
  owner_principal_id?:string; authority_principal_id?:string; effective_from:string; effective_until?:string|null
}
export type ActivationRequirement = {id:string;program_id?:string;code:string;title:string;status:string}
export type ActivationAggregate = {program:ActivationProgram;requirements:ActivationRequirement[]}
export type ActivationOperations = {
  program_id:string;program_version:number;authority_available:boolean;
  responsible_parties?:{scope:string;responsibility:string;display_name:string}[];
  operations:{command:string;can_act:boolean;reason:string;allowed_targets?:string[];assigned_to?:{display_name:string}}[]
}
export type ActivationSnapshot = {aggregate:ActivationAggregate;operations:ActivationOperations}

export function verifyActivationSnapshot(aggregate:ActivationAggregate,operations:ActivationOperations,expected:{programId:string;tenantId:string;entityId:string}):ActivationSnapshot {
  const p=aggregate?.program
  if(!p||p.id!==expected.programId||p.tenant_id!==expected.tenantId||p.legal_entity_id!==expected.entityId||!Number.isSafeInteger(p.version)||p.version<1||operations?.program_id!==p.id||operations.program_version!==p.version||!Array.isArray(aggregate.requirements)||!Array.isArray(operations.operations)||typeof operations.authority_available!=='boolean'||!['DRAFT','ACTIVE','PAUSED','RETIRED'].includes(p.status)||typeof p.name!=='string'||typeof p.code!=='string'||typeof p.effective_from!=='string')throw Error('Program details or permissions changed while loading. Refresh the Program review.')
  if(aggregate.requirements.some(r=>!r||typeof r.id!=='string'||typeof r.status!=='string'||(r.program_id&&r.program_id!==p.id)))throw Error('The Program requirements could not be verified. Refresh the Program review.')
  return {aggregate,operations}
}
export function activationReadiness(snapshot:ActivationSnapshot,now=Date.now()) {
  const p=snapshot.aggregate.program,approved=snapshot.aggregate.requirements.filter(r=>r.status==='APPROVED')
  return [
    {key:'owner',label:'Accountable Program owner',ready:!!p.owner_principal_id?.trim(),detail:'An accountable owner must be assigned.'},
    {key:'authority',label:'Approval authority',ready:!!p.authority_principal_id?.trim(),detail:'An approval authority must be assigned.'},
    {key:'requirements',label:`Approved requirements: ${approved.length}`,ready:approved.length>0,detail:'Add at least one requirement and complete its independent review before activation.'},
    {key:'period',label:'Program period has not ended',ready:!p.effective_until||Date.parse(p.effective_until)>now,detail:'The Program period has ended or could not be verified.'}
  ]
}
export function activationBlocker(snapshot:ActivationSnapshot,now=Date.now()):string {
  if(!['DRAFT','PAUSED'].includes(snapshot.aggregate.program.status))return snapshot.aggregate.program.status==='ACTIVE'?'This Program is already active.':'This Program cannot be activated from its current status.'
  if(!snapshot.operations.authority_available)return 'Approval authority could not be verified. Refresh or contact your administrator.'
  const operation=snapshot.operations.operations.find(o=>o.command==='program.transition')
  if(!operation?.can_act)return operation?.reason||'Your current Program responsibility does not allow activation.'
  if(!operation.allowed_targets?.includes('ACTIVE'))return 'Activation is not available in the current Program state.'
  return activationReadiness(snapshot,now).find(c=>!c.ready)?.detail||''
}
export function activationCommand(reviewed:ActivationSnapshot,current:ActivationSnapshot,rationale:string,now=Date.now()) {
  if(reviewed.aggregate.program.id!==current.aggregate.program.id||reviewed.aggregate.program.version!==current.aggregate.program.version)throw Error('The Program changed during your review. Close this review and refresh before approving.')
  const blocked=activationBlocker(current,now)
  if(blocked)throw Error(blocked)
  if(!rationale.trim()||rationale.trim().length>2000)throw Error('Enter a review rationale of 1 to 2,000 characters.')
  return {tenant_id:current.aggregate.program.tenant_id,expected_version:current.aggregate.program.version,to:'ACTIVE',rationale:rationale.trim()}
}
export function programScope(scope:unknown):string {
  if(typeof scope==='string')return scope.trim()||'Not recorded'
  if(scope&&typeof scope==='object'&&'description' in scope&&typeof scope.description==='string')return scope.description.trim()||'Not recorded'
  return 'No scope description is available.'
}
export function responsibilityLabel(snapshot:ActivationSnapshot,responsibility:string) {
  return snapshot.operations.responsible_parties?.find(p=>p.scope==='RECORD'&&p.responsibility===responsibility)?.display_name|| (responsibility==='AUTHORIZER'?snapshot.operations.operations.find(o=>o.command==='program.transition')?.assigned_to?.display_name:undefined)||'Name unavailable'
}
