import { useEffect, useState } from 'react'

export type ProgramRecord = Readonly<{
  id: string
  name: string
  source_revision: string
  updated_at: string
}>

export type ProgramRead =
  | { status: 'unselected' }
  | { status: 'loading' }
  | { status: 'ready'; record: ProgramRecord }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'unavailable' }

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function readProgramId(search: string): string | null {
  const params = new URLSearchParams(search)
  if (params.get('screen') !== 'programs' || params.getAll('program').length !== 1) return null
  const id = params.get('program')
  return id && uuidPattern.test(id) ? id : null
}

export function isProgramRecord(value: unknown, requestedId: string): value is ProgramRecord {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<ProgramRecord>
  return entry.id === requestedId &&
    typeof entry.name === 'string' && entry.name.trim().length > 0 &&
    typeof entry.source_revision === 'string' && entry.source_revision.trim().length > 0 &&
    typeof entry.updated_at === 'string' && Number.isFinite(Date.parse(entry.updated_at))
}

export async function fetchProgram(id: string, signal: AbortSignal): Promise<ProgramRead> {
  if (!uuidPattern.test(id)) return { status: 'not_found' }
  try {
    // The browser never sends identity envelopes or authorization grants.
    // A trusted same-origin edge handles authentication, session and signature.
    const response = await fetch(`/api/v1/programs/${encodeURIComponent(id)}`, {
      method: 'GET', credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      cache: 'no-store', signal,
    })
    if (response.status === 401) return { status: 'unauthenticated' }
    if (response.status === 403) return { status: 'forbidden' }
    if (response.status === 404) return { status: 'not_found' }
    if (!response.ok) return { status: 'unavailable' }
    const data: unknown = await response.json()
    return isProgramRecord(data, id) ? { status: 'ready', record: data } : { status: 'unavailable' }
  } catch {
    return { status: 'unavailable' }
  }
}

export function useProgramRecord(id: string | null): [ProgramRead, () => void] {
  const [refresh, setRefresh] = useState(0)
  const [read, setRead] = useState<ProgramRead>({ status: 'unselected' })
  useEffect(() => {
    if (!id) {
      setRead({ status: 'unselected' })
      return
    }
    const controller = new AbortController()
    setRead({ status: 'loading' })
    void fetchProgram(id, controller.signal).then(value => {
      if (!controller.signal.aborted) setRead(value)
    })
    return () => controller.abort()
  }, [id, refresh])
  return [read, () => setRefresh(value => value + 1)]
}
