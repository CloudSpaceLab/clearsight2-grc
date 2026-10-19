//go:build postgres

package programread

import (
 "context"
 "errors"
 "testing"
 "time"
)

func TestPostgresSourceHealthSnapshotAndPermissions(t *testing.T){
 db:=testDB(t)
 seed(t,db)
 seedRequirements(t,db)
 ctx:=context.Background()
 if err:=CheckCoverageSourceSchema(ctx,db);err!=nil{t.Fatal(err)}
 repo:=NewSQLRepository(db)
 actor:=scopedActor(1,11,false,"BANK","PAYMENTS")

 none,err:=repo.currentCoverageSnapshot(ctx,actor,fixtureUUID(301))
 if err!=nil||!none.SourceHealth.Known||none.SourceHealth.Required!=0||none.SourceHealth.Current{
  t.Fatalf("unexpected source-free health: %+v %v",none.SourceHealth,err)
 }

 for _,v:=range []struct{id,tenant int;status,health string}{
  {801,1,"ACTIVE","CURRENT"},
  {802,1,"ACTIVE","STALE"},
  {803,1,"ACTIVE","CURRENT"},
  {804,1,"ACTIVE","CURRENT"},
 } {
  _,err:=db.ExecContext(ctx,`INSERT INTO evidence_sources(id,tenant_id,status,health)
    VALUES($1::uuid,$2::uuid,$3,$4)`,fixtureUUID(v.id),fixtureUUID(v.tenant),v.status,v.health)
  if err!=nil{t.Fatal(err)}
 }
 for _,v:=range []struct{requirement,source int}{
  {401,801},{404,803},{405,804},
 }{
  if _,err:=db.ExecContext(ctx,`UPDATE program_requirements SET source_id=$1::uuid WHERE id=$2::uuid`,
    fixtureUUID(v.source),fixtureUUID(v.requirement));err!=nil{t.Fatal(err)}
 }
 now:=time.Now().UTC()
 if _,err:=db.ExecContext(ctx,`INSERT INTO evidence_contracts
 (id,tenant_id,program_id,requirement_id,code,name,status,version,updated_at)
 VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,'SYN','Synthetic contract','ACTIVE',1,$5)`,
 fixtureUUID(901),fixtureUUID(1),fixtureUUID(301),fixtureUUID(402),now);err!=nil{t.Fatal(err)}
 if _,err:=db.ExecContext(ctx,`INSERT INTO evidence_contract_sources
 (tenant_id,program_id,contract_id,source_id)
 VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid),($1::uuid,$2::uuid,$3::uuid,$5::uuid)`,
 fixtureUUID(1),fixtureUUID(301),fixtureUUID(901),fixtureUUID(802),fixtureUUID(801));err!=nil{t.Fatal(err)}

 unhealthy,err:=repo.currentCoverageSnapshot(ctx,actor,fixtureUUID(301))
 if err!=nil||!unhealthy.SourceHealth.Known||unhealthy.SourceHealth.Required!=2||unhealthy.SourceHealth.Current{
  t.Fatalf("stale dependent source not detected: %+v %v",unhealthy.SourceHealth,err)
 }
 if _,err:=db.ExecContext(ctx,`UPDATE evidence_sources SET health='CURRENT' WHERE id=$1::uuid`,fixtureUUID(802));err!=nil{t.Fatal(err)}
 healthy,err:=repo.currentCoverageSnapshot(ctx,actor,fixtureUUID(301))
 if err!=nil||healthy.SourceHealth.Required!=2||!healthy.SourceHealth.Current||!healthy.SourceHealth.Known{
  t.Fatalf("approved source dependence not recovered: %+v %v",healthy.SourceHealth,err)
 }
 if _,err:=db.ExecContext(ctx,`UPDATE evidence_sources SET status='PAUSED' WHERE id=$1::uuid`,fixtureUUID(801));err!=nil{t.Fatal(err)}
 paused,err:=repo.currentCoverageSnapshot(ctx,actor,fixtureUUID(301))
 if err!=nil||paused.SourceHealth.Current||paused.SourceHealth.Required!=2{
  t.Fatalf("paused source counted current: %+v %v",paused.SourceHealth,err)
 }
 if _,err:=db.ExecContext(ctx,`UPDATE evidence_contracts SET status='DRAFT' WHERE id=$1::uuid`,fixtureUUID(901));err!=nil{t.Fatal(err)}
 draft,err:=repo.currentCoverageSnapshot(ctx,actor,fixtureUUID(301))
 if err!=nil||draft.SourceHealth.Required!=1{
  t.Fatalf("draft contract source still required: %+v %v",draft.SourceHealth,err)
 }

 for _,denied:=range []struct{name string;tenant,entity int;global bool;grant []string}{
  {"other tenant",2,22,true,nil},
  {"other entity",1,12,true,nil},
  {"wrong department",1,11,false,[]string{"BANK","CARDS"}},
 } {
  t.Run(denied.name,func(t *testing.T){
   a:=scopedActor(denied.tenant,denied.entity,denied.global,denied.grant...)
   value,err:=repo.currentCoverageSnapshot(ctx,a,fixtureUUID(301))
   if !errors.Is(err,ErrNotFound)||value.Coverage!=nil||value.SourceHealth.Known{
    t.Fatalf("unauthorized source health visible: %+v %v",value,err)
   }
  })
 }
}
