package programread

import (
 "context"
 "database/sql"
 "errors"
 "fmt"
 "time"
)

// Canonical current-Matter visibility predicate ported from the pinned v1
// program_state_visibility_postgres.go. Program scope is authorized first.
// The query returns only a count and newest update, not restricted Matter data.
const visibleProgramMattersSQL = `
SELECT count(DISTINCT m.id)::integer, max(m.updated_at)
FROM matter_links ml
JOIN matters m ON m.tenant_id=ml.tenant_id AND m.id=ml.matter_id
WHERE ml.tenant_id=$1::uuid AND ml.program_id=$2::uuid
  AND m.status NOT IN ('CLOSED','CANCELLED')
  AND CASE
    WHEN NOT (m.scope ? 'access') THEN true
    WHEN jsonb_typeof(m.scope->'access')<>'string' THEN false
    WHEN upper(btrim(m.scope->>'access')) IN ('PUBLIC','INTERNAL') THEN true
    WHEN upper(btrim(m.scope->>'access'))='RESTRICTED' THEN
      CASE
        WHEN jsonb_typeof(m.scope->'allowed_principal_ids')<>'array' THEN false
        ELSE
          NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(m.scope->'allowed_principal_ids') entry(value)
            WHERE jsonb_typeof(entry.value)<>'string'
          )
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(m.scope->'allowed_principal_ids') nonblank(value)
            WHERE btrim(nonblank.value)<>''
          )
          AND EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(m.scope->'allowed_principal_ids') allowed(value)
            WHERE btrim(allowed.value)=$3
          )
      END
    ELSE false
  END
`

type visibleMatterSummary struct {
 OpenCount int
 LatestAt time.Time
}

// The caller must authorize the Program and its tenant/legal-entity scope in
// the SAME transaction before invoking this read. This is private metadata
// for a future actor-visible Program state, never a score or HTTP response.
func loadVisibleProgramMatters(ctx context.Context,tx *sql.Tx,tenantID,programID,principalID string)(visibleMatterSummary,error){
 if tx==nil||!isUUID(tenantID)||!isUUID(programID)||!isUUID(principalID){
  return visibleMatterSummary{},errors.New("invalid Matter visibility scope")
 }
 var count int
 var latest sql.NullTime
 if err:=tx.QueryRowContext(ctx,visibleProgramMattersSQL,tenantID,programID,principalID).Scan(&count,&latest);err!=nil{
  return visibleMatterSummary{},fmt.Errorf("load actor-visible Matters: %w",err)
 }
 if count<0||count>maxCoverageFactsPerTable {
  return visibleMatterSummary{},errors.New("invalid visible Matter population")
 }
 result:=visibleMatterSummary{OpenCount:count}
 if latest.Valid{result.LatestAt=latest.Time.UTC()}
 return result,nil
}
