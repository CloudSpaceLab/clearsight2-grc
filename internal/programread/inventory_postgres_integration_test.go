//go:build postgres

package programread

import (
 "context"
 "errors"
 "testing"
 "time"
)

func TestPostgresInventoryScopeAndFiltering(t *testing.T) {
 db:=testDB(t)
 seed(t,db)
 seedRequirements(t,db)
 now:=time.Now().UTC()
 exec:=func(s string, args ...any) {t.Helper();if _,err:=db.Exec(s,args...);err!=nil{t.Fatal(err)}}
 for _,v:=range []struct{id,tenant,program int;status string}{
  {501,1,301,"IMPLEMENTED"},{502,1,301,"PLANNED"},{503,1,301,"RETIRED"},
  {504,1,302,"IMPLEMENTED"},{505,2,304,"IMPLEMENTED"},
 } {
  exec(`INSERT INTO control_implementations(id,tenant_id,program_id,name,status,version,updated_at,effective_from)
   VALUES($1::uuid,$2::uuid,$3::uuid,'Synthetic control',$4,1,$5,$6)`,
   fixtureUUID(v.id),fixtureUUID(v.tenant),fixtureUUID(v.program),v.status,now,now.Add(-time.Hour))
 }
 for _,v:=range []struct{tenant,program,requirement,control int}{
  {1,301,401,501},{1,301,402,502},{1,301,404,503},{1,302,407,504},{2,304,408,505},
 }{
  exec(`INSERT INTO requirement_control_links(tenant_id,program_id,requirement_id,implementation_id)
   VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid)`,
   fixtureUUID(v.tenant),fixtureUUID(v.program),fixtureUUID(v.requirement),fixtureUUID(v.control))
 }
 for _,v:=range []struct{id,tenant,program,requirement,control int;status string}{
  {601,1,301,401,0,"ACTIVE"},{602,1,301,0,501,"ACTIVE"},
  {603,1,301,401,0,"DRAFT"},{604,1,301,404,0,"ACTIVE"},
  {605,1,301,0,503,"ACTIVE"},{606,1,302,407,0,"ACTIVE"},{607,2,304,408,0,"ACTIVE"},
 }{
  var req,ctrl any
  if v.requirement>0{req=fixtureUUID(v.requirement)}
  if v.control>0{ctrl=fixtureUUID(v.control)}
  exec(`INSERT INTO evidence_contracts(id,tenant_id,program_id,requirement_id,control_implementation_id,code,name,status,version,updated_at)
   VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6,'Synthetic contract',$7,1,$8)`,
   fixtureUUID(v.id),fixtureUUID(v.tenant),fixtureUUID(v.program),req,ctrl,"E-"+fixtureUUID(v.id),v.status,now)
 }
 repo:=NewSQLRepository(db)
 actor:=scopedActor(1,11,false,"BANK","PAYMENTS")
 for _,tc:=range []struct{kind InventoryKind;ids []int}{
  {InventoryControls,[]int{501,502}},
  {InventoryEvidenceContracts,[]int{601,602}},
 } {
  found:=map[string]bool{}
  cursor:=""
  for i:=0;i<4;i++{
   page,err:=repo.ListInventory(context.Background(),actor,fixtureUUID(301),tc.kind,ListQuery{Limit:1,Cursor:cursor})
   if err!=nil{t.Fatal(err)}
   if page.ProgramRevision!="7"||len(page.Items)>1{t.Fatalf("invalid %s page: %+v",tc.kind,page)}
   for _,item:=range page.Items{if found[item.ID]{t.Fatal("duplicate item")};found[item.ID]=true}
   if page.NextCursor==""{break}
   cursor=page.NextCursor
  }
  if len(found)!=len(tc.ids){t.Fatalf("%s unexpected entries: %v",tc.kind,found)}
  for _,id:=range tc.ids{if !found[fixtureUUID(id)]{t.Fatalf("%s missing %d",tc.kind,id)}}
  for _,denied:=range []struct{actorTenant,actorEntity,program int;global bool;path []string}{
   {2,22,301,true,nil},{1,12,301,true,nil},{1,11,301,false,[]string{"BANK","CARDS"}},
  }{
   a:=scopedActor(denied.actorTenant,denied.actorEntity,denied.global,denied.path...)
   if _,err:=repo.ListInventory(context.Background(),a,fixtureUUID(denied.program),tc.kind,ListQuery{Limit:2});!errors.Is(err,ErrNotFound){t.Fatalf("%s scope not denied: %v",tc.kind,err)}
  }
 }
}
