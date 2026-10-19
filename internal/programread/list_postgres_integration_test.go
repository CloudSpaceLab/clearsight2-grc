//go:build postgres

package programread

import (
 "context"
 "errors"
 "testing"
)

func TestPostgresProgramListKeysetAndIsolation(t *testing.T) {
 db:=testDB(t)
 seed(t,db)
 repo:=NewSQLRepository(db)
 global:=scopedActor(1,11,true)
 ctx:=context.Background()
 var all []string
 cursor:=""
 for page:=0;page<10;page++{
  got,err:=repo.ListVisible(ctx,global,ListQuery{Limit:2,Cursor:cursor})
  if err!=nil {t.Fatal(err)}
  if len(got.Items)>2 {t.Fatal("page exceeds limit")}
  for _,record:=range got.Items {
   if record.TenantID!=global.TenantID||record.LegalEntityID!=global.LegalEntityID{
    t.Fatal("cross-tenant list row returned")
   }
   for _,id:=range all {if id==record.ID{t.Fatalf("duplicate Program %s",id)}}
   all=append(all,record.ID)
  }
  if got.NextCursor==""{break}
  if got.NextCursor==cursor{t.Fatal("cursor did not advance")}
  cursor=got.NextCursor
 }
 // Programs 301,302,303,306,307,308,309 are in actor's entity.
 if len(all)!=7 {t.Fatalf("missing or unexpected global programs: %+v",all)}
 exact:=scopedActor(1,11,false,"BANK","PAYMENTS")
 only,err:=repo.ListVisible(ctx,exact,ListQuery{Limit:25})
 if err!=nil||len(only.Items)!=1||only.Items[0].ID!=fixtureUUID(301){
  t.Fatalf("department isolation failed: %+v %v",only,err)
 }
 child:=scopedActor(1,11,false,"BANK","PAYMENTS","OPS")
 scoped,err:=repo.ListVisible(ctx,child,ListQuery{Limit:25})
 if err!=nil||len(scoped.Items)!=1||scoped.Items[0].ID!=fixtureUUID(306){
  t.Fatalf("exact child grant failed: %+v %v",scoped,err)
 }
 other:=scopedActor(2,22,true)
 cross,err:=repo.ListVisible(ctx,other,ListQuery{Limit:25})
 if err!=nil||len(cross.Items)!=1||cross.Items[0].ID!=fixtureUUID(304){
  t.Fatalf("tenant 2 isolation failed: %+v %v",cross,err)
 }
 missing:=scopedActor(1,11,false)
 if _,err:=repo.ListVisible(ctx,missing,ListQuery{Limit:25});!errors.Is(err,ErrNotFound){
  t.Fatalf("ungranted listing should not query all data: %v",err)
 }
 if _,err:=repo.ListVisible(ctx,global,ListQuery{Limit:51});err==nil{
  t.Fatal("unbounded list accepted")
 }
}
