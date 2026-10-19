export type InventoryKind = 'controls' | 'evidence-contracts'

export type InventoryRecord = Readonly<{
  id: string
  code?: string
  name: string
  status: string
  version: number
  updated_at: string
}>

export type InventoryPage = Readonly<{
  program_id: string
  program_revision: string
  items: InventoryRecord[]
  next_cursor?: string
}>

export type InventoryResult =
  | { status: 'ready'; page: InventoryPage }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'changed' }
  | { status: 'unavailable' }

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const pageSize = 25

export function validInventoryPage(value: unknown, kind: InventoryKind, programId: string): value is InventoryPage {
  if (!value || typeof value !== 'object') return false
  const page = value as Partial<InventoryPage>
  if (page.program_id !== programId || typeof page.program_revision !== 'string' ||
      !page.program_revision.trim() || !Array.isArray(page.items) ||
      page.items.length > pageSize) return false
  if (page.next_cursor !== undefined &&
      (typeof page.next_cursor !== 'string' || page.next_cursor.length > 256)) return false

  const seen = new Set<string>()
  return page.items.every((raw: unknown) => {
    if (!raw || typeof raw !== 'object') return false
    const item = raw as Partial<InventoryRecord>
    if (typeof item.id !== 'string' || !uuid.test(item.id) || seen.has(item.id) ||
        typeof item.name !== 'string' || !item.name.trim() ||
        typeof item.status !== 'string' || !Number.isSafeInteger(item.version) ||
        (item.version ?? 0) < 1 || typeof item.updated_at !== 'string' ||
        !Number.isFinite(Date.parse(item.updated_at))) return false

    const allowedStatus = kind === 'controls'
      ? ['PLANNED', 'IN_PROGRESS', 'IMPLEMENTED'].includes(item.status)
      : item.status === 'ACTIVE'
    const allowedCode = kind === 'controls'
      ? item.code === undefined || item.code === ''
      : typeof item.code === 'string' && !!item.code.trim()
    if (!allowedStatus || !allowedCode) return false

    seen.add(item.id)
    return true
  })
}

export async function fetchProgramInventory(
  programId: string,
  revision: string,
  kind: InventoryKind,
  cursor: string,
  signal: AbortSignal,
): Promise<InventoryResult> {
  if (!uuid.test(programId) || !revision || cursor.length > 256 ||
      (kind !== 'controls' && kind !== 'evidence-contracts')) return { status: 'unavailable' }
  const params = new URLSearchParams({ limit: String(pageSize) })
  if (cursor) params.set('cursor', cursor)
  try {
    // The trusted same-origin edge supplies the session; no actor headers or tenant claims.
    const response = await fetch(
      `/api/v1/programs/${encodeURIComponent(programId)}/${kind}?${params.toString()}`,
      { method: 'GET', credentials: 'same-origin', cache: 'no-store',
        headers: { Accept: 'application/json' }, signal },
    )
    if (response.status === 401) return { status: 'unauthenticated' }
    if (response.status === 403) return { status: 'forbidden' }
    if (response.status === 404) return { status: 'not_found' }
    if (!response.ok) return { status: 'unavailable' }
    const body: unknown = await response.json()
    if (!validInventoryPage(body, kind, programId)) return { status: 'unavailable' }
    if (body.program_revision !== revision) return { status: 'changed' }
    return { status: 'ready', page: body }
  } catch {
    return { status: 'unavailable' }
  }
}
