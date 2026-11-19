import { useEffect, useState } from 'react'
import { scoped, v1 } from './v1Client'
import type { AssessmentWorkspace, V1Context } from './v1Client'
import type { ActivationAggregate, ActivationOperations } from './programActivationModel'
import type { StarterAdoption } from '../frameworks/starterAdoptionModel'
import type { AssessmentReviewReceipt } from './AssessmentReview'
import { validOverviewWorkspace } from './overviewModel'

export type OverviewAggregate = ActivationAggregate & { framework_adoptions?: StarterAdoption[] }
type OverviewSchedule = { id: string; state: string; form_template_id: string; interval_months: number; interval_days?: number; next_attempt_at: string }
export function useOverviewData(context: V1Context | null, programId: string | null, revision: string) {
  const key = context && programId ? `${context.tenant.id}:${context.legal_entity.id}:${context.actor.id}:${programId}:${revision}` : ''
  const [state, setState] = useState<{ key: string; loading: boolean; workspace?: AssessmentWorkspace; aggregate?: OverviewAggregate; operations?: ActivationOperations; reviews?: AssessmentReviewReceipt[]; schedules?: OverviewSchedule[]; asOf?: string }>({ key: '', loading: true })
  const [refresh, setRefresh] = useState(0)
  useEffect(() => {
    if (!context || !programId) return
    let live = true
    setState({ key, loading: true })
    const path = `/api/v1/programs/${encodeURIComponent(programId)}`
    void Promise.allSettled([
      v1<AssessmentWorkspace>(scoped(`${path}/assessment-workspace`, context)),
      v1<OverviewAggregate>(scoped(path, context)),
      v1<ActivationOperations>(scoped(`${path}/operations`, context)),
      v1<{ items: AssessmentReviewReceipt[] }>(scoped(`${path}/assessment-reviews`, context)),
      v1<{ items: OverviewSchedule[] }>(scoped(`${path}/assessment-schedules`, context)),
    ]).then(([w, a, o, r, schedules]) => {
      if (!live) return
      const aggregate = a.status === 'fulfilled' && a.value.program.id === programId && a.value.program.tenant_id === context.tenant.id && a.value.program.legal_entity_id === context.legal_entity.id ? a.value : undefined
      const operations = o.status === 'fulfilled' && o.value.program_id === programId && o.value.program_version === aggregate?.program.version ? o.value : undefined
      setState({ key, loading: false, workspace: w.status === 'fulfilled' && validOverviewWorkspace(w.value, programId) ? w.value : undefined, aggregate, operations, reviews: r.status === 'fulfilled' ? r.value.items : undefined, schedules: schedules.status === 'fulfilled' ? schedules.value.items : undefined, asOf: new Date().toISOString() })
    })
    return () => { live = false }
  }, [key, refresh])
  return { ...(state.key === key ? state : { key, loading: !!key }), retry: () => setRefresh(n => n + 1) }
}
