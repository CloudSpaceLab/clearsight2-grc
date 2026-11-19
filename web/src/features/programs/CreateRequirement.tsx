import {useEffect,useState} from 'react'
import {RecordDialog} from './RecordDialog'
import {command,scoped,v1} from './v1Client'
import type {V1Context} from './v1Client'

type ProgramResponse={program:{id:string;version:number;legal_entity_id:string}}
type Operations={program_id:string;program_version:number;operations:{command:string;can_act:boolean;reason:string}[]}
export function CreateRequirement({context,programId,onCreated}:{context:V1Context;programId:string;onCreated:()=>void}){
 const [open,setOpen]=useState(false),[op,setOp]=useState<{can_act:boolean;reason:string}|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('')
 useEffect(()=>{let live=true;setOp(null);setError('');void v1<Operations>(scoped(`/api/v1/programs/${encodeURIComponent(programId)}/operations`,context)).then(r=>{if(r.program_id!==programId)throw Error('Program permissions could not be verified.');if(live){const add=r.operations.find(x=>x.command==='program.requirement.add'),review=r.operations.find(x=>x.command==='program.requirement.review.propose');setOp(!review?{can_act:false,reason:'Requirement review is not available on this backend.'}:add||{can_act:false,reason:'Adding requirements is unavailable.'})}}).catch(e=>{if(live)setError(e instanceof Error?e.message:'Program permissions unavailable.')});return()=>{live=false}},[context,programId])
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);setError('');try{
 const path=`/api/v1/programs/${encodeURIComponent(programId)}`
 const [current,permissions]=await Promise.all([v1<ProgramResponse>(scoped(path,context)),v1<Operations>(scoped(`${path}/operations`,context))])
 if(current.program.id!==programId||current.program.legal_entity_id!==context.legal_entity.id||permissions.program_id!==programId||permissions.program_version!==current.program.version||!permissions.operations.find(o=>o.command==='program.requirement.add')?.can_act||!permissions.operations.some(o=>o.command==='program.requirement.review.propose'))throw Error('The Program or your permission changed. Reload and try again.')
 const result=await command<ProgramResponse>(scoped(`${path}/requirements`,context),{tenant_id:context.tenant.id,expected_version:current.program.version,code:String(data.get('code')||'').trim(),title:String(data.get('title')||'').trim(),statement:String(data.get('statement')||'').trim(),modality:'MUST',status:'DRAFT'})
 if(result.program?.id!==programId)throw Error('The saved Program could not be verified. Reload before retrying.')
 setOpen(false);setNotice('Draft requirement added. Send it for independent review below.');onCreated()
 }catch(e){setError(e instanceof Error?e.message:'Unable to add requirement.')}finally{setBusy(false)}}
 return <><button type="button" className="button" disabled={!op?.can_act} title={op?.reason||'Checking your permission'} onClick={()=>{setNotice('');setOpen(true)}}>Add requirement</button>{error&&!open&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}{open&&<RecordDialog title="Add requirement" onClose={()=>{if(!busy)setOpen(false)}}><form onSubmit={submit}>
 <p>Create a draft requirement. Send it for independent review before using it in a framework link.</p>
 <label className="program-field">Code<input name="code" required maxLength={80}/></label><label className="program-field">Title<input name="title" required maxLength={200}/></label><label className="program-field">Requirement<textarea name="statement" required maxLength={2000} rows={4}/></label>
 {error&&<p role="alert">{error}</p>}<div className="program-dialog-actions"><button className="button" type="button" disabled={busy} onClick={()=>setOpen(false)}>Cancel</button><button className="button primary" disabled={busy} type="submit">{busy?'Saving…':'Add requirement'}</button></div></form></RecordDialog>}</>
}
