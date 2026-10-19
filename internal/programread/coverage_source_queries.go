package programread

import (
 "context"
 "database/sql"
 "fmt"
)

// Every fact query is constrained by the already authenticated Program tenant
// and Program ID. No browser-controlled SQL or partial table scan is accepted.
const coverageRequirementsSQL = `
SELECT id::text,status,effective_from,effective_until
FROM program_requirements WHERE tenant_id=$1::uuid AND program_id=$2::uuid
LIMIT $3`
const coverageApplicabilitySQL = `
SELECT requirement_id::text,status,effective_from,effective_until,created_at
FROM program_applicability WHERE tenant_id=$1::uuid AND program_id=$2::uuid
LIMIT $3`
const coverageControlsSQL = `
SELECT id::text,status,effective_from,effective_until
FROM control_implementations WHERE tenant_id=$1::uuid AND program_id=$2::uuid
LIMIT $3`
const coverageLinksSQL = `
SELECT requirement_id::text,implementation_id::text,created_at,retired_at
FROM requirement_control_links WHERE tenant_id=$1::uuid AND program_id=$2::uuid
LIMIT $3`
const coverageContractsSQL = `
SELECT id::text,COALESCE(requirement_id::text,''),COALESCE(control_implementation_id::text,''),
status,freshness_minutes,minimum_coverage
FROM evidence_contracts WHERE tenant_id=$1::uuid AND program_id=$2::uuid
LIMIT $3`
const coverageAssessmentsSQL = `
SELECT contract_id::text,conclusion,coverage,valid_until,assessed_at,created_at
FROM evidence_assessments WHERE tenant_id=$1::uuid AND program_id=$2::uuid
LIMIT $3`

const maxCoverageFactsPerTable = 5000

var coverageSourceQueries = [...]string{
 coverageRequirementsSQL,coverageApplicabilitySQL,coverageControlsSQL,
 coverageLinksSQL,coverageContractsSQL,coverageAssessmentsSQL,
 coverageSourceHealthSQL,
 currentProgramPolicySQL,lastApprovedPolicyEventSQL,
 visibleProgramMattersSQL,
}

// CheckCoverageSourceSchema is an independent, opt-in gate for the *internal*
// evaluator loader. It does not register Program compliance endpoints.
func CheckCoverageSourceSchema(ctx context.Context,db *sql.DB)error{
 if db==nil{return fmt.Errorf("coverage source database unavailable")}
 for _,query:=range coverageSourceQueries{
  prepared,err:=db.PrepareContext(ctx,query)
  if err!=nil{return fmt.Errorf("coverage source schema incompatible: %w",err)}
  if err:=prepared.Close();err!=nil{return fmt.Errorf("close coverage schema check: %w",err)}
 }
 return nil
}
