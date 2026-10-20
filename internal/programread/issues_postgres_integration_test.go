//go:build postgres
package programread
import (
 "context"
 "errors"
 "testing"
 "time"
)
func TestPostgresVisibleIssuesPaginationAndPrivacy(t *testing.T){
 db:=testDB(t);seed(t,db)
 ctx:=context.Background()
 if err:=CheckSchema(ctx,db);err!=nil{t.Fatal(err)}
 at:=time.Now().UTC()
 cases:=[]struct{id,tenant,entity,program int;status,scope string}{
  {911,1,11,301,"TRIAGE",`{"access":"INTERNAL"}`},
  {912,1,11,301,"ASSESSMENT",`{"access":"RESTRICTED","allowed_principal_ids":["00000000-0000-4000-8000-000000000040"]}`},
  {913,1,11,301,"TRIAGE",`{"access":"RESTRICTED","allowed_principal_ids":["00000000-0000-4000-8000-000000000041"]}`},
  {914,1,11,301,"CLOSED",`{"access":"PUBLIC"}`},
  {915,1,11,301,"TRIAGE",`{"access":"RESTRICTED","allowed_principal_ids":[44]}`},
  {916,1,12,301,"TRIAGE",`{"access":"PUBLIC"}`},
  {917,1,11,302,"TRIAGE",`{"access":"PUBLIC"}`},
  {918,2,22,304,"TRIAGE",`{"access":"PUBLIC"}`},
 }
 for _,c:=range cases{
  if _,err:=db.ExecContext(ctx,`INSERT INTO matters
   (id,tenant_id,legal_entity_id,reference,title,matter_type,status,scope,priority,updated_at)
   VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5,'CONTROL_GAP',$6,$7::jsonb,3,$8)`,
    fixtureUUID(c.id),fixtureUUID(c.tenant),fixtureUUID(c.entity),
    "ISSUE-"+fixtureUUID(c.id),"Synthetic confidential issue",c.status,c.scope,at.Add(time.Duration(c.id)*time.Millisecond));err!=nil{t.Fatal(err)}
  if _,err:=db.ExecContext(ctx,`INSERT INTO matter_links(tenant_id,matter_id,program_id)
   VALUES($1::uuid,$2::uuid,$3::uuid)`,fixtureUUID(c.tenant),fixtureUUID(c.id),fixtureUUID(c.program));err!=nil{t.Fatal(err)}
 }
 // Duplicate link cannot inflate either the summary or the list.
 if _,err:=db.ExecContext(ctx,`INSERT INTO matter_links(tenant_id,matter_id,program_id)
 VALUES($1::uuid,$2::uuid,$3::uuid)`,fixtureUUID(1),fixtureUUID(911),fixtureUUID(301));err!=nil{t.Fatal(err)}
 reader:=NewSQLRepository(db);actor:=scopedActor(1,11,false,"BANK","PAYMENTS")
 page,err:=reader.ListVisibleIssues(ctx,actor,fixtureUUID(301),ListQuery{Limit:1})
 if err!=nil||len(page.Items)!=1||page.NextCursor==""||page.Items[0].ID!=fixtureUUID(912){
  t.Fatalf("principal-visible page wrong: %+v %v",page,err)
 }
 second,err:=reader.ListVisibleIssues(ctx,actor,fixtureUUID(301),ListQuery{Limit:1,Cursor:page.NextCursor})
 if err!=nil||len(second.Items)!=1||second.Items[0].ID!=fixtureUUID(911)||second.NextCursor!=""{
  t.Fatalf("second page leaked hidden Matter: %+v %v",second,err)
 }
 other:=actor;other.PrincipalID=fixtureUUID(42)
 page,err=reader.ListVisibleIssues(ctx,other,fixtureUUID(301),ListQuery{Limit:25})
 if err!=nil||len(page.Items)!=1||page.Items[0].ID!=fixtureUUID(911){
  t.Fatalf("ungranted principal gained restricted Issue: %+v %v",page,err)
 }
 for _,tc:=range []struct{tenant,entity int;global bool;grant []string}{
  {2,22,true,nil},{1,12,true,nil},{1,11,false,[]string{"BANK","CARDS"}},
 }{
  bad:=scopedActor(tc.tenant,tc.entity,tc.global,tc.grant...)
  result,err:=reader.ListVisibleIssues(ctx,bad,fixtureUUID(301),ListQuery{Limit:10})
  if !errors.Is(err,ErrNotFound)||len(result.Items)!=0{t.Fatalf("cross scope Issue exposed: %+v %v",result,err)}
 }
}
