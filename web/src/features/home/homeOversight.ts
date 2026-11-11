export type OversightMetric = { id:string; label:string; value:number; unit:string; freshness:string; completeness:string; population:number; excluded:number; unknown:number; generated_at:string }
export type MetricSnapshot = { scope_id:string; scope_kind:string; source_id?:string; definition_revision?:string; items:OversightMetric[]; reporting_period?:{start_date:string;end_date:string} }
export type RiskBreakdown = {source_id:string;metric_id:string;definition_revision:string;count:number;items:{key:string;label:string;value:number}[]}
export type VendorPage = {items:{relationship:{id:string;tenant_id:string;legal_entity_id:string;status:string}}[];next_cursor?:string}
export function validVendorPage(value:unknown,tenant:string,entity:string):value is VendorPage {
 if(!value||typeof value!=='object')return false
 const p=value as VendorPage
 const statuses=['PROPOSED','UNDER_REVIEW','ACTIVE','RESTRICTED','SUSPENDED','EXITING','TERMINATED']
 // The authenticated v1 endpoint scopes by tenant before returning rows, but
 // its PostgreSQL projection can serialize the tenant as a slug rather than UUID.
 const ids=Array.isArray(p.items)?new Set(p.items.map(item=>item?.relationship?.tenant_id)):new Set()
 const isUuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
 return Array.isArray(p.items)&&p.items.length<=100&&ids.size<=1&&(p.next_cursor===undefined||typeof p.next_cursor==='string')&&p.items.every(item=>!!item?.relationship&&typeof item.relationship.id==='string'&&typeof item.relationship.tenant_id==='string'&&!!item.relationship.tenant_id&&(!isUuid(item.relationship.tenant_id)||item.relationship.tenant_id===tenant)&&item.relationship.legal_entity_id===entity&&statuses.includes(item.relationship.status))
}
type Money = {minor_units:string;currency:string}
type LossCurrency = {currency:string;gross:Money;recovery:Money;net:Money}
export type LossSnapshot = {scope_id:string;scope_kind:string;period_start:string;period_end:string;event_count:number;mixed_currencies:boolean;currencies:LossCurrency[];flow_points:{start:string;end:string;currencies:LossCurrency[]}[]}
export type Intervention = {target_type:string;target_id:string;title:string;category:string;state:string;priority:number;owner_id?:string;due_at?:string;reason:string;next_action:string}
export type OversightSnapshot = {generated_at:string;freshness:string;coverage:{population:number;excluded:number;unknown:number};interventions:Intervention[];pressure:{category:string;critical:number;high:number;other:number;overdue:number}[]}
const natural=(n:unknown):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0
export function validMetricSnapshot(value:unknown,entity:string):value is MetricSnapshot {
 if(!value||typeof value!=='object')return false
 const p=value as MetricSnapshot
 return p.scope_kind==='LEGAL_ENTITY'&&p.scope_id===entity&&Array.isArray(p.items)&&p.items.length<=100&&p.items.every(m=>typeof m.id==='string'&&typeof m.label==='string'&&natural(m.value)&&m.unit==='COUNT'&&typeof m.freshness==='string'&&typeof m.completeness==='string'&&natural(m.population)&&natural(m.excluded)&&natural(m.unknown)&&Number.isFinite(Date.parse(m.generated_at)))
}
export function validOversightSnapshot(value:unknown):value is OversightSnapshot {
 if(!value||typeof value!=='object')return false
 const p=value as OversightSnapshot
 return Number.isFinite(Date.parse(p.generated_at))&&typeof p.freshness==='string'&&!!p.coverage&&natural(p.coverage.population)&&natural(p.coverage.excluded)&&natural(p.coverage.unknown)&&Array.isArray(p.interventions)&&p.interventions.length<=500&&p.interventions.every(i=>typeof i.target_id==='string'&&typeof i.title==='string'&&typeof i.reason==='string'&&typeof i.next_action==='string')&&Array.isArray(p.pressure)&&p.pressure.length<=100&&p.pressure.every(i=>typeof i.category==='string'&&natural(i.critical)&&natural(i.high)&&natural(i.other)&&natural(i.overdue))
}
export function validLossSnapshot(value:unknown,entity:string):value is LossSnapshot {
 if(!value||typeof value!=='object')return false
 const p=value as LossSnapshot
 const validCurrency=(c:LossCurrency)=>typeof c.currency==='string'&&/^[A-Z]{3}$/.test(c.currency)&&[c.gross,c.recovery,c.net].every(m=>!!m&&m.currency===c.currency&&typeof m.minor_units==='string'&&/^-?\d+$/.test(m.minor_units))
 return p.scope_kind==='LEGAL_ENTITY'&&p.scope_id===entity&&Number.isFinite(Date.parse(p.period_start))&&Number.isFinite(Date.parse(p.period_end))&&natural(p.event_count)&&typeof p.mixed_currencies==='boolean'&&Array.isArray(p.currencies)&&p.currencies.length<=100&&p.currencies.every(validCurrency)&&Array.isArray(p.flow_points)&&p.flow_points.length<=370&&p.flow_points.every(point=>Number.isFinite(Date.parse(point.start))&&Number.isFinite(Date.parse(point.end))&&Array.isArray(point.currencies)&&point.currencies.length<=100&&point.currencies.every(validCurrency))
}
export function validRiskBreakdown(value:unknown,source:string,revision:string,expected:number):value is RiskBreakdown {
 if(!value||typeof value!=='object')return false
 const p=value as RiskBreakdown
 return p.source_id===source&&p.definition_revision===revision&&p.metric_id==='risks_outside_appetite'&&p.count===expected&&Array.isArray(p.items)&&p.items.length<=200&&p.items.every(i=>typeof i.key==='string'&&typeof i.label==='string'&&natural(i.value))&&p.items.reduce((sum,i)=>sum+i.value,0)===expected
}
export function formatMinorUnits(minor:string,currency:string):string {
 try { const units=BigInt(minor); const digits=new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits ?? 2; const power=BigInt(10)**BigInt(digits); const sign=units<0n?'-':''; const absolute=units<0n?-units:units; return `${sign}${currency} ${absolute/power}${digits?'.'+String(absolute%power).padStart(digits,'0'):''}` } catch { return `${currency} ${minor} minor units` }
}
