package programread
import (
 "context"
 "encoding/json"
 "errors"
 "net/http"
 "net/http/httptest"
 "strings"
 "testing"
 "time"
 "github.com/CloudSpaceLab/clearsight2-grc/internal/identity"
)
type issueStub struct{calls int;page IssuePage;err error}
func(s *issueStub)GetVisible(context.Context,identity.Actor,string)(Record,error){return Record{},ErrNotFound}
func(s *issueStub)ListVisibleIssues(_ context.Context,_ identity.Actor,_ string,_ ListQuery)(IssuePage,error){
 s.calls++;return s.page,s.err
}
func issuesHTTP(h Handler,path string)*httptest.ResponseRecorder{
 mux:=http.NewServeMux();mux.HandleFunc("GET /api/v1/programs/{id}/issues",h.ServeIssuesHTTP)
 w:=httptest.NewRecorder();mux.ServeHTTP(w,httptest.NewRequest(http.MethodGet,path,nil));return w
}
func TestIssuesSignedActorAndResponseGuard(t *testing.T){
 a:=makeActor()
 path:="/api/v1/programs/"+testProgramUUID+"/issues"
 for _,tc:=range []struct{name string;auth testAuth;path string;want int}{
  {"unsigned",testAuth{},path,401},
  {"bad identity",testAuth{err:identity.ErrInvalidIdentity},path,401},
  {"no access",testAuth{actor:func()identity.Actor{v:=a;v.PermissionCodes=nil;return v}(),present:true},path,403},
  {"invalid ID",testAuth{actor:a,present:true},"/api/v1/programs/not-uuid/issues",404},
  {"forged scope",testAuth{actor:a,present:true},path+"?tenant_id=other",400},
  {"unbounded",testAuth{actor:a,present:true},path+"?limit=51",400},
 } {
  t.Run(tc.name,func(t *testing.T){
   repo:=&issueStub{}
   w:=issuesHTTP(Handler{Authenticator:tc.auth,Repository:repo},tc.path)
   if w.Code!=tc.want||repo.calls!=0{t.Fatalf("status %d calls %d: %s",w.Code,repo.calls,w.Body.String())}
  })
 }
 issue:=ProgramIssue{
  ID:testRequirementUUID,Reference:"CASE-1",Title:"Authorized issue",Type:"CONTROL_GAP",
  Status:"TRIAGE",Priority:3,UpdatedAt:time.Now().UTC(),
 }
 base:=IssuePage{ProgramID:testProgramUUID,ProgramRevision:"7",Items:[]ProgramIssue{issue}}
 for _,tc:=range []struct{name string;edit func(*IssuePage);err error;want int}{
  {"allowed",nil,nil,200},
  {"absent",nil,ErrNotFound,404},
  {"database error",nil,errors.New("storage details"),503},
  {"wrong Program",func(p *IssuePage){p.ProgramID="other"},nil,503},
  {"closed Matter",func(p *IssuePage){p.Items[0].Status="CLOSED"},nil,503},
  {"invalid priority",func(p *IssuePage){p.Items[0].Priority=9},nil,503},
 } {
  t.Run(tc.name,func(t *testing.T){
   value:=base;value.Items=append([]ProgramIssue(nil),base.Items...)
   if tc.edit!=nil{tc.edit(&value)}
   repo:=&issueStub{page:value,err:tc.err}
   w:=issuesHTTP(Handler{Authenticator:testAuth{actor:a,present:true},Repository:repo},path)
   if w.Code!=tc.want||repo.calls!=1{t.Fatalf("status %d calls %d: %s",w.Code,repo.calls,w.Body.String())}
   if w.Header().Get("Cache-Control")!="no-store"{t.Fatal("Issue response cacheable")}
   if w.Code!=200{if strings.Contains(w.Body.String(),issue.Title){t.Fatal("private Matter leaked")};return}
   var parsed map[string]any
   if err:=json.Unmarshal(w.Body.Bytes(),&parsed);err!=nil{t.Fatal(err)}
   if _,ok:=parsed["tenant_id"];ok{t.Fatal("tenant metadata leaked")}
  })
 }
}
