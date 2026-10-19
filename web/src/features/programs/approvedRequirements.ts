import { useEffect, useState } from 'react'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const limit = 25

export type ApprovedRequirement = Readonly<{
  id: string
  code: string
  title: string
  version: number
  effective_from: string
}>

type RequirementsPage = Readonly<{
  program_id: string
  program_revision: string
  items: ApprovedRequirement[]
  next_cursor?: string
}>

export type RequirementsState =
  | { status: 'loading' }
  | { status: 'ready'; page: RequirementsPage }
  | { status: 'unauthenticated' | 'forbidden' | 'not_found' | 'unavailable' | 'changed' }

function isRequirementsPage(value: unknown, id: string): value is RequirementsPage {
  if (!value || typeof value !== 'object') return false
  const p = value as Partial<RequirementsPage>
  if (p.program_id !== id || typeof p.program_revision !== 'string' ||
      !p.program_revision.trim() || !Array.isArray(p.items) ||
      p.items.length > limit) return false
  if (p.next_cursor !== undefined &&
      (typeof p.next_cursor !== 'string' || p.next_cursor.length > 256)) return false
  const seen = new Set<string>()
  return p.items.every(item => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' ||
        !uuid.test(item.id) || seen.has(item.id) ||
        typeof item.code !== 'string' || !item.code.trim() ||
        typeof item.title !== 'string' || !item.title.trim() ||
        !Number.isSafeInteger(item.version) || item.version < 1 ||
        typeof item.effective_from !== 'string' ||
        !Number.isFinite(Date.parse(item.effective_from))) return false
    seen.add(item.id)
    return true
  })
}

export async function fetchApprovedRequirements(
  id: string, revision: string, cursor: string, signal: AbortSignal,
): Promise<RequirementsState> {
  if (!uuid.test(id) || !revision || cursor.length > 256) return { status: 'unavailable' }
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  try {
    const response = await fetch(
      `/api/v1/programs/${encodeURIComponent(id)}/requirements?${params.toString()}`, {
        method: 'GET', credentials: 'same-origin', cache: 'no-store',
        headers: { Accept: 'application/json' }, signal,
      },
    )
    if (response.status === 401) return { status: 'unauthenticated' }
    if (response.status === 403) return { status: 'forbidden' }
    if (response.status === 404) return { status: 'not_found' }
    if (!response.ok) return { status: 'unavailable' }
    const value: unknown = await response.json()
    if (!isRequirementsPage(value, id)) return { status: 'unavailable' }
    if (value.program_revision !== revision) return { status: 'changed' }
    return { status: 'ready', page: value }
  } catch {
    return { status: 'unavailable' }
  }
}

type Paging = { key: string; cursor: string; previous: string[] }
type Loaded = { key: string; cursor: string; state: RequirementsState }

export function useApprovedRequirements(
  programId: string | null,
  programRevision: string | null,
  enabled: boolean,
) {
  const key = programId && programRevision ? `${programId}:${programRevision}` : ''
  const [paging, setPaging] = useState<Paging>({ key: '', cursor: '', previous: [] })
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [retryVersion, setRetryVersion] = useState(0)
  // A scope/version change never renders a page belonging to an old Program.
  const current = paging.key === key ? paging : { key, cursor: '', previous: [] }
  const state: RequirementsState = enabled && loaded?.key === key &&
    loaded.cursor === current.cursor ? loaded.state : { status: 'loading' }

  useEffect(() => {
    if (!enabled || !programId || !programRevision) return
    const controller = new AbortController()
    void fetchApprovedRequirements(programId, programRevision, current.cursor, controller.signal)
      .then(result => {
        if (!controller.signal.aborted) setLoaded({ key, cursor: current.cursor, state: result })
      })
    return () => controller.abort()
  }, [enabled, key, programId, programRevision, current.cursor, retryVersion])

  return {
    state,
    hasPrevious: current.previous.length > 0,
    previous() {
      if (!current.previous.length) return
      setPaging({
        key, cursor: current.previous[current.previous.length - 1] ?? '',
        previous: current.previous.slice(0, -1),
      })
    },
    next() {
      if (state.status !== 'ready' || !state.page.next_cursor ||
          state.page.next_cursor === current.cursor) return
      setPaging({
        key, cursor: state.page.next_cursor,
        previous: [...current.previous, current.cursor],
      })
    },
    retry() { setRetryVersion(v => v + 1) },
  }
}
