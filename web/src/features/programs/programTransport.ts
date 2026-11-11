// Read-contract adapter only. v1 remains the authority for identity and scope.
// It never supplies actor headers or makes material commands.
type ObjectRecord = Record<string, unknown>
const object = (value: unknown): ObjectRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid backend record')
  return value as ObjectRecord
}
const list = (value: unknown): ObjectRecord[] => {
  if (!Array.isArray(value)) throw Error('Invalid backend list')
  return value.map(object)
}
export function adaptProgram(aggregate: unknown) {
  const a = object(aggregate), p = object(a.program)
  if (typeof p.id !== 'string' || typeof p.version !== 'number' || p.version < 1) throw Error('Invalid Program identity/version')
  return { id:p.id, name:p.name, code:p.code, status:p.status, program_type:p.type,
    owning_function:p.owning_function, jurisdiction:p.jurisdiction,
    source_revision:`v1:${p.version}:${p.updated_at}`, updated_at:p.updated_at }
}
export function pageSlice<T>(items: T[], cursor: string, limit = 25) {
  const offset = cursor ? Number(cursor) : 0
  if (!Number.isSafeInteger(offset) || offset < 0) throw Error('Invalid cursor')
  return { items:items.slice(offset, offset+limit), ...(offset+limit<items.length?{next_cursor:String(offset+limit)}:{}) }
}
export async function v1ProgramRead(path: string, init: RequestInit = {}, transport: typeof fetch = fetch): Promise<Response> {
  const read = async (url: string) => {
    const response = await transport(url, {...init,method:'GET',credentials:'same-origin',cache:'no-store'})
    if (!response.ok) throw response
    return response.json() as Promise<unknown>
  }
  try {
    const context = object(await read('/api/v1/context')), tenant = object(context.tenant)
    if (typeof tenant.id !== 'string' || !tenant.id) throw Error('Missing verified tenant')
    const scope = (url: string) => `${url}${url.includes('?')?'&':'?'}tenant_id=${encodeURIComponent(tenant.id as string)}`
    const url = new URL(path,'http://local'), match = url.pathname.match(/^\/api\/v1\/programs(?:\/([^/]+))?(?:\/([^/]+))?$/)
    if (!match) throw Error('Unsupported Program read')
    const [,id,kind] = match
    if (!id) {
      const result = object(await read(scope('/api/v1/programs?limit=100')))
      const items = list(result.items).map(adaptProgram).filter(p =>
        (!url.searchParams.get('status') || p.status===url.searchParams.get('status')) &&
        `${p.code} ${p.name}`.toLowerCase().includes((url.searchParams.get('q')||'').toLowerCase()))
      return Response.json(pageSlice(items,url.searchParams.get('cursor')||''))
    }
    const aggregate = object(await read(scope(`/api/v1/programs/${encodeURIComponent(id)}`))), program = adaptProgram(aggregate)
    if (program.id !== id) throw Error('Cross-Program record')
    if (!kind) return Response.json(program)
    const base = {program_id:id, program_revision:program.source_revision}
    if (kind === 'overview') return Response.json({...base,assessment_coverage:null,supported:null,open_gaps:null,evidence_to_review:null})
    if (kind === 'issues') {
      const result = object(await read(scope('/api/v1/matters?limit=100')))
      const items = list(result.items).filter(a => list(a.links||[]).some(l => l.program_id===id && !l.retired_at)).map(a => object(a.matter)).filter(m => !['CLOSED','CANCELLED'].includes(String(m.status))).map(m => ({id:m.id,reference:m.reference,title:m.title,type:m.type,status:m.status,priority:m.priority,updated_at:m.updated_at}))
      return Response.json({...base,...pageSlice(items,url.searchParams.get('cursor')||'')})
    }
    if (kind === 'requirements') {
      const items = list(aggregate.requirements||[]).filter(r=>r.status==='APPROVED').map(r=>({id:r.id,code:r.code,title:r.title,version:r.version,effective_from:r.effective_from}))
      return Response.json({...base,...pageSlice(items,url.searchParams.get('cursor')||'')})
    }
    // Inventory semantics differ; fail explicitly rather than invent lifecycle mappings.
    return Response.json({message:'Inventory adapter unavailable'}, {status:503})
  } catch (error) {
    if (error instanceof Response) return error
    return Response.json({message:'Program adapter unavailable'},{status:503})
  }
}
export function programFetch(path: string, init?: RequestInit) {
  return import.meta.env?.VITE_PROGRAM_BACKEND === 'v1' ? v1ProgramRead(path,init) : fetch(path,init)
}
