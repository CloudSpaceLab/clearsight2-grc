import {useEffect,useState} from 'react'
import {scoped,v1} from '../programs/v1Client'
import type {V1Context} from '../programs/v1Client'
import {programScopeDescription} from './programScope'

type ScopeState={programId:string;status:'loading'|'ready'|'error';description?:string|null}

/** Display the selected Program's description, never an inferred organization scope. */
export function ProgramScopeDescription({context,programId}:{context:V1Context;programId:string}) {
 const [state,setState]=useState<ScopeState|null>(null)
 useEffect(()=>{
  if(!programId){setState(null);return}
  let active=true
  setState({programId,status:'loading'})
  v1<{program?:{id?:string;legal_entity_id?:string;scope?:unknown}}>(scoped(`/api/v1/programs/${encodeURIComponent(programId)}`,context)).then(result=>{
   if(result.program?.id!==programId||result.program.legal_entity_id!==context.legal_entity.id)throw Error('Program scope could not be verified.')
   if(active)setState({programId,status:'ready',description:programScopeDescription(result.program.scope)})
  }).catch(()=>{if(active)setState({programId,status:'error'})})
  return()=>{active=false}
 },[programId,context.tenant.id,context.legal_entity.id,context.actor.id])
 if(!programId)return null
 const current=state?.programId===programId?state:null
 const text=!current||current.status==='loading'?'Loading Program scope…':current.status==='error'?'Program scope could not be loaded.':current.description||'No scope description is recorded for this Program.'
 return <div className="framework-program-scope" role="status"><strong>Program scope</strong><p>{text}</p></div>
}
