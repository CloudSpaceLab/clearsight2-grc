import { useEffect, useState } from 'react'
import { isProgramRecord } from './programRecord.ts'
import type { ProgramRecord } from './programRecord'

export type ProgramPage =
  | { status: 'loading' }
  | { status: 'ready'; items: ProgramRecord[]; nextCursor: string }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'unavailable' }

const programUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isProgramPage(value: unknown): value is { items: ProgramRecord[]; next_cursor?: string } {
  if (typeof value !== 'object' || value === null) return false
  const page = value as { items?: unknown; next_cursor?: unknown }
  if (!Array.isArray(page.items) || page.items.length > 25) return false
  if (page.next_cursor !== undefined &&
      (typeof page.next_cursor !== 'string' || page.next_cursor.length > 256)) return false
  const ids = new Set<string>()
  return page.items.every(item => {
    if (!item || typeof item !== 'object') return false
    const record = item as Partial<ProgramRecord>
    if (typeof record.id !== 'string' || !programUUID.test(record.id) ||
      !isProgramRecord(item, record.id) || ids.has(record.id)) return false
    ids.add(record.id)
    return true
  })
}

export async function fetchProgramPage(
  cursor: string,
  signal: AbortSignal,
  search = '',
  status = '',
): Promise<ProgramPage> {
  const term = search.trim()
  if (cursor.length > 256 || term.length > 80 ||
      (status !== '' && !['ACTIVE','DRAFT','PAUSED','RETIRED'].includes(status))) {
    return { status: 'unavailable' }
  }
  const params = new URLSearchParams({ limit: '25' })
  if (cursor) params.set('cursor', cursor)
  if (term) params.set('q', term)
  if (status) params.set('status', status)
  try {
    // The authenticated edge determines tenant, entity and department scope.
    const response = await fetch('/api/v1/programs?' + params.toString(), {
      method: 'GET', credentials: 'same-origin', cache: 'no-store',
      headers: { Accept: 'application/json' }, signal,
    })
    if (response.status === 401) return { status: 'unauthenticated' }
    if (response.status === 403) return { status: 'forbidden' }
    if (!response.ok) return { status: 'unavailable' }
    const data: unknown = await response.json()
    if (!isProgramPage(data)) return { status: 'unavailable' }
    return { status: 'ready', items: data.items, nextCursor: data.next_cursor ?? '' }
  } catch {
    return { status: 'unavailable' }
  }
}

type Paging = Readonly<{ key: string; cursor: string; previous: string[] }>
type Loaded = Readonly<{ key: string; cursor: string; generation: number; page: ProgramPage }>

export function useProgramDirectory(enabled: boolean, search = '', status = '') {
  const key = JSON.stringify([search.trim(), status])
  const [paging, setPaging] = useState<Paging>({ key: '', cursor: '', previous: [] })
  const [generation, setGeneration] = useState(0)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const current: Paging = paging.key === key ? paging : { key, cursor: '', previous: [] }
  const page: ProgramPage = enabled && loaded?.key === key &&
    loaded.cursor === current.cursor && loaded.generation === generation
    ? loaded.page : { status: 'loading' }

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    void fetchProgramPage(current.cursor, controller.signal, search, status).then(result => {
      if (!controller.signal.aborted) {
        setLoaded({ key, cursor: current.cursor, generation, page: result })
      }
    })
    return () => controller.abort()
  }, [enabled, key, current.cursor, search, status, generation])

  return {
    page,
    hasPrevious: current.previous.length > 0,
    previous() {
      if (!current.previous.length) return
      setPaging({ key, cursor: current.previous[current.previous.length - 1] ?? '',
        previous: current.previous.slice(0, -1) })
    },
    next() {
      if (page.status !== 'ready' || !page.nextCursor ||
          page.nextCursor === current.cursor) return
      setPaging({ key, cursor: page.nextCursor,
        previous: [...current.previous, current.cursor] })
    },
    retry() { setGeneration(value => value + 1) },
  }
}
