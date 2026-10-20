package programread

import (
 "context"
 "database/sql"
 "encoding/json"
 "errors"
 "fmt"
 "strconv"
 "time"

 "github.com/CloudSpaceLab/clearsight2-grc/internal/continuity"
 "github.com/CloudSpaceLab/clearsight2-grc/internal/identity"
)

// A single, bounded summary read supplies the approved Overview composition.
// Raw assessments, Matter status reasons and compliance percentages never
// leave the database through this API.
type AssessedRequirements struct {
 Assessed int `json:"assessed"`
 Eligible int `json:"eligible"`
 Unknown int `json:"unknown"`
 Excluded int `json:"excluded"`
 Quality string `json:"quality"`
 GeneratedAt time.Time `json:"generated_at"`
}

type ProgramOverview struct {
 ProgramID string `json:"program_id"`
 ProgramRevision string `json:"program_revision"`
 AssessmentCoverage *AssessedRequirements `json:"assessment_coverage"`
 // Other approved slots remain null until supported/gap and evidence-review
 // sources have separate authorized, drill-consistent read contracts.
 Supported *int `json:"supported"`
 OpenGaps *int `json:"open_gaps"`
 EvidenceToReview *int `json:"evidence_to_review"`
}

type OverviewRepository interface {
 ReadOverview(context.Context, identity.Actor, string)(ProgramOverview,error)
}

const programOverviewSnapshotSQL = `
SELECT generated_at,program_version,calculation::text
FROM program_state_snapshots
WHERE tenant_id=$1::uuid AND program_id=$2::uuid
ORDER BY projection_version DESC LIMIT 1
`

func CheckOverviewSchema(ctx context.Context,db *sql.DB)error{
 if db==nil{return errors.New("overview database unavailable")}
 query,err:=db.PrepareContext(ctx,programOverviewSnapshotSQL)
 if err!=nil{return fmt.Errorf("overview schema incompatible: %w",err)}
 return query.Close()
}

// The request is scoped before policy, source-health and retained calculation
// reads. All facts and approvals are checked in one repeatable-read snapshot.
func (r *SQLRepository) ReadOverview(ctx context.Context,actor identity.Actor,id string)(ProgramOverview,error){
 if r==nil||r.db==nil{return ProgramOverview{},errors.New("program repository unavailable")}
 if !isUUID(id){return ProgramOverview{},ErrNotFound}
 if err:=actor.Valid(time.Now().UTC());err!=nil{return ProgramOverview{},err}
 tx,err:=r.db.BeginTx(ctx,&sql.TxOptions{ReadOnly:true,Isolation:sql.LevelRepeatableRead})
 if err!=nil{return ProgramOverview{},fmt.Errorf("begin Program overview: %w",err)}
 defer func(){_ = tx.Rollback()}()
 record,err:=getVisible(ctx,transactionReader{tx:tx},actor,id)
 if err!=nil{return ProgramOverview{},err}
 result:=ProgramOverview{ProgramID:record.ID,ProgramRevision:record.SourceRevision}
 var at time.Time
 if err:=tx.QueryRowContext(ctx,"SELECT transaction_timestamp()").Scan(&at);err!=nil{
  return ProgramOverview{},fmt.Errorf("overview transaction clock: %w",err)
 }
 policy,err:=loadVerifiedProgramPolicy(ctx,tx,actor.TenantID,actor.LegalEntityID,id,at)
 if err!=nil{return ProgramOverview{},err}

 // A current, approved requirements-only policy is the only calculation
 // v1's actor-facing projection can safely retain without other categories.
 if policy.Status==continuity.ProgramActive && validOverviewPolicy(policy.Position,at){
  health,err:=loadProgramSourceHealth(ctx,tx,actor.TenantID,id)
  if err!=nil{return ProgramOverview{},err}
  if health.Known && (health.Required==0||health.Current){
   var generated time.Time
   var programVersion int64
   var raw sql.NullString
   err:=tx.QueryRowContext(ctx,programOverviewSnapshotSQL,actor.TenantID,id).Scan(&generated,&programVersion,&raw)
   switch {
   case errors.Is(err,sql.ErrNoRows):
   case err!=nil:
    return ProgramOverview{},fmt.Errorf("read verified Overview snapshot: %w",err)
   case raw.Valid:
    var calc continuity.ProgramComplianceCalculation
    if err:=json.Unmarshal([]byte(raw.String),&calc);err!=nil{
     return ProgramOverview{},errors.New("invalid retained Program calculation")
    }
    version,err:=strconv.ParseInt(record.SourceRevision,10,64)
    if err!=nil{return ProgramOverview{},errors.New("invalid Program version")}
    result.AssessmentCoverage=verifiedAssessedRequirements(
     policy.Position.Active,version,programVersion,generated,at,calc)
   }
  }
 }
 if err:=tx.Commit();err!=nil{return ProgramOverview{},fmt.Errorf("commit Program Overview read: %w",err)}
 return result,nil
}

func validOverviewPolicy(pos *continuity.ProgramCompliancePolicyPosition,at time.Time)bool{
 if pos==nil||pos.Active==nil{return false}
 a:=pos.Active
 if a.ApprovedAt==nil||a.ApprovedAt.After(at)||len(a.Definition.Categories)!=1||
  a.Definition.Categories[0].Code!="REQUIREMENTS"||
  a.Definition.Categories[0].WeightBps!=10000||
  len(a.Definition.ExpectedVendorAssessments)!=0{return false}
 return true
}

func verifiedAssessedRequirements(active *continuity.ProgramCompliancePolicyRevision,
 version,snapshotVersion int64,generated,at time.Time,
 calc continuity.ProgramComplianceCalculation)*AssessedRequirements {
 if active==nil||active.ApprovedAt==nil||
  version<1||snapshotVersion!=version||
  generated.IsZero()||generated.Before(*active.ApprovedAt)||generated.After(at)||
  calc.PolicyRevision!=active.Definition.Revision||
  (calc.State!=continuity.ProgramComplianceFinal&&calc.State!=continuity.ProgramComplianceProvisional)||
  len(calc.Categories)!=1{
  return nil
 }
 category:=calc.Categories[0]
 if category.Code!="REQUIREMENTS"||category.WeightBps!=10000||
  category.EligibleCount<0||category.AssessedCount<0||category.UnknownCount<0||category.ExcludedCount<0||
  category.AssessedCount+category.UnknownCount!=category.EligibleCount||
  category.CoverageBps<0||category.CoverageBps>10000||
  calc.EligibleCount!=category.EligibleCount||calc.AssessedCount!=category.AssessedCount||
  calc.UnknownCount!=category.UnknownCount||calc.ExcludedCount!=category.ExcludedCount||
  (calc.State==continuity.ProgramComplianceProvisional&&calc.ScoreBps!=nil)||
  (calc.State==continuity.ProgramComplianceFinal&&calc.ScoreBps==nil){
  return nil
 }
 quality:="partial"
 if calc.State==continuity.ProgramComplianceFinal&&category.UnknownCount==0&&category.CoverageBps==10000{
  quality="current"
 }
 return &AssessedRequirements{
  Assessed:category.AssessedCount,Eligible:category.EligibleCount,
  Unknown:category.UnknownCount,Excluded:category.ExcludedCount,
  Quality:quality,GeneratedAt:generated.UTC(),
 }
}
