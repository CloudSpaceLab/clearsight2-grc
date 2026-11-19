import {useEffect,useState} from 'react'
import {Icon} from '../../shared/Icons'
import {scoped,v1} from './v1Client'
import type {V1Context} from './v1Client'
import type {StarterAdoption} from '../frameworks/starterAdoptionModel'
import {groupHref} from '../frameworks/starterAdoptionModel'
import {RecordDialog} from './RecordDialog'

export function ProgramFrameworkSummary({context,programId,revision}:{context:V1Context;programId:string;revision:string}){
 const key=`${context.tenant.id}:${context.legal_entity.id}:${context.actor.id}:${programId}:${revision}`
 const [state,setState]=useState<{key:string;items:StarterAdoption[];error:boolean}>({key:'',items:[],error:false})
 const [selected,setSelected]=useState<string|null>(null)
 useEffect(()=>setSelected(null),[key])
 useEffect(()=>{let live=true;v1<{program:{id:string;legal_entity_id:string};framework_adoptions?:StarterAdoption[]}>(scoped(`/api/v1/programs/${programId}`,context)).then(a=>{if(a.program.id!==programId||a.program.legal_entity_id!==context.legal_entity.id)throw Error('Program scope changed');if(live)setState({key,items:(a.framework_adoptions||[]).filter(x=>!!x.template_code),error:false})}).catch(()=>{if(live)setState({key,items:[],error:true})});return()=>{live=false}},[key])
 if(state.key!==key)return <p role="status">Loading framework adoptions…</p>
 if(state.error)return <p role="status">Framework adoption records could not be loaded.</p>
 if(!state.items.length)return <div>Frameworks and forms <strong>No starter adoption saved</strong></div>
 const adoption=state.items.find(a=>a.id===selected)
 return <div className="program-framework-summary">{state.items.map(a=><div key={a.id}>
   <div className="context-row"><span className="context-icon"><Icon name="layers"/></span><div><strong>{a.configuration.requirements[0]?.form_name.replace(/ starter assessment$/,'')||a.template_code}</strong>
   <small>Framework · {a.status.toLowerCase()} adoption</small></div></div>
   {[...new Map(a.configuration.requirements.map(r=>[r.form_template_id,r])).values()].map(r=><div className="context-row" key={r.form_template_id}><span className="context-icon"><Icon name="form"/></span><div><a className="text-link" href={groupHref(r)}>{r.form_name}</a><small>Form · Version {r.form_template_version} · {r.form_status.toLowerCase()}</small></div></div>)}
   <button type="button" className="applicability-launch" onClick={()=>setSelected(a.id)} aria-haspopup="dialog"><span className="applicability-launch-icon"><Icon name="shield"/></span><span><strong>Source &amp; applicability</strong><small>{a.configuration.requirements.length} requirements · {a.configuration.respondent_scope_ids.length} respondent units</small></span><Icon name="next"/></button>
 </div>)}{adoption&&<RecordDialog title="Source & applicability" onClose={()=>setSelected(null)}>
   <div className="applicability-review">
     <div className="applicability-overview"><span className="context-icon"><Icon name="layers"/></span><div><strong>{adoption.configuration.requirements[0]?.form_name.replace(/ starter assessment$/,'')||adoption.template_code}</strong><p>{adoption.configuration.requirements.length} Program requirements · {adoption.configuration.respondent_scope_ids.length} respondent units</p></div><span className="pill closed">{adoption.status.charAt(0)+adoption.status.slice(1).toLowerCase()}</span></div>
     <p className="applicability-intro">Review the adopted wording and open the linked questions for each requirement.</p>
     <div className="applicability-requirements">{adoption.configuration.requirements.map((r,i)=><article className="applicability-requirement" key={r.code}>
       <div className="applicability-requirement-heading"><span className="applicability-number">{String(i+1).padStart(2,'0')}</span><div><h3>{r.title}</h3><span className={`applicability-status ${r.decision.toLowerCase()}`}>{r.decision==='REVIEW'?'Review pending':r.decision==='TAILOR'?'Tailored wording':'Default wording'}</span></div></div>
       <p className="applicability-statement">{r.statement}</p>
       {r.reference&&<p className="applicability-reference"><span>Source reference</span><strong>{r.reference}</strong></p>}
       {r.reason&&<div className="applicability-reason"><strong>Reason for decision</strong><p>{r.reason}</p></div>}
       <a className="applicability-question-link" href={groupHref(r)}><span><strong>View questions</strong><small>{r.group_title} · Version {r.form_template_version}</small></span><Icon name="next"/></a>
     </article>)}</div>
     <p className="applicability-footnote">Adoption and wording decisions do not establish compliance.</p>
   </div>
 </RecordDialog>}</div>
}
