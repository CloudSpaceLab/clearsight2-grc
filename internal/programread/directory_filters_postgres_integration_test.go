//go:build postgres

package programread

import (
 "context"
 "testing"
)

func TestPostgresProgramDirectorySearchAndStatusRemainScoped(t *testing.T){
 db:=testDB(t)
 seed(t,db)
 ctx:=context.Background()
 for _,tc:=range []struct{id int;code,name,status string}{
  {301,"ISMS-001","Information security","ACTIVE"},
  {302,"AUD-002","Audit preparation","PAUSED"},
  {303,"PRIV-003","Data privacy","DRAFT"},
  {304,"ISMS-OTHER","Information security","ACTIVE"},
 } {
  if _,err:=db.ExecContext(ctx,`UPDATE programs SET code=$1,name=$2,status=$3 WHERE id=$4::uuid`,
    tc.code,tc.name,tc.status,fixtureUUID(tc.id));err!=nil{t.Fatal(err)}
 }
 repo:=NewSQLRepository(db)
 global:=scopedActor(1,11,true)
 for _,tc:=range []struct{
  name string;search,status string;want []int
 }{
  {"search title","security","",[]int{301}},
  {"search code","isms","",[]int{301}},
  {"status paused","","PAUSED",[]int{302}},
  {"search and status","audit","PAUSED",[]int{302}},
  {"status excludes other","audit","ACTIVE",nil},
  {"literal percent not wildcard","%","",nil},
  {"literal underscore not wildcard","_","",nil},
  {"SQL input is a value","' OR true --","",nil},
 } {
  t.Run(tc.name,func(t *testing.T){
   page,err:=repo.ListVisible(ctx,global,ListQuery{Limit:25,Search:tc.search,Status:tc.status})
   if err!=nil{t.Fatal(err)}
   if len(page.Items)!=len(tc.want){
    t.Fatalf("search %q, status %q returned %+v",tc.search,tc.status,page.Items)
   }
   for i,id:=range tc.want{
    if page.Items[i].ID!=fixtureUUID(id){t.Fatalf("unexpected record %s",page.Items[i].ID)}
   }
  })
 }
 denied:=scopedActor(1,11,false,"BANK","CARDS")
 page,err:=repo.ListVisible(ctx,denied,ListQuery{Limit:25,Search:"security"})
 if err!=nil||len(page.Items)!=0{t.Fatalf("cross-department search leaked: %+v %v",page,err)}
 otherTenant:=scopedActor(2,22,true)
 page,err=repo.ListVisible(ctx,otherTenant,ListQuery{Limit:25,Search:"security"})
 if err!=nil||len(page.Items)!=1||page.Items[0].ID!=fixtureUUID(304){
  t.Fatalf("same-name other tenant search breached scope: %+v %v",page,err)
 }
}
