import { useEffect, useState } from 'react'

type AssessmentCoverage = Readonly<{
  assessed: number
  eligible: number
  unknown: number
  excluded: number
  quality: 'current' | 'partial'
  generated_at: string
}>

export type ProgramOverview = Readonly<{
  program_id: string
  program_revision: string
  assessment_coverage: AssessmentCoverage | null
  supported: null
  open_gaps: null
  evidence_to_review: null
}>

export type OverviewRead =
  | { status: 'loading' }
  | { status: 'ready'; overview: ProgramOverview }
  | { status: 'unauthenticated' | 'forbidden' | 'not_found' | 'changed' | 'unavailable' }

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const natural = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

export function isOverview(value: unknown, programId: string): value is ProgramOverview {
  if (!value || typeof value !== 'object') return false
  const p = value as Partial<ProgramOverview>
  if (p.program_id !== programId || typeof p.program_revision !== 'string' ||
      !p.program_revision.trim() || p.supported !== null ||
      p.open_gaps !== null || p.evidence_to_review !== null) return false
  if (p.assessment_coverage === null) return true
  const measure = p.assessment_coverage as AssessmentCoverage | undefined
  if (!measure || !natural(measure.assessed) || !natural(measure.eligible) ||
      !natural(measure.unknown) || !natural(measure.excluded) ||
      measure.assessed + measure.unknown !== measure.eligible ||
      (measure.quality !== 'current' && measure.quality !== 'partial') ||
      typeof measure.generated_at !== 'string' ||
      !Number.isFinite(Date.parse(measure.generated_at))) return false
  return true
}

export async function fetchProgramOverview(
  programId: string, revision: string, signal: AbortSignal,
): Promise<OverviewRead> {
  if (!uuid.test(programId) || !revision) return { status: 'unavailable' }
  try {
    const response = await fetch(`/api/v1/programs/${programId}/overview`, {
      method: 'GET', credentials: 'same-origin', cache: 'no-store',
      headers: { Accept: 'application/json' }, signal,
    })
    if (response.status === 401) return { status: 'unauthenticated' }
    if (response.status === 403) return { status: 'forbidden' }
    if (response.status === 404) return { status: 'not_found' }
    if (!response.ok) return { status: 'unavailable' }
    const payload: unknown = await response.json()
    if (!isOverview(payload, programId)) return { status: 'unavailable' }
    if (payload.program_revision !== revision) return { status: 'changed' }
    return { status: 'ready', overview: payload }
  } catch {
    return { status: 'unavailable' }
  }
}

export function useProgramOverview(id: string | null, revision: string | null, enabled: boolean) {
  const key = id && revision ? `${id}:${revision}` : ''
  const [loaded, setLoaded] = useState<{ key: string; state: OverviewRead } | null>(null)
  useEffect(() => {
    if (!enabled || !id || !revision) return
    const controller = new AbortController()
    void fetchProgramOverview(id, revision, controller.signal).then(state => {
      if (!controller.signal.aborted) setLoaded({ key, state })
    })
    return () => controller.abort()
  }, [id, revision, enabled, key])
  return enabled && loaded?.key === key ? loaded.state : ({ status: 'loading' } as const)
}
