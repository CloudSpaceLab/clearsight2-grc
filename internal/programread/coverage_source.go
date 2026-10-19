package programread

import (
 "context"
 "database/sql"
 "errors"
 "fmt"
 "time"

 "github.com/CloudSpaceLab/clearsight2-grc/internal/continuity"
 "github.com/CloudSpaceLab/clearsight2-grc/internal/identity"
)

var errCoveragePopulationExceeded = errors.New("Program source population exceeds safe limit")

// currentCoverage is deliberately internal until actor-visible evidence
// permissions and approved score policy have been audited.
type scopedCoverageSnapshot struct {
 Coverage map[string]continuity.RequirementCoverage
 SourceHealth continuity.ProgramSourceState
}

// Retain the original private API for existing regression tests. It is never
// registered as a route and must not be used for a user-visible percentage.
func (r *SQLRepository) currentCoverage(ctx context.Context,actor identity.Actor,programID string)(map[string]continuity.RequirementCoverage,error){
 snapshot,err:=r.currentCoverageSnapshot(ctx,actor,programID)
 if err!=nil{return nil,err}
 return snapshot.Coverage,nil
}

// currentCoverageSnapshot keeps canonical source health and requirement facts
// in the same authorized database snapshot. Results remain internal-only.
func (r *SQLRepository) currentCoverageSnapshot(ctx context.Context,actor identity.Actor,programID string)(scopedCoverageSnapshot,error){
 if r==nil||r.db==nil{return scopedCoverageSnapshot{},errors.New("Program repository unavailable")}
 if !isUUID(programID){return scopedCoverageSnapshot{},ErrNotFound}
 if err:=actor.Valid(time.Now().UTC());err!=nil{return scopedCoverageSnapshot{},err}

 tx,err:=r.db.BeginTx(ctx,&sql.TxOptions{ReadOnly:true,Isolation:sql.LevelRepeatableRead})
 if err!=nil{return scopedCoverageSnapshot{},fmt.Errorf("begin coverage source snapshot: %w",err)}
 defer func(){_ = tx.Rollback()}()
 program,err:=getVisible(ctx,transactionReader{tx:tx},actor,programID)
 if err!=nil{return scopedCoverageSnapshot{},err}

 var at time.Time
 if err:=tx.QueryRowContext(ctx,"SELECT transaction_timestamp()").Scan(&at);err!=nil{
  return scopedCoverageSnapshot{},fmt.Errorf("coverage evaluation time unavailable: %w",err)
 }
 source:=continuity.ProgramAggregate{
  Program:continuity.Program{ID:program.ID,TenantID:program.TenantID},
 }

 if err:=loadCoverageFacts(ctx,tx,actor.TenantID,program.ID,&source);err!=nil{return scopedCoverageSnapshot{},err}
 health,err:=loadProgramSourceHealth(ctx,tx,actor.TenantID,program.ID)
 if err!=nil{return scopedCoverageSnapshot{},err}
 // It is critical that no caller can observe results from an incomplete
 // source read. Every query and transaction must succeed before evaluation.
 if err:=tx.Commit();err!=nil{return scopedCoverageSnapshot{},fmt.Errorf("commit coverage snapshot: %w",err)}
 return scopedCoverageSnapshot{
  Coverage:continuity.CurrentRequirementCoverage(source,at),
  SourceHealth:health,
 },nil
}

// loadSourceRows applies a hard per-table cap, never silently truncating a
// compliance denominator. All source tables share the Program scope.
func loadSourceRows(ctx context.Context,tx *sql.Tx,query,tenantID,programID string,decode func(*sql.Rows)error)error{
 rows,err:=tx.QueryContext(ctx,query,tenantID,programID,maxCoverageFactsPerTable+1)
 if err!=nil{return fmt.Errorf("load coverage source: %w",err)}
 defer rows.Close()
 count:=0
 for rows.Next(){
  count++
  if count>maxCoverageFactsPerTable{return errCoveragePopulationExceeded}
  if err:=decode(rows);err!=nil{return fmt.Errorf("decode coverage source: %w",err)}
 }
 if err:=rows.Err();err!=nil{return fmt.Errorf("iterate coverage source: %w",err)}
 return nil
}

func optionalTime(t sql.NullTime)*time.Time {
 if !t.Valid{return nil}
 v:=t.Time.UTC()
 return &v
}
