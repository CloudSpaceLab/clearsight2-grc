//go:build postgres
package programread
import (
 "context"
 "encoding/json"
 "errors"
 "testing"
 "time"
 "github.com/CloudSpaceLab/clearsight2-grc/internal/continuity"
)
func TestPostgresApprovedOverviewAssessmentPopulation(t *testing.T) {
 db:=testDB(t);seed(t,db)
 actor:=scopedActor(1,11,false,"BANK","PAYMENTS")
 reader:=NewSQLRepository(db);ctx:=context.Background()
 if err:=CheckOverviewSchema(ctx,db);err!=nil{t.Fatal(err)}
 empty,err:=reader.ReadOverview(ctx,actor,fixtureUUID(301))
 if err!=nil||empty.AssessmentCoverage!=nil{t.Fatalf("unconfigured Program showed assessment result %+v %v",empty,err)}
 now:=time.Now().UTC();approved:=now.Add(-2*time.Minute)
 policy:=continuity.ProgramComplianceCalculationPolicy{
  Revision:"program-v1",MinimumCoverageBps:9000,
  Categories:[]continuity.ProgramComplianceCategoryWeight{{Code:"REQUIREMENTS",WeightBps:10000}},
 }
 checksum,err:=continuity.PolicyFingerprint(policy);if err!=nil{t.Fatal(err)}
 position:=continuity.ProgramCompliancePolicyPosition{LastRevision:1,Active:&continuity.ProgramCompliancePolicyRevision{
  Number:1,Definition:policy,Checksum:checksum,MakerID:fixtureUUID(801),ApproverID:fixtureUUID(802),
  ProposedAt:approved.Add(-time.Minute),ApprovedAt:&approved,
 }}
 raw,_:=json.Marshal(position)
 event,_:=json.Marshal(map[string]any{"position":position,"rationale":"Synthetic approved policy"})
 if _,err:=db.ExecContext(ctx,`UPDATE programs SET calculation_policy=$1::jsonb WHERE id=$2::uuid`,raw,fixtureUUID(301));err!=nil{t.Fatal(err)}
 if _,err:=db.ExecContext(ctx,`INSERT INTO continuity_events
  (tenant_id,aggregate_type,aggregate_id,aggregate_version,event_type,payload,actor_type,actor_id,occurred_at)
  VALUES($1::uuid,'PROGRAM',$2::uuid,5,'PROGRAM_CALCULATION_POLICY_APPROVED',$3::jsonb,'PERSON',$4::uuid,$5)`,
  fixtureUUID(1),fixtureUUID(301),event,fixtureUUID(802),approved);err!=nil{t.Fatal(err)}
 score:=int64(10000)
 calc:=continuity.ProgramComplianceCalculation{
  PolicyRevision:"program-v1",State:continuity.ProgramComplianceFinal,ScoreBps:&score,
  EligibleCount:3,AssessedCount:3,UnknownCount:0,ExcludedCount:1,CoverageBps:10000,
  Categories:[]continuity.ProgramComplianceCategoryResult{{
   Code:"REQUIREMENTS",WeightBps:10000,EligibleCount:3,AssessedCount:3,ExcludedCount:1,
   CoverageBps:10000,ScoreBps:&score,
  }},
 }
 put:=func(revision int64){
  t.Helper();encoded,_:=json.Marshal(calc)
  if _,err:=db.ExecContext(ctx,`DELETE FROM program_state_snapshots WHERE program_id=$1::uuid`,fixtureUUID(301));err!=nil{t.Fatal(err)}
  if _,err:=db.ExecContext(ctx,`INSERT INTO program_state_snapshots
   (id,tenant_id,program_id,program_version,projection_version,generated_at,calculation)
   VALUES($1::uuid,$2::uuid,$3::uuid,$4,1,$5,$6::jsonb)`,
   fixtureUUID(901),fixtureUUID(1),fixtureUUID(301),revision,now.Add(-time.Minute),encoded);err!=nil{t.Fatal(err)}
 }
 put(7)
 got,err:=reader.ReadOverview(ctx,actor,fixtureUUID(301))
 if err!=nil||got.AssessmentCoverage==nil||got.AssessmentCoverage.Assessed!=3||
  got.AssessmentCoverage.Eligible!=3||got.AssessmentCoverage.Quality!="current"||
  got.Supported!=nil||got.OpenGaps!=nil||got.EvidenceToReview!=nil{
  t.Fatalf("approved assessment population not projected: %+v %v",got,err)
 }
 for _,tc:=range []struct{tenant,entity int;global bool;path []string}{
  {2,22,true,nil},{1,12,true,nil},{1,11,false,[]string{"BANK","CARDS"}},
 }{
  a:=scopedActor(tc.tenant,tc.entity,tc.global,tc.path...)
  result,err:=reader.ReadOverview(ctx,a,fixtureUUID(301))
  if !errors.Is(err,ErrNotFound)||result.AssessmentCoverage!=nil{
   t.Fatalf("scope leaked: %+v %v",result,err)
  }
 }
 put(6)
 stale,err:=reader.ReadOverview(ctx,actor,fixtureUUID(301))
 if err!=nil||stale.AssessmentCoverage!=nil{t.Fatalf("stale calculation accepted %+v %v",stale,err)}
 put(7)
 if _,err:=db.ExecContext(ctx,`INSERT INTO evidence_sources(id,tenant_id,status,health)
 VALUES($1::uuid,$2::uuid,'ACTIVE','STALE')`,fixtureUUID(803),fixtureUUID(1));err!=nil{t.Fatal(err)}
 if _,err:=db.ExecContext(ctx,`INSERT INTO program_requirements
 (id,tenant_id,program_id,code,title,version,source_id,status,effective_from)
 VALUES($1::uuid,$2::uuid,$3::uuid,'SEC','Synthetic',1,$4::uuid,'APPROVED',$5)`,
 fixtureUUID(804),fixtureUUID(1),fixtureUUID(301),fixtureUUID(803),now.Add(-time.Hour));err!=nil{t.Fatal(err)}
 unhealthy,err:=reader.ReadOverview(ctx,actor,fixtureUUID(301))
 if err!=nil||unhealthy.AssessmentCoverage!=nil{t.Fatalf("unhealthy source accepted %+v %v",unhealthy,err)}
}
