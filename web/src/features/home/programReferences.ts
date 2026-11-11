export type ProgramReferenceSummary = {programs:number;approvedRequirements:number;limited:boolean;asOf:string}
export function summarizeProgramReferences(value:unknown,tenant:string,entity:string):ProgramReferenceSummary|null {
  if(!value||typeof value!=='object')return null
  const page=value as {items?:unknown;generated_at?:unknown}
  if(!Array.isArray(page.items)||page.items.length>100||typeof page.generated_at!=='string'||!Number.isFinite(Date.parse(page.generated_at)))return null
  const at=Date.parse(page.generated_at),programs=new Set<string>(),requirements=new Set<string>()
  for(const raw of page.items){
    if(!raw||typeof raw!=='object')return null
    const item=raw as {program?:{id?:unknown;tenant_id?:unknown;legal_entity_id?:unknown};requirements?:unknown}
    const program=item.program
    if(!program||typeof program.id!=='string'||!program.id||programs.has(program.id)||program.tenant_id!==tenant||program.legal_entity_id!==entity||!Array.isArray(item.requirements))return null
    programs.add(program.id)
    for(const row of item.requirements){
      if(!row||typeof row!=='object'||typeof row.id!=='string'||row.program_id!==program.id||typeof row.status!=='string'||typeof row.effective_from!=='string'||!Number.isFinite(Date.parse(row.effective_from))||(row.effective_until!=null&&(typeof row.effective_until!=='string'||!Number.isFinite(Date.parse(row.effective_until)))))return null
      if(row.status==='APPROVED'&&Date.parse(row.effective_from)<=at&&(row.effective_until==null||at<Date.parse(row.effective_until))){if(requirements.has(row.id))return null;requirements.add(row.id)}
    }
  }
  return {programs:programs.size,approvedRequirements:requirements.size,limited:page.items.length===100,asOf:page.generated_at}
}
