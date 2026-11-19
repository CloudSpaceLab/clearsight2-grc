export async function loadDocumentPages<T>(programId: string, currentOnly: boolean,
  read: (path: string) => Promise<{ items: T[]; next_cursor?: string }>,
  active: () => boolean = () => true,
) {
  const items: T[] = []
  const visited = new Set<string>()
  let cursor = ''
  do {
    const query = new URLSearchParams({ program_id: programId, current_only: String(currentOnly), limit: '100' })
    if (cursor) query.set('cursor', cursor)
    const page = await read('/api/v1/forms/documents?' + query)
    if (!active()) return []
    items.push(...page.items)
    cursor = page.next_cursor || ''
    if (cursor && visited.has(cursor)) throw Error('Document paging changed. Try again.')
    if (cursor) visited.add(cursor)
  } while (cursor)
  return items
}

export function documentResponseHref(location: string, document: { request_id: string; submission_id: string; field_id: string }) {
  const url = new URL(location)
  url.searchParams.set('tab', 'assessment')
  url.searchParams.set('request', document.request_id)
  url.searchParams.set('submission', document.submission_id)
  url.searchParams.set('field', document.field_id)
  return url.href
}

export function attachDocumentToDraft<T>(answers: Record<string, T>, fieldId: string, artifactId: string) {
  return { ...answers, [fieldId]: { artifact_ids: [artifactId] } }
}
export function previewKind(mediaType: string) {
  const type = mediaType.toLowerCase().split(';')[0]?.trim()
  if (type === 'text/plain' || type === 'text/csv') return 'text'
  if (type === 'application/pdf') return 'pdf'
  if (['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(type || '')) return 'image'
  return 'unavailable'
}
