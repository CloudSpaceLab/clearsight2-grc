export type FormRequestSummary = {counts:Record<'DRAFT'|'OPEN'|'READY'|'SUBMITTED'|'EXPIRED',number>; other:number; limited:boolean}
export function summarizeVisibleFormRequests(value:unknown):FormRequestSummary|null {
  if(!value||typeof value!=='object')return null
  const items=(value as {items?:unknown}).items
  if(!Array.isArray(items)||items.length>100)return null
  const counts={DRAFT:0,OPEN:0,READY:0,SUBMITTED:0,EXPIRED:0}
  let other=0
  for(const item of items){
    if(!item||typeof item!=='object'||typeof item.status!=='string')return null
    if(item.form_template_id!==undefined&&typeof item.form_template_id!=='string')return null
    if(!item.form_template_id)continue
    const status:string=item.status
    if(status==='DRAFT'||status==='OPEN'||status==='READY'||status==='SUBMITTED'||status==='EXPIRED')counts[status]++
    else other++
  }
  return {counts,other,limited:items.length===100}
}
