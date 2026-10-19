//go:build postgres

package programread

import (
 "context"
 "errors"
 "testing"
 "time"
)

func TestPostgresCanonicalCoverageSourceSnapshot(t *testing.T){
 db:=testDB(t)
 seed(t,db)
 seedRequirements(t,db)
 ctx:=context.Background()
 if err:=CheckCoverageSourceSchema(ctx,db);err!=nil{t.Fatal(err)}
 now:=time.Now().UTC()
 exec:=func(sqlText string,args ...any){
  t.Helper()
  if _,err:=db.ExecContext(ctx,sqlText,args...);err!=nil{t.Fatal(err)}
 }
 exec(`INSERT INTO program_applicability(id,tenant_id,program_id,requirement_id,status,effective_from,created_at)
 VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,'APPLICABLE',$5,$5)`,
  fixtureUUID(701),fixtureUUID(1),fixtureUUID(301),fixtureUUID(401),now.Add(-time.Hour))
 exec(`INSERT INTO control_implementations(id,tenant_id,program_id,name,status,version,updated_at,effective_from)
 VALUES($1::uuid,$2::uuid,$3::uuid,'Synthetic implementation','IMPLEMENTED',1,$4,$5)`,
  fixtureUUID(702),fixtureUUID(1),fixtureUUID(301),now,now.Add(-time.Hour))
 exec(`INSERT INTO requirement_control_links(tenant_id,program_id,requirement_id,implementation_id,created_at)
 VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5)`,
  fixtureUUID(1),fixtureUUID(301),fixtureUUID(401),fixtureUUID(702),now.Add(-time.Hour))
 exec(`INSERT INTO evidence_contracts(id,tenant_id,program_id,requirement_id,code,name,status,version,updated_at,freshness_minutes,minimum_coverage)
 VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,'SYN','Synthetic contract','ACTIVE',1,$5,60,0.9)`,
  fixtureUUID(703),fixtureUUID(1),fixtureUUID(301),fixtureUUID(401),now)
 exec(`INSERT INTO evidence_assessments(id,tenant_id,program_id,contract_id,conclusion,coverage,assessed_at,created_at)
 VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,'SUPPORTED',1,$5,$5)`,
  fixtureUUID(704),fixtureUUID(1),fixtureUUID(301),fixtureUUID(703),now.Add(-time.Minute))
 actor:=scopedActor(1,11,false,"BANK","PAYMENTS")
 repo:=NewSQLRepository(db)
 current,err:=repo.currentCoverage(ctx,actor,fixtureUUID(301))
 if err!=nil{t.Fatal(err)}
 if len(current)!=3 || !current[fixtureUUID(401)].Complete{
  t.Fatalf("verified contract chain missing or wrong requirement population: %+v",current)
 }
 if current[fixtureUUID(402)].Complete||current[fixtureUUID(403)].Complete{
  t.Fatal("missing applicability/evidence incorrectly passed")
 }
 if _,ok:=current[fixtureUUID(404)];ok{t.Fatal("draft requirement returned in canonical coverage")}
 if _,ok:=current[fixtureUUID(405)];ok{t.Fatal("future requirement returned in canonical coverage")}
 if _,ok:=current[fixtureUUID(406)];ok{t.Fatal("expired requirement returned in canonical coverage")}
 for _,denied:=range []struct{name string;aTenant,aEntity,program int;global bool;grants []string}{
  {"other legal entity",1,12,301,true,nil},
  {"other tenant",2,22,301,true,nil},
  {"wrong department",1,11,301,false,[]string{"BANK","CARDS"}},
  {"parent not inherited",1,11,301,false,[]string{"BANK"}},
 }{
  t.Run(denied.name,func(t *testing.T){
   a:=scopedActor(denied.aTenant,denied.aEntity,denied.global,denied.grants...)
   result,err:=repo.currentCoverage(ctx,a,fixtureUUID(denied.program))
   if !errors.Is(err,ErrNotFound)||result!=nil{t.Fatalf("unauthorized source evaluated: %+v %v",result,err)}
  })
 }
 exec(`UPDATE evidence_assessments SET assessed_at=$1 WHERE id=$2::uuid`,
  now.Add(-3*time.Hour),fixtureUUID(704))
 expired,err:=repo.currentCoverage(ctx,actor,fixtureUUID(301))
 if err!=nil||expired[fixtureUUID(401)].Complete{
  t.Fatalf("stale evidence incorrectly accepted: %+v %v",expired[fixtureUUID(401)],err)
 }
 exec(`INSERT INTO program_requirements(id,tenant_id,program_id,code,title,version,status,effective_from)
 SELECT uuidv7(),$1::uuid,$2::uuid,'BULK','Synthetic bounded fact',1,'DRAFT',$3 FROM generate_series(1,5001)`,
  fixtureUUID(1),fixtureUUID(301),now.Add(-time.Hour))
 if _,err:=repo.currentCoverage(ctx,actor,fixtureUUID(301));!errors.Is(err,errCoveragePopulationExceeded){
  t.Fatalf("oversized source population must fail closed: %v",err)
 }
}
