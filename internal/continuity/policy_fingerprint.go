package continuity

// PolicyFingerprint delegates exclusively to the pinned v1 maker-checker
// checksum. It creates no alternate hash format or approval mechanism.
func PolicyFingerprint(policy ProgramComplianceCalculationPolicy)(string,error){
 return programCompliancePolicyChecksum(policy)
}
