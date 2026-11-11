import { useEffect, useState } from 'react'
import { RecordDialog } from './RecordDialog'
import { command, scoped, v1 } from './v1Client'
import type { V1Context } from './v1Client'

type Candidate = {id:string;display_name:string;role?:string}
type Candidates = {owner_candidates:Candidate[];approval_authority_candidates:Candidate[];has_more:boolean}
export function CreateProgramDialog({context,onClose,onCreated}:{context:V1Context;onClose:()=>void;onCreated:(id:string)=>void}) {
  const [candidates,setCandidates]=useState<Candidates|null>(null)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  useEffect(()=>{let active=true;void v1<Candidates>(scoped('/api/v1/programs/setup-candidates',context)).then(result=>{if(active)setCandidates(result)}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Program responsibilities are unavailable.')});return()=>{active=false}},[context])
  return <RecordDialog title="New Program" onClose={onClose}><form onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);setError('');void command<{program:{id:string}}>(scoped('/api/v1/programs',context),{tenant_id:context.tenant.id,legal_entity_id:context.legal_entity.id,code:data.get('code'),name:data.get('name'),type:data.get('type'),owning_function:data.get('function'),jurisdiction:data.get('jurisdiction'),owner_candidate_id:data.get('owner'),approval_authority_candidate_id:data.get('approver'),scope:{description:data.get('scope')},effective_from:`${data.get('start')}T00:00:00Z`}).then(result=>{if(!result.program?.id)throw Error('The service did not return the created Program.');onCreated(result.program.id)}).catch(e=>setError(e instanceof Error?e.message:'Program creation failed.')).finally(()=>setBusy(false))}}>
    <p>Create a draft Program with its responsible owner and approval authority.</p>
    <label className="program-field">Program name<input name="name" required maxLength={200}/></label>
    <div className="program-dialog-grid"><label className="program-field">Code<input name="code" required maxLength={80}/></label><label className="program-field">Type<select name="type"><option value="COMPLIANCE">Compliance</option><option value="RISK">Risk</option></select></label></div>
    <label className="program-field">Owning function<input name="function" required maxLength={120}/></label><label className="program-field">Scope<textarea name="scope" rows={3} required maxLength={2000}/></label>
    <div className="program-dialog-grid"><label className="program-field">Jurisdiction<input name="jurisdiction" maxLength={120}/></label><label className="program-field">Effective from<input name="start" type="date" required/></label><label className="program-field">Owner<select name="owner" required disabled={!candidates}><option value="">Choose an owner</option>{candidates?.owner_candidates.map(c=><option key={c.id} value={c.id}>{c.display_name}</option>)}</select></label><label className="program-field">Approval authority<select name="approver" required disabled={!candidates}><option value="">Choose an approver</option>{candidates?.approval_authority_candidates.map(c=><option key={c.id} value={c.id}>{c.display_name}</option>)}</select></label></div>
    {candidates?.has_more&&<p>Some candidates are not shown. Refine access through your administrator.</p>}{error&&<p role="alert">{error}</p>}
    <div className="program-dialog-actions"><button type="button" className="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy||!candidates||!candidates.owner_candidates.length||!candidates.approval_authority_candidates.length}>Create Program</button></div>
  </form></RecordDialog>
}
