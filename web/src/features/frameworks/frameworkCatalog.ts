export type Edition = {id:string;title:string;publisher_code:string;framework_code:string;edition_code:string;jurisdiction:string;source_url:string;source_published_on:string;effective_on?:string;license_basis:string}
export type ReferenceArea={code:string;title:string;assessment_prompt:string;evidence_examples:string}
export type ReferenceTemplate={code:string;title:string;description:string;publisher:string;edition:string;jurisdiction:string;topic:string;purpose:string;applicability_prompt:string;official_source:string;source_note:string;review_status:'REVIEW_REQUIRED';areas:ReferenceArea[]}
export function parseReferenceTemplates(value:unknown):ReferenceTemplate[]{
 if(!value||typeof value!=='object'||!Array.isArray((value as {items?:unknown}).items))throw Error('Invalid framework template response')
 const items=(value as {items:unknown[]}).items
 const strings=(item:Record<string,unknown>,fields:string[])=>fields.every(key=>typeof item[key]==='string'&&!!(item[key] as string).trim())
 if(!items.every(item=>{if(!item||typeof item!=='object')return false;const t=item as Record<string,unknown>;return strings(t,['code','title','description','publisher','jurisdiction','topic','purpose','applicability_prompt','official_source','source_note'])&&typeof t.edition==='string'&&t.review_status==='REVIEW_REQUIRED'&&Array.isArray(t.areas)&&t.areas.every(area=>!!area&&typeof area==='object'&&strings(area as Record<string,unknown>,['code','title','assessment_prompt','evidence_examples']))}))throw Error('Invalid framework template')
 return items as ReferenceTemplate[]
}
export function parseEditions(value:unknown):Edition[]{
 if(!value||typeof value!=='object'||!Array.isArray((value as {items?:unknown}).items))throw Error('Invalid framework catalog response')
 const items=(value as {items:unknown[]}).items
 if(!items.every(item=>{if(!item||typeof item!=='object')return false;const e=item as Record<string,unknown>;return ['id','title','publisher_code','framework_code','edition_code','jurisdiction','source_url','source_published_on','license_basis'].every(k=>typeof e[k]==='string'&&!!(e[k] as string).trim())&&(e.effective_on===undefined||typeof e.effective_on==='string')}))throw Error('Invalid framework edition')
 return items as Edition[]
}
export function safeSource(value:string):string|null {try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null}catch{return null}}


export type FrameworkProgramUsage = {template_code?:string;edition_id?:string;active_program_count:number}
export function parseFrameworkProgramUsage(value:unknown):FrameworkProgramUsage[] {
 if(!value||typeof value!=='object'||!Array.isArray((value as {items?:unknown}).items))throw Error('Invalid framework Program counts')
 const items=(value as {items:FrameworkProgramUsage[]}).items
 const keys=new Set<string>()
 for(const item of items){
  if(!item||typeof item!=='object'||!Number.isSafeInteger(item.active_program_count)||item.active_program_count<1)throw Error('Invalid framework Program count')
  if(item.template_code!==undefined&&(typeof item.template_code!=='string'||!item.template_code.trim()))throw Error('Invalid framework template identity')
  if(item.edition_id!==undefined&&(typeof item.edition_id!=='string'||!item.edition_id.trim()))throw Error('Invalid framework edition identity')
  const template=typeof item.template_code==='string'&&item.template_code.trim()
  const edition=typeof item.edition_id==='string'&&item.edition_id.trim()
  if(!!template===!!edition)throw Error('Invalid framework Program identity')
  const key=template?`template:${template}`:`edition:${edition}`
  if(keys.has(key))throw Error('Duplicate framework Program count')
  keys.add(key)
 }
 return items
}
export function frameworkUsageLabel(count:number|undefined) {
 if(count===undefined)return 'Usage unavailable'
 if(count===0)return 'Available'
 return `In ${count} Program${count===1?'':'s'}`
}
