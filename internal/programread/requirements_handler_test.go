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

const testProgramUUID = "00000000-0000-4000-8000-000000000301"
const testRequirementUUID = "00000000-0000-4000-8000-000000000401"

type requirementRepoStub struct{
 calls int
 page RequirementPage
 err error
}
func (r *requirementRepoStub) GetVisible(context.Context,identity.Actor,string)(Record,error){
 return Record{},ErrNotFound
}
func (r *requirementRepoStub) ListApprovedRequirements(_ context.Context, _ identity.Actor,_ string,q ListQuery)(RequirementPage,error){
 r.calls++
 if q.Limit<1 {panic("invalid page size")}
 return r.page,r.err
}
func testRequirementRequest(h Handler,path string)*httptest.ResponseRecorder{
 mux:=http.NewServeMux()
 mux.HandleFunc("GET /api/v1/programs/{id}/requirements",h.ServeRequirementsHTTP)
 r:=httptest.NewRequest(http.MethodGet,path,nil)
 w:=httptest.NewRecorder()
 mux.ServeHTTP(w,r)
 return w
}
func goodRequirementPage()RequirementPage{
 return RequirementPage{
  ProgramID:testProgramUUID,ProgramRevision:"7",
  Items:[]RequirementReference{{
   ID:testRequirementUUID,Code:"A-1",Title:"Approved source reference",
   Version:1,EffectiveFrom:time.Now().UTC().Add(-time.Hour),
  }},
 }
}
func TestRequirementHTTPDeniesBeforeReading(t *testing.T){
 actor:=makeActor()
 cases:=[]struct{name string;auth testAuth;path string;code int}{
  {"unsigned",testAuth{},"/api/v1/programs/"+testProgramUUID+"/requirements",401},
  {"invalid actor",testAuth{err:identity.ErrInvalidIdentity},"/api/v1/programs/"+testProgramUUID+"/requirements",401},
  {"no permission",testAuth{actor:func()identity.Actor{a:=actor;a.PermissionCodes=nil;return a}(),present:true},"/api/v1/programs/"+testProgramUUID+"/requirements",403},
  {"forged tenant",testAuth{actor:actor,present:true},"/api/v1/programs/"+testProgramUUID+"/requirements?tenant_id=OTHER",400},
  {"forged principal",testAuth{actor:actor,present:true},"/api/v1/programs/"+testProgramUUID+"/requirements?principal_id=OTHER",400},
  {"malformed cursor",testAuth{actor:actor,present:true},"/api/v1/programs/"+testProgramUUID+"/requirements?cursor=not-valid",400},
  {"invalid id",testAuth{actor:actor,present:true},"/api/v1/programs/not-uuid/requirements",404},
 }
 for _,tc:=range cases{
  t.Run(tc.name,func(t *testing.T){
   repo:=&requirementRepoStub{page:goodRequirementPage()}
   w:=testRequirementRequest(Handler{Authenticator:tc.auth,Repository:repo},tc.path)
   if w.Code!=tc.code||repo.calls!=0{t.Fatalf("status %d, calls %d: %s",w.Code,repo.calls,w.Body.String())}
  })
 }
}
func TestRequirementHTTPValidatesAndDoesNotLeak(t *testing.T){
 actor:=makeActor()
 scenarios:=[]struct{name string;mutate func(*RequirementPage);err error;code int}{
  {"authorized",nil,nil,200},
  {"not found",nil,ErrNotFound,404},
  {"storage error",nil,errors.New("storage failed"),503},
  {"wrong Program",func(p *RequirementPage){p.ProgramID="00000000-0000-4000-8000-000000000302"},nil,503},
  {"missing revision",func(p *RequirementPage){p.ProgramRevision=""},nil,503},
  {"invalid requirement",func(p *RequirementPage){p.Items[0].ID="not-uuid"},nil,503},
 }
 for _,tc:=range scenarios{
  t.Run(tc.name,func(t *testing.T){
   page:=goodRequirementPage()
   if tc.mutate!=nil{tc.mutate(&page)}
   repo:=&requirementRepoStub{page:page,err:tc.err}
   w:=testRequirementRequest(Handler{Authenticator:testAuth{actor:actor,present:true},Repository:repo},
    "/api/v1/programs/"+testProgramUUID+"/requirements?limit=2")
   if w.Code!=tc.code||repo.calls!=1{t.Fatalf("status=%d calls=%d want %d; body=%s",w.Code,repo.calls,tc.code,w.Body.String())}
   if w.Header().Get("Cache-Control")!="no-store"{t.Fatal("private data may be cached")}
   if tc.code!=200{
    if strings.Contains(w.Body.String(),"Approved source reference"){t.Fatal("invalid source record leaked")}
    return
   }
   var result RequirementPage
   if err:=json.Unmarshal(w.Body.Bytes(),&result);err!=nil{t.Fatal(err)}
   if len(result.Items)!=1||result.ProgramID!=testProgramUUID{t.Fatalf("incorrect approved references: %+v",result)}
  })
 }
}
