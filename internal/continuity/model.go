package continuity

import (
 "encoding/json"
 "time"
)

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
 RequirementRetired RequirementStatus = "RETIRED"
 ApplicabilityApplicable ApplicabilityStatus = "APPLICABLE"
 ApplicabilityPartial ApplicabilityStatus = "PARTIALLY_APPLICABLE"
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
 CalculationPolicy *ProgramCompliancePolicyPosition
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


// Canonical v1 maker-checker position. No mutations or approval path are
// implemented in v2; these are verified input facts for projection only.
type ProgramCompliancePolicyRevision struct {
 Number int64 `json:"number"`
 Definition ProgramComplianceCalculationPolicy `json:"definition"`
 Checksum string `json:"checksum"`
 MakerID string `json:"maker_id"`
 ProposedAt time.Time `json:"proposed_at"`
 ApproverID string `json:"approver_id,omitempty"`
 ApprovedAt *time.Time `json:"approved_at,omitempty"`
}

type ProgramCompliancePolicyPosition struct {
 LastRevision int64 `json:"last_revision"`
 Active *ProgramCompliancePolicyRevision `json:"active,omitempty"`
 Pending *ProgramCompliancePolicyRevision `json:"pending,omitempty"`
}

type ProgramSourceState struct {
 Required int
 Current bool
 Known bool
}


// Exact fields consumed by the pinned v1 Matter access policy. These do not
// introduce a separate Matter persistence model in ClearSight 2.
type Matter struct {
 TenantID string
 Scope json.RawMessage
 OwnerPrincipalID string
}
type ActionStatus string
const ActionInProgress ActionStatus = "IN_PROGRESS"
type Action struct {
 ID string
 OwnerPrincipalID string
 Status ActionStatus
}
type MatterAggregate struct {
 Matter Matter
 Actions []Action
}
