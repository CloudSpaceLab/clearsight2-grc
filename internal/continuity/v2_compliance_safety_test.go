package continuity

import "testing"

// A diagnostic score is never a final Program compliance percentage until
// the approved category population and the minimum coverage are satisfied.
func TestV2CanonicalPolicyNeverPublishesPartialAsFinal(t *testing.T) {
	policy := ProgramComplianceCalculationPolicy{
		Revision: "reviewed-policy-v3",
		MinimumCoverageBps: 9000,
		Categories: []ProgramComplianceCategoryWeight{
			{Code: "REQUIREMENTS", WeightBps: 7000},
			{Code: "VENDORS", WeightBps: 3000},
		},
	}
	supported := int64(10000)
	partial, err := CalculateProgramCompliance(policy, []ProgramComplianceInput{
		{Key: "REQUIREMENT:approved-1", Category: "REQUIREMENTS", Weight: 1,
			State: ProgramComplianceAssessed, ScoreBps: &supported},
		{Key: "REQUIREMENT:unreviewed-2", Category: "REQUIREMENTS", Weight: 1,
			State: ProgramComplianceUnknown, Reason: "EVIDENCE_UNVERIFIED"},
		{Key: "VENDOR:expected-1", Category: "VENDORS", Weight: 1,
			State: ProgramComplianceUnknown, Reason: "ASSESSMENT_PENDING"},
	})
	if err != nil {
		t.Fatal(err)
	}
	if partial.ScoreBps != nil || partial.State == ProgramComplianceFinal ||
		partial.CoverageBps >= policy.MinimumCoverageBps {
		t.Fatalf("unknown vendor/evidence improperly finalized a Program: %+v", partial)
	}
	if partial.AssessedScoreBps == nil {
		t.Fatal("expected internal diagnostic to remain distinguishable from a final score")
	}

	// Even full requirement coverage cannot replace an unknown required
	// category without a governed, explicit non-applicability decision.
	missing, err := CalculateProgramCompliance(policy, []ProgramComplianceInput{{
		Key: "REQUIREMENT:approved-1", Category: "REQUIREMENTS", Weight: 1,
		State: ProgramComplianceAssessed, ScoreBps: &supported,
	}})
	if err != nil {
		t.Fatal(err)
	}
	if missing.State == ProgramComplianceFinal || missing.ScoreBps != nil {
		t.Fatalf("unpopulated vendor category improperly removed: %+v", missing)
	}
}
