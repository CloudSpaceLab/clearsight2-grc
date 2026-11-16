import {useEffect,useState} from 'react'
import {scoped,v1} from './v1Client'
import type {V1Context} from './v1Client'
import type {StarterAdoption} from '../frameworks/starterAdoptionModel'
import {groupHref} from '../frameworks/starterAdoptionModel'

export function ProgramFrameworkSummary({context,programId,revision}:{context:V1Context;programId:string;revision:string}){
 const key=`${context.tenant.id}:${context.legal_entity.id}:${context.actor.id}:${programId}:${revision}`
 const [state,setState]=useState<{key:string;items:StarterAdoption[];error:boolean}>({key:'',items:[],error:false})
 useEffect(()=>{let live=true;v1<{program:{id:string;legal_entity_id:string};framework_adoptions?:StarterAdoption[]}>(scoped(`/api/v1/programs/${programId}`,context)).then(a=>{if(a.program.id!==programId||a.program.legal_entity_id!==context.legal_entity.id)throw Error('Program scope changed');if(live)setState({key,items:(a.framework_adoptions||[]).filter(x=>!!x.template_code),error:false})}).catch(()=>{if(live)setState({key,items:[],error:true})});return()=>{live=false}},[key])
 if(state.key!==key)return <p role="status">Loading framework adoptions…</p>
 if(state.error)return <p role="status">Framework adoption records could not be loaded.</p>
 if(!state.items.length)return <div>Frameworks and forms <strong>No starter adoption saved</strong></div>
 return <div className="program-framework-summary">{state.items.map(a=><details key={a.id}><summary><strong>{a.configuration.requirements[0]?.form_name.replace(/ starter assessment$/,'')||a.template_code}</strong> · {a.status.toLowerCase()}</summary><p>{a.configuration.requirements.length} Program requirements · {a.configuration.respondent_scope_ids.length} respondent units</p>{a.configuration.requirements.map(r=><article key={r.code}><strong>{r.title}</strong><p>{r.decision==='REVIEW'?'Applicability review pending':r.decision==='TAILOR'?'Tailored for this Program':'Default wording'}</p><p>{r.statement}</p><a className="text-link" href={groupHref(r)}>View questions · {r.group_title} · Version {r.form_template_version}</a></article>)}</details>)}</div>
}
