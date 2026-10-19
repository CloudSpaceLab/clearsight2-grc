//go:build postgres

package programread

import (
 "context"
 "errors"
 "testing"
 "time"
)

func TestPostgresActorVisibleMatterSnapshot(t *testing.T){
 db:=testDB(t)
 seed(t,db)
 ctx:=context.Background()
 if err:=CheckCoverageSourceSchema(ctx,db);err!=nil{t.Fatal(err)}
 at:=time.Now().UTC().Add(-time.Minute)
 principal40:=fixtureUUID(40)
 principal41:=fixtureUUID(41)
 cases:=[]struct{
  id,tenant,program,entity int
  status,scope string
  updated time.Time
 }{
  {901,1,301,11,"TRIAGE",`{"business_area":"Payments"}`,at},
  {902,1,301,11,"TRIAGE",`{"access":"RESTRICTED","allowed_principal_ids":["`+principal40+`"]}`,at.Add(time.Second)},
  {903,1,301,11,"TRIAGE",`{"access":"RESTRICTED","allowed_principal_ids":["`+principal41+`"]}`,at.Add(2*time.Second)},
  {904,1,301,11,"TRIAGE",`{"access":"RESTRICTED","allowed_principal_ids":["`+principal40+`",7]}`,at},
  {905,1,301,11,"CLOSED",`{"access":"PUBLIC"}`,at},
  {906,1,301,11,"TRIAGE",`{"access":"RESTRICTED","allowed_principal_ids":[]}`,at},
  {907,1,301,11,"ASSESSMENT",`{"access":"PUBLIC"}`,at.Add(3*time.Second)},
  {908,1,302,11,"TRIAGE",`{"access":"PUBLIC"}`,at},
  {909,2,304,22,"TRIAGE",`{"access":"PUBLIC"}`,at},
  {910,1,301,12,"TRIAGE",`{"access":"PUBLIC"}`,at.Add(10*time.Second)},
 }
 for _,tc:=range cases{
  if _,err:=db.ExecContext(ctx,`INSERT INTO matters(id,tenant_id,legal_entity_id,status,scope,updated_at)
 VALUES($1::uuid,$2::uuid,$6::uuid,$3,$4::jsonb,$5)`,fixtureUUID(tc.id),
   fixtureUUID(tc.tenant),tc.status,tc.scope,tc.updated,fixtureUUID(tc.entity));err!=nil{t.Fatal(err)}
  if _,err:=db.ExecContext(ctx,`INSERT INTO matter_links(tenant_id,matter_id,program_id)
 VALUES($1::uuid,$2::uuid,$3::uuid)`,fixtureUUID(tc.tenant),
   fixtureUUID(tc.id),fixtureUUID(tc.program));err!=nil{t.Fatal(err)}
 }
 // The same Matter may be linked to several requirements or controls.
 if _,err:=db.ExecContext(ctx,`INSERT INTO matter_links(tenant_id,matter_id,program_id)
 VALUES($1::uuid,$2::uuid,$3::uuid)`,fixtureUUID(1),fixtureUUID(901),fixtureUUID(301));err!=nil{t.Fatal(err)}

 repo:=NewSQLRepository(db)
 actor:=scopedActor(1,11,false,"BANK","PAYMENTS")
 snapshot,err:=repo.currentCoverageSnapshot(ctx,actor,fixtureUUID(301))
 if err!=nil{t.Fatal(err)}
 if snapshot.VisibleMatters.OpenCount!=3{
  t.Fatalf("principal 40 should see internal, specifically granted and public; got %+v",snapshot.VisibleMatters)
 }
 if delta:=snapshot.VisibleMatters.LatestAt.Sub(at.Add(3*time.Second));delta < -time.Millisecond || delta > time.Millisecond{
  t.Fatalf("unexpected visible latest Matter activity %+v",snapshot.VisibleMatters)
 }
 otherPrincipal:=actor
 otherPrincipal.PrincipalID=fixtureUUID(42)
 restricted,err:=repo.currentCoverageSnapshot(ctx,otherPrincipal,fixtureUUID(301))
 if err!=nil{t.Fatal(err)}
 if restricted.VisibleMatters.OpenCount!=2{
  t.Fatalf("ungranted principal counted restricted Matters: %+v",restricted.VisibleMatters)
 }

 for _,tc:=range []struct{name string;actorTenant,actorEntity int;grant []string;global bool}{
  {"wrong department",1,11,[]string{"BANK","CARDS"},false},
  {"cross legal entity",1,12,nil,true},
  {"cross tenant",2,22,nil,true},
 }{
  t.Run(tc.name,func(t *testing.T){
   denied:=scopedActor(tc.actorTenant,tc.actorEntity,tc.global,tc.grant...)
   result,err:=repo.currentCoverageSnapshot(ctx,denied,fixtureUUID(301))
   if !errors.Is(err,ErrNotFound)||result.VisibleMatters.OpenCount!=0{
    t.Fatalf("cross-scope visibility leaked %+v %v",result,err)
   }
  })
 }
}
