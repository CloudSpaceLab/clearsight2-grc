// Same-origin, server-authorized Program metadata. Never put an identity
// signing key, tenant ID or role grant in the browser.
export type ProgramMetadata = {
  id: string
  name: string
  source_revision: string
  updated_at: string
}

export type ProgramReadResult =
  | { kind: 'ready'; program: ProgramMetadata }
  | { kind: 'not-selected' | 'invalid-id' | 'sign-in' | 'denied' | 'missing' | 'unavailable' }

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isProgram(value: unknown, id: string): value is ProgramMetadata {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<ProgramMetadata>
  return typeof record.id === 'string' &&
    record.id.toLowerCase() === id.toLowerCase() &&
    typeof record.name === 'string' && record.name.trim() !== '' && record.name.length <= 512 &&
    typeof record.source_revision === 'string' && record.source_revision.trim() !== '' &&
    typeof record.updated_at === 'string' &&
    Number.isFinite(Date.parse(record.updated_at))
}

export async function loadProgramMetadata(
  id: string | null,
  signal: AbortSignal,
  request: typeof fetch = fetch,
): Promise<ProgramReadResult> {
  if (!id) return { kind: 'not-selected' }
  if (!uuid.test(id)) return { kind: 'invalid-id' }
  try {
    const response = await request(`/api/v1/programs/${encodeURIComponent(id)}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal,
    })
    if (response.status === 401) return { kind: 'sign-in' }
    if (response.status === 403) return { kind: 'denied' }
    if (response.status === 404) return { kind: 'missing' }
    if (!response.ok) return { kind: 'unavailable' }
    const body: unknown = await response.json()
    if (!isProgram(body, id)) return { kind: 'unavailable' }
    return { kind: 'ready', program: {
      id: body.id,
      name: body.name,
      source_revision: body.source_revision,
      updated_at: body.updated_at,
    } }
  } catch {
    return { kind: 'unavailable' }
  }
}
