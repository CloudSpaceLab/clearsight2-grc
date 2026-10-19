package continuity

import "time"

// Functions below are copied byte-for-byte from the pinned v1 state.go.
// Do not alter without upstream parity and semantic tests.
func requirementControlLinkEffectiveAt(link RequirementControlLink, at time.Time) bool {
	return (link.CreatedAt.IsZero() || !at.Before(link.CreatedAt)) &&
		(link.RetiredAt == nil || at.Before(*link.RetiredAt))
}

func effectiveAt(from time.Time, until *time.Time, at time.Time) bool {
	if !from.IsZero() && from.After(at) {
		return false
	}
	return until == nil || at.Before(*until)
}

func boundedAssessmentValidity(assessment EvidenceAssessment, contract EvidenceContract) time.Time {
	if assessment.AssessedAt.IsZero() || contract.FreshnessMinutes <= 0 {
		return time.Time{}
	}
	maximum := assessment.AssessedAt.UTC().Add(time.Duration(contract.FreshnessMinutes) * time.Minute)
	if assessment.ValidUntil == nil || assessment.ValidUntil.After(maximum) {
		return maximum
	}
	return assessment.ValidUntil.UTC()
}
