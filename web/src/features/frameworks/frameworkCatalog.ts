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
