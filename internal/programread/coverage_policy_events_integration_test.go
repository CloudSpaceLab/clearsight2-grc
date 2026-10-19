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

func TestPostgresPolicyProjectionMatchesApprovedV1Event(t *testing.T){
 db:=testDB(t)
 seed(t,db)
 seedRequirements(t,db)
 ctx:=context.Background()
 if err:=CheckCoverageSourceSchema(ctx,db);err!=nil{t.Fatal(err)}
 actor:=scopedActor(1,11,false,"BANK","PAYMENTS")
 repo:=NewSQLRepository(db)
 none,err:=repo.currentCoverageSnapshot(ctx,actor,fixtureUUID(301))
 if err!=nil||none.PolicyVerified!=nil||none.ProgramStatus!=continuity.ProgramActive{
  t.Fatalf("unconfigured policy should remain empty: %+v %v",none,err)
 }

 now:=time.Now().UTC()
 approved:=now.Add(-time.Minute)
 proposed:=now.Add(-time.Hour)
 policy:=continuity.ProgramComplianceCalculationPolicy{
  Revision:"program-v1",MinimumCoverageBps:10000,
  Categories:[]continuity.ProgramComplianceCategoryWeight{{Code:"REQUIREMENTS",WeightBps:10000}},
 }
 hash,err:=continuity.PolicyFingerprint(policy)
 if err!=nil{t.Fatal(err)}
 position:=continuity.ProgramCompliancePolicyPosition{
  LastRevision:1,Active:&continuity.ProgramCompliancePolicyRevision{
   Number:1,Definition:policy,Checksum:hash,
   MakerID:fixtureUUID(801),ApproverID:fixtureUUID(802),
   ProposedAt:proposed,ApprovedAt:&approved,
  },
 }
 apply:=func(pos continuity.ProgramCompliancePolicyPosition,kind,actorType string){
  t.Helper()
  raw,err:=json.Marshal(pos)
  if err!=nil{t.Fatal(err)}
  if _,err:=db.ExecContext(ctx,`UPDATE programs SET calculation_policy=$1::jsonb
    WHERE id=$2::uuid`,raw,fixtureUUID(301));err!=nil{t.Fatal(err)}
  payload,err:=json.Marshal(map[string]any{"position":pos,"rationale":"Synthetic committee approval"})
  if err!=nil{t.Fatal(err)}
  if _,err:=db.ExecContext(ctx,`DELETE FROM continuity_events WHERE tenant_id=$1::uuid
    AND aggregate_type='PROGRAM' AND aggregate_id=$2::uuid`,fixtureUUID(1),fixtureUUID(301));err!=nil{t.Fatal(err)}
  if _,err:=db.ExecContext(ctx,`INSERT INTO continuity_events
    (tenant_id,aggregate_type,aggregate_id,aggregate_version,event_type,payload,actor_type,actor_id,occurred_at)
    VALUES($1::uuid,'PROGRAM',$2::uuid,5,$3,$4::jsonb,$5,$6::uuid,$7)`,
    fixtureUUID(1),fixtureUUID(301),kind,payload,actorType,fixtureUUID(802),approved);err!=nil{t.Fatal(err)}
 }
 apply(position,"PROGRAM_CALCULATION_POLICY_APPROVED","PERSON")
 ready,err:=repo.currentCoverageSnapshot(ctx,actor,fixtureUUID(301))
 if err!=nil||ready.PolicyVerified==nil||ready.PolicyVerified.Active==nil||
   ready.PolicyVerified.Active.Checksum!=hash{
  t.Fatalf("authentic v1 approved policy could not be verified: %+v %v",ready.PolicyVerified,err)
 }

 t.Run("projection tampering",func(t *testing.T){
  changed:=position
  active:=*position.Active
  active.Checksum="forged-checksum"
  changed.Active=&active
  raw,_:=json.Marshal(changed)
  if _,err:=db.ExecContext(ctx,`UPDATE programs SET calculation_policy=$1::jsonb WHERE id=$2::uuid`,
    raw,fixtureUUID(301));err!=nil{t.Fatal(err)}
  if _,err:=repo.currentCoverageSnapshot(ctx,actor,fixtureUUID(301));err==nil{
   t.Fatal("materialized policy changed without an event was accepted")
  }
  apply(position,"PROGRAM_CALCULATION_POLICY_APPROVED","PERSON")
 })

 t.Run("wrong event actor type",func(t *testing.T){
  apply(position,"PROGRAM_CALCULATION_POLICY_APPROVED","SERVICE")
  if _,err:=repo.currentCoverageSnapshot(ctx,actor,fixtureUUID(301));err==nil{
   t.Fatal("service account approved a Program policy")
  }
  apply(position,"PROGRAM_CALCULATION_POLICY_APPROVED","PERSON")
 })

 t.Run("missing approval",func(t *testing.T){
  apply(position,"PROGRAM_CALCULATION_POLICY_PROPOSED","PERSON")
  if _,err:=repo.currentCoverageSnapshot(ctx,actor,fixtureUUID(301));err==nil{
   t.Fatal("current position without approval event was accepted")
  }
  apply(position,"PROGRAM_CALCULATION_POLICY_APPROVED","PERSON")
 })

 t.Run("same maker and checker",func(t *testing.T){
  changed:=position
  active:=*position.Active
  active.MakerID=fixtureUUID(802)
  changed.Active=&active
  apply(changed,"PROGRAM_CALCULATION_POLICY_APPROVED","PERSON")
  if _,err:=repo.currentCoverageSnapshot(ctx,actor,fixtureUUID(301));err==nil{
   t.Fatal("self-approved policy accepted")
  }
  apply(position,"PROGRAM_CALCULATION_POLICY_APPROVED","PERSON")
 })

 t.Run("unavailable to another tenant or department",func(t *testing.T){
  for _,bad:=range []continuity.ProgramStatus{continuity.ProgramActive}{
   _=bad
   for _,a:=range []struct{tenant,entity int;global bool;grant []string}{
    {2,22,true,nil},{1,12,true,nil},{1,11,false,[]string{"BANK","CARDS"}},
   }{
    denied:=scopedActor(a.tenant,a.entity,a.global,a.grant...)
    result,err:=repo.currentCoverageSnapshot(ctx,denied,fixtureUUID(301))
    if !errors.Is(err,ErrNotFound)||result.PolicyVerified!=nil{
     t.Fatalf("policy cross-scope read: %+v %v",result.PolicyVerified,err)
    }
   }
  }
 })
}
