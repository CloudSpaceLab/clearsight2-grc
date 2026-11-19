import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { StarterAdoption, StarterRequirement } from '../frameworks/starterAdoptionModel'
import { scoped, v1 } from './v1Client'
import type { RequestRecord, V1Context } from './v1Client'

type Props = {
  context: V1Context
  record: RequestRecord
  renderQuestion: (field: RequestRecord['fields'][number], index: number) => ReactNode
}

export function AssessmentRequirementContext({ context, record, renderQuestion }: Props) {
  const adoptionId = record.origin?.type === 'FRAMEWORK_ASSESSMENT' ? record.known_facts?.adoption_id : undefined
  const programId = record.subject_id
  const [requirements, setRequirements] = useState<StarterRequirement[]>([])
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    if (!adoptionId) return

    let active = true
    const path = scoped(`/api/v1/programs/${encodeURIComponent(programId)}`, context)
    void v1<{ framework_adoptions?: StarterAdoption[] }>(path).then(result => {
      if (!active) return
      const adoption = result.framework_adoptions?.find(item => item.id === adoptionId && item.status === 'ACTIVE')
      if (!adoption?.configuration) {
        setUnavailable(true)
        return
      }
      setRequirements(adoption.configuration.requirements.filter(requirement =>
        requirement.form_template_id === record.form_template_id &&
        requirement.form_template_version === record.form_template_version &&
        (requirement.decision === 'KEEP' || requirement.decision === 'TAILOR')
      ))
    }).catch(() => {
      if (active) setUnavailable(true)
    })
    return () => { active = false }
  }, [adoptionId, context, programId, record.form_template_id, record.form_template_version])

  const displayedGroups = new Set<string>()
  return <>
    {unavailable && <p className="program-response-caption" role="status">Program requirement wording is unavailable for this assessment.</p>}
    {record.fields.map((field, index) => {
      const group = field.section_id
      const linked = group && !displayedGroups.has(group)
        ? requirements.filter(requirement => requirement.group_id === group)
        : []
      if (group) displayedGroups.add(group)

      return <div key={field.id}>
        {linked.length > 0 && <aside className="v1-question" aria-label="Approved Program requirements">
          <strong>{record.sections?.find(section => section.id === group)?.title || linked[0]?.group_title}</strong>
          {linked.map(requirement => <div key={requirement.code}>
            <h3>{requirement.title}</h3>
            <p>{requirement.statement}</p>
            {requirement.decision === 'TAILOR' && <span className="pill">Tailored for Program</span>}
          </div>)}
        </aside>}
        {renderQuestion(field, index)}
      </div>
    })}
  </>
}
