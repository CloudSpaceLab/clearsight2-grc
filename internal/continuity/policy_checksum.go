package continuity

import (
 "crypto/sha256"
 "encoding/json"
 "fmt"
)

// Exact fingerprint from v1 policy lifecycle; no independent hash contract.
func programCompliancePolicyChecksum(policy ProgramComplianceCalculationPolicy) (string, error) {
	encoded, err := json.Marshal(policy)
	if err != nil {
		return "", err
	}
	checksum := sha256.Sum256(encoded)
	return fmt.Sprintf("%x", checksum), nil
}
