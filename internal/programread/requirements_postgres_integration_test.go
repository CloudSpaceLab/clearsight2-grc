//go:build postgres

package programread

import (
 "context"
 "database/sql"
 "errors"
 "testing"
 "time"
)

func seedRequirements(t *testing.T,db *sql.DB){
 t.Helper()
 now:=time.Now().UTC()
 for _,tc:=range []struct{
  id,tenant,program int
  status,code string
  from time.Time
  until any
 }{
  {401,1,301,"APPROVED","R-A",now.Add(-24*time.Hour),nil},
  {402,1,301,"APPROVED","R-B",now.Add(-23*time.Hour),nil},
  {403,1,301,"APPROVED","R-C",now.Add(-22*time.Hour),nil},
  {404,1,301,"DRAFT","DRAFT-SECRET",now.Add(-21*time.Hour),nil},
  {405,1,301,"APPROVED","FUTURE",now.Add(time.Hour),nil},
  {406,1,301,"APPROVED","EXPIRED",now.Add(-48*time.Hour),now.Add(-time.Hour)},
  {407,1,302,"APPROVED","OTHER-DEPARTMENT",now.Add(-time.Hour),nil},
  {408,2,304,"APPROVED","OTHER-TENANT",now.Add(-time.Hour),nil},
 } {
  _,err:=db.Exec(`INSERT INTO program_requirements
(id,tenant_id,program_id,code,title,version,status,effective_from,effective_until)
VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,1,$6,$7,$8)`,
    fixtureUUID(tc.id),fixtureUUID(tc.tenant),fixtureUUID(tc.program),
    tc.code,"Reference "+tc.code,tc.status,tc.from,tc.until)
  if err!=nil{t.Fatal(err)}
 }
}

func TestPostgresApprovedRequirementsIsolationAndCursor(t *testing.T){
 db:=testDB(t)
 seed(t,db)
 seedRequirements(t,db)
 reader:=NewSQLRepository(db)
 allowed:=scopedActor(1,11,false,"BANK","PAYMENTS")
 cursor:=""
 seen:=map[string]bool{}
 for i:=0;i<4;i++{
  p,err:=reader.ListApprovedRequirements(context.Background(),allowed,fixtureUUID(301),ListQuery{Limit:2,Cursor:cursor})
  if err!=nil{t.Fatal(err)}
  if p.ProgramRevision!="7"||p.ProgramID!=fixtureUUID(301)||len(p.Items)>2{
   t.Fatalf("unexpected approved page %+v",p)
  }
  for _,item:=range p.Items{
   if seen[item.ID]{t.Fatalf("duplicate requirement %q",item.ID)}
   seen[item.ID]=true
   if item.Code=="DRAFT-SECRET"||item.Code=="FUTURE"||item.Code=="EXPIRED"{
    t.Fatalf("non-current requirement exposed: %+v",item)
   }
  }
  if p.NextCursor==""{break}
  cursor=p.NextCursor
 }
 if len(seen)!=3{t.Fatalf("approved requirement population should be 3, got %d",len(seen))}
 for _,tc:=range []struct{name string;actorTenant,actorEntity,program int;global bool;grants []string}{
  {"other department",1,11,301,false,[]string{"BANK","CARDS"}},
  {"other entity",1,12,301,true,nil},
  {"other tenant",2,22,301,true,nil},
  {"unscoped program",1,11,303,false,[]string{"BANK","PAYMENTS"}},
 }{
  t.Run(tc.name,func(t *testing.T){
   a:=scopedActor(tc.actorTenant,tc.actorEntity,tc.global,tc.grants...)
   p,err:=reader.ListApprovedRequirements(context.Background(),a,fixtureUUID(tc.program),ListQuery{Limit:10})
   if !errors.Is(err,ErrNotFound)||len(p.Items)>0{
    t.Fatalf("cross-scope reference leaked: %+v %v",p,err)
   }
  })
 }
 global:=scopedActor(1,11,true)
 p,err:=reader.ListApprovedRequirements(context.Background(),global,fixtureUUID(302),ListQuery{Limit:10})
 if err!=nil||len(p.Items)!=1||p.Items[0].Code!="OTHER-DEPARTMENT"{
  t.Fatalf("global reader missing own entity requirement: %+v %v",p,err)
 }
 expired:=allowed;expired.ExpiresAt=time.Now().Add(-time.Second)
 if _,err:=reader.ListApprovedRequirements(context.Background(),expired,fixtureUUID(301),ListQuery{Limit:10});err==nil{
  t.Fatal("expired identity accessed requirements")
 }
 if _,err:=reader.ListApprovedRequirements(context.Background(),allowed,fixtureUUID(301),ListQuery{Limit:51});err==nil{
  t.Fatal("unbounded requirement population accepted")
 }
}
