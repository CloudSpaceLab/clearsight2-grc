import { useEffect, useState } from 'react'
import { isProgramRecord } from './programRecord'
import type { ProgramRecord } from './programRecord'

export type ProgramPage =
  | { status: 'loading' }
  | { status: 'ready'; items: ProgramRecord[]; nextCursor: string }
  | { status: 'unauthenticated' | 'forbidden' | 'unavailable' }

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

export async function fetchProgramPage(cursor: string, signal: AbortSignal): Promise<ProgramPage> {
  if (cursor.length > 256) return { status: 'unavailable' }
  const params = new URLSearchParams({ limit: '25' })
  if (cursor) params.set('cursor', cursor)
  try {
    // Authentication is supplied by the trusted same-origin session edge.
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

export function useProgramDirectory(enabled: boolean) {
  const [cursor, setCursor] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [generation, setGeneration] = useState(0)
  const [page, setPage] = useState<ProgramPage>({ status: 'loading' })

  useEffect(() => {
    if (!enabled) {
      setCursor('')
      setHistory([])
      setPage({ status: 'loading' })
      return
    }
    const controller = new AbortController()
    setPage({ status: 'loading' })
    void fetchProgramPage(cursor, controller.signal).then(result => {
      if (!controller.signal.aborted) setPage(result)
    })
    return () => controller.abort()
  }, [enabled, cursor, generation])

  return {
    page: enabled ? page : ({ status: 'loading' } as const),
    hasPrevious: history.length > 0,
    previous() {
      if (history.length === 0) return
      setPage({ status: 'loading' })
      setCursor(history[history.length - 1] ?? '')
      setHistory(paths => paths.slice(0, -1))
    },
    next() {
      if (page.status !== 'ready' || !page.nextCursor || page.nextCursor === cursor) return
      setPage({ status: 'loading' })
      setHistory(paths => [...paths, cursor])
      setCursor(page.nextCursor)
    },
    retry() { setGeneration(value => value + 1) },
  }
}
