package continuity

import "time"

// The canonical v1 evaluator is copied without modification. These are its
// minimum source-fact types, preserving v1 field names and enum values.
// They are a projection contract, not a second persistence model.
type RequirementStatus string
type ApplicabilityStatus string
type ControlImplementationStatus string
type EvidenceContractStatus string
type EvidenceConclusion string
type ProgramStatus string

const (
 ProgramActive ProgramStatus = "ACTIVE"
 RequirementApproved RequirementStatus = "APPROVED"
 ApplicabilityApplicable ApplicabilityStatus = "APPLICABLE"
 ApplicabilityNotApplicable ApplicabilityStatus = "NOT_APPLICABLE"
 ImplementationImplemented ControlImplementationStatus = "IMPLEMENTED"
 ImplementationInactive ControlImplementationStatus = "INACTIVE"
 ImplementationRetired ControlImplementationStatus = "RETIRED"
 EvidenceContractActive EvidenceContractStatus = "ACTIVE"
 EvidenceSupported EvidenceConclusion = "SUPPORTED"
 EvidenceUnsupported EvidenceConclusion = "UNSUPPORTED"
)

type Program struct {
 ID string
 TenantID string
 Status ProgramStatus
}

type Requirement struct {
 ID string
 TenantID string
 ProgramID string
 Status RequirementStatus
 EffectiveFrom time.Time
 EffectiveUntil *time.Time
}

type Applicability struct {
 RequirementID string
 Status ApplicabilityStatus
 EffectiveFrom time.Time
 EffectiveUntil *time.Time
 CreatedAt time.Time
}

type ControlImplementation struct {
 ID string
 Status ControlImplementationStatus
 EffectiveFrom time.Time
 EffectiveUntil *time.Time
}

type RequirementControlLink struct {
 RequirementID string
 ImplementationID string
 CreatedAt time.Time
 RetiredAt *time.Time
}

type EvidenceContract struct {
 ID string
 RequirementID string
 ControlImplementationID string
 Status EvidenceContractStatus
 FreshnessMinutes int
 MinimumCoverage float64
}

type EvidenceAssessment struct {
 ContractID string
 Conclusion EvidenceConclusion
 Coverage float64
 ValidUntil *time.Time
 AssessedAt time.Time
 CreatedAt time.Time
}

type ProgramAggregate struct {
 Program Program
 Requirements []Requirement
 Applicability []Applicability
 ControlImplementations []ControlImplementation
 RequirementControlLinks []RequirementControlLink
 EvidenceContracts []EvidenceContract
 EvidenceAssessments []EvidenceAssessment
}
