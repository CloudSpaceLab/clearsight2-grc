package continuity

import (
	"reflect"
	"testing"
	"time"
)

func TestCoverageFailsClosedAcrossGovernedTransitions(t *testing.T) {
	at := time.Date(2026, 10, 19, 18, 0, 0, 0, time.UTC)
	past := at.Add(-2*time.Hour)
	future := at.Add(time.Hour)
	source := ProgramAggregate{
		Program: Program{ID: "program-1", Status: ProgramActive},
		Requirements: []Requirement{{
			ID: "req-1", Status: RequirementApproved, EffectiveFrom: past,
		}},
		Applicability: []Applicability{{
			RequirementID: "req-1", Status: ApplicabilityApplicable, EffectiveFrom: past,
		}},
		ControlImplementations: []ControlImplementation{{
			ID: "control-1", Status: ImplementationImplemented, EffectiveFrom: past,
		}},
		RequirementControlLinks: []RequirementControlLink{{
			RequirementID: "req-1", ImplementationID: "control-1", CreatedAt: past,
		}},
		EvidenceContracts: []EvidenceContract{{
			ID: "evidence-1", RequirementID: "req-1", Status: EvidenceContractActive,
			FreshnessMinutes: 60, MinimumCoverage: 0.9,
		}},
		EvidenceAssessments: []EvidenceAssessment{{
			ContractID: "evidence-1", Conclusion: EvidenceSupported,
			Coverage: 1, AssessedAt: at.Add(-time.Minute),
		}},
	}
	assert := func(t *testing.T, input ProgramAggregate, expected string) {
		t.Helper()
		got := CurrentRequirementCoverage(input,at)["req-1"]
		if got.Complete || reflect.DeepEqual(got.Reasons,[]string{}) {
			t.Fatalf("%s incorrectly treated as complete: %+v",expected,got)
		}
	}
	t.Run("missing applicability",func(t *testing.T) {
		mut:=source;mut.Applicability=nil
		assert(t,mut,"unapproved applicability")
	})
	t.Run("future applicability",func(t *testing.T) {
		mut:=source;mut.Applicability=append([]Applicability(nil),source.Applicability...)
		mut.Applicability[0].EffectiveFrom=future
		assert(t,mut,"future applicability")
	})
	t.Run("retired mapping",func(t *testing.T) {
		mut:=source;mut.RequirementControlLinks=append([]RequirementControlLink(nil),source.RequirementControlLinks...)
		mut.RequirementControlLinks[0].RetiredAt=&past
		assert(t,mut,"retired control mapping")
	})
	t.Run("future mapping",func(t *testing.T) {
		mut:=source;mut.RequirementControlLinks=append([]RequirementControlLink(nil),source.RequirementControlLinks...)
		mut.RequirementControlLinks[0].CreatedAt=future
		assert(t,mut,"future control mapping")
	})
	t.Run("unimplemented control",func(t *testing.T) {
		mut:=source;mut.ControlImplementations=append([]ControlImplementation(nil),source.ControlImplementations...)
		mut.ControlImplementations[0].Status=ImplementationInactive
		assert(t,mut,"inactive control")
	})
	t.Run("expired evidence",func(t *testing.T) {
		mut:=source;mut.EvidenceAssessments=append([]EvidenceAssessment(nil),source.EvidenceAssessments...)
		mut.EvidenceAssessments[0].AssessedAt=past
		assert(t,mut,"stale evidence assessment")
	})
	t.Run("insufficient assessed coverage",func(t *testing.T) {
		mut:=source;mut.EvidenceAssessments=append([]EvidenceAssessment(nil),source.EvidenceAssessments...)
		mut.EvidenceAssessments[0].Coverage=.8
		assert(t,mut,"insufficient assessed coverage")
	})
	t.Run("explicit validity cutoff",func(t *testing.T) {
		mut:=source;mut.EvidenceAssessments=append([]EvidenceAssessment(nil),source.EvidenceAssessments...)
		mut.EvidenceAssessments[0].ValidUntil=&past
		assert(t,mut,"expired signed evidence validity")
	})
	t.Run("no evidence contracts",func(t *testing.T) {
		mut:=source;mut.EvidenceContracts=nil
		assert(t,mut,"uncontracted evidence")
	})
	t.Run("approved future requirement omitted",func(t *testing.T){
		mut:=source;mut.Requirements=append([]Requirement(nil),source.Requirements...)
		mut.Requirements[0].EffectiveFrom=future
		if len(CurrentRequirementCoverage(mut,at))!=0{t.Fatal("future requirement entered assessed population")}
	})
	t.Run("current completed chain",func(t *testing.T){
		got:=CurrentRequirementCoverage(source,at)["req-1"]
		if !got.Complete||!got.EvidenceSupported||!got.ControlImplemented{
			t.Fatalf("pinned evaluator did not accept current confirmed chain: %+v",got)
		}
	})
}
