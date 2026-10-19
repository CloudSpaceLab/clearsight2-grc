package programread

import (
 "context"
 "database/sql"
 "errors"
 "fmt"

 "github.com/CloudSpaceLab/clearsight2-grc/internal/continuity"
)

// Derived from the pinned v1 CurrentProgramSourceState query. Bind exact UUID
// tenant and Program, and use transaction_timestamp to share one snapshot with
// Program authorization and canonical coverage facts.
//
// A required source is either explicitly referenced by an approved/effective
// requirement or by an active contract whose target is currently effective.
// The contract target matches the upstream source-health rule, not a new
// assurance interpretation. UNION prevents double-counting shared sources.
const coverageSourceHealthSQL = `
WITH dependent_sources AS (
 SELECT ecs.source_id
 FROM evidence_contract_sources ecs
 JOIN evidence_contracts ec
   ON ec.tenant_id=ecs.tenant_id AND ec.program_id=ecs.program_id
  AND ec.id=ecs.contract_id
 LEFT JOIN program_requirements target_requirement
   ON target_requirement.tenant_id=ec.tenant_id
  AND target_requirement.program_id=ec.program_id
  AND target_requirement.id=ec.requirement_id
 LEFT JOIN control_implementations target_implementation
   ON target_implementation.tenant_id=ec.tenant_id
  AND target_implementation.program_id=ec.program_id
  AND target_implementation.id=ec.control_implementation_id
 WHERE ecs.tenant_id=$1::uuid AND ecs.program_id=$2::uuid
   AND ec.status='ACTIVE'
   AND (
     (ec.requirement_id IS NOT NULL
      AND target_requirement.status='APPROVED'
      AND target_requirement.effective_from<=transaction_timestamp()
      AND (target_requirement.effective_until IS NULL
        OR transaction_timestamp()<target_requirement.effective_until))
     OR
     (ec.control_implementation_id IS NOT NULL
      AND target_implementation.status NOT IN ('INACTIVE','RETIRED')
      AND target_implementation.effective_from<=transaction_timestamp()
      AND (target_implementation.effective_until IS NULL
        OR transaction_timestamp()<target_implementation.effective_until))
   )
 UNION
 SELECT pr.source_id
 FROM program_requirements pr
 WHERE pr.tenant_id=$1::uuid AND pr.program_id=$2::uuid
   AND pr.source_id IS NOT NULL AND pr.status='APPROVED'
   AND pr.effective_from<=transaction_timestamp()
   AND (pr.effective_until IS NULL OR transaction_timestamp()<pr.effective_until)
)
SELECT count(*)::integer,
       count(*) FILTER (WHERE es.status='ACTIVE' AND es.health='CURRENT')::integer
FROM dependent_sources ds
LEFT JOIN evidence_sources es
  ON es.tenant_id=$1::uuid AND es.id=ds.source_id
`

// loadProgramSourceHealth executes only inside the already authorized,
// read-only repeatable-read Program transaction. No public handler calls it.
func loadProgramSourceHealth(ctx context.Context,tx *sql.Tx,tenantID,programID string)(continuity.ProgramSourceState,error){
 if tx==nil || !isUUID(tenantID) || !isUUID(programID) {
  return continuity.ProgramSourceState{},errors.New("invalid scoped source-health request")
 }
 var required,current int
 if err:=tx.QueryRowContext(ctx,coverageSourceHealthSQL,tenantID,programID).Scan(&required,&current);err!=nil{
  return continuity.ProgramSourceState{},fmt.Errorf("read Program source health: %w",err)
 }
 if required<0 || required>maxCoverageFactsPerTable || current<0 || current>required{
  return continuity.ProgramSourceState{},errors.New("invalid Program source health population")
 }
 // Preserve the v1 semantics exactly: Known=true even when there are zero
 // dependencies; Current requires at least one dependent healthy source.
 return continuity.ProgramSourceState{
  Required:required,Current:required>0 && current==required,Known:true,
 },nil
}
