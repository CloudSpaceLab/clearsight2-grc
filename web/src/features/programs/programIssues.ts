import { useEffect, useState } from 'react'

export type ProgramIssue = Readonly<{
  id: string
  reference: string
  title: string
  type: string
  status: string
  priority: number
  updated_at: string
}>

export type ProgramIssuePage = Readonly<{
  program_id: string
  program_revision: string
  items: ProgramIssue[]
  next_cursor?: string
}>

export type IssueRead =
  | { status: 'loading' }
  | { status: 'ready'; page: ProgramIssuePage }
  | { status: 'unauthenticated' | 'forbidden' | 'not_found' | 'changed' | 'unavailable' }

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function validIssuePage(body: unknown,id: string): body is ProgramIssuePage {
 if (!body || typeof body !== 'object') return false
 const page=body as Partial<ProgramIssuePage>
 if(page.program_id!==id||!page.program_revision?.trim()||
    !Array.isArray(page.items)||page.items.length>25||
    (page.next_cursor!==undefined&&(typeof page.next_cursor!=='string'||page.next_cursor.length>256)))return false
 const seen=new Set<string>()
 return page.items.every((item: unknown)=>{
  if(!item||typeof item!=='object')return false
  const r=item as Partial<ProgramIssue>
  if(typeof r.id!=='string'||!uuid.test(r.id)||seen.has(r.id)||
     typeof r.reference!=='string'||!r.reference.trim()||
     typeof r.title!=='string'||!r.title.trim()||
     typeof r.type!=='string'||!r.type.trim()||
     typeof r.status!=='string'||!r.status.trim()||
     r.status==='CLOSED'||r.status==='CANCELLED'||
     typeof r.priority!=='number'||!Number.isInteger(r.priority)||
     r.priority<1||r.priority>5||
     typeof r.updated_at!=='string'||!Number.isFinite(Date.parse(r.updated_at)))return false
  seen.add(r.id);return true
 })
}

export async function fetchProgramIssues(
 id: string,revision: string,cursor: string,signal: AbortSignal,
):Promise<IssueRead>{
 if(!uuid.test(id)||!revision||cursor.length>256)return {status:'unavailable'}
 const q=new URLSearchParams({limit:'25'})
 if(cursor)q.set('cursor',cursor)
 try{
  const r=await fetch(`/api/v1/programs/${id}/issues?${q}`,{
   method:'GET',credentials:'same-origin',cache:'no-store',
   headers:{Accept:'application/json'},signal,
  })
  if(r.status===401)return {status:'unauthenticated'}
  if(r.status===403)return {status:'forbidden'}
  if(r.status===404)return {status:'not_found'}
  if(!r.ok)return {status:'unavailable'}
  const data:unknown=await r.json()
  if(!validIssuePage(data,id))return {status:'unavailable'}
  if(data.program_revision!==revision)return {status:'changed'}
  return {status:'ready',page:data}
 }catch{return {status:'unavailable'}}
}

type PagePosition=Readonly<{key:string;cursor:string;previous:string[]}>
type Loaded=Readonly<{key:string;cursor:string;generation:number;result:IssueRead}>
export function useProgramIssues(id:string|null,revision:string|null,enabled:boolean){
 const key=id&&revision?`${id}:${revision}`:''
 const [paging,setPaging]=useState<PagePosition>({key:'',cursor:'',previous:[]})
 const [generation,setGeneration]=useState(0)
 const [loaded,setLoaded]=useState<Loaded|null>(null)
 const current=paging.key===key?paging:{key,cursor:'',previous:[]}
 const result:IssueRead=enabled&&loaded?.key===key&&
  loaded.cursor===current.cursor&&loaded.generation===generation
  ?loaded.result:{status:'loading'}
 useEffect(()=>{
  if(!enabled||!id||!revision)return
  const controller=new AbortController()
  void fetchProgramIssues(id,revision,current.cursor,controller.signal).then(next=>{
   if(!controller.signal.aborted)setLoaded({key,cursor:current.cursor,generation,result:next})
  })
  return ()=>controller.abort()
 },[id,revision,enabled,key,current.cursor,generation])
 return {
  result,
  hasPrevious:current.previous.length>0,
  next(){
   if(result.status!=='ready'||!result.page.next_cursor||
     result.page.next_cursor===current.cursor)return
   setPaging({key,cursor:result.page.next_cursor,previous:[...current.previous,current.cursor]})
  },
  previous(){
   if(!current.previous.length)return
   setPaging({key,cursor:current.previous[current.previous.length-1]??'',
    previous:current.previous.slice(0,-1)})
  },
  retry(){setGeneration(v=>v+1)},
 }
}
