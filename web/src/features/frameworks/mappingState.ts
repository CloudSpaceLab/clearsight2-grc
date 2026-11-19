export type LinkRecord={clause_id:string;requirement_id:string;status:string}
export type LinkState='linked'|'pending'|'unknown'|'review'
export function linkState(clauseId:string,mappings:LinkRecord[],hasMoreMappings:boolean):LinkState {
 const records=mappings.filter(m=>m.clause_id===clauseId)
 if(records.some(m=>m.status==='APPROVED'))return 'linked'
 if(records.some(m=>m.status==='PENDING'))return 'pending'
 return hasMoreMappings?'unknown':'review'
}

export type RequirementAvailability={status:string;effective_from?:string;effective_until?:string|null}
export function isCurrentApprovedRequirement(value:RequirementAvailability,at:number):boolean {
 const start=value.effective_from?Date.parse(value.effective_from):NaN
 const end=value.effective_until?Date.parse(value.effective_until):null
 return value.status==='APPROVED'&&Number.isFinite(start)&&start<=at&&(end===null||(Number.isFinite(end)&&at<end))
}
