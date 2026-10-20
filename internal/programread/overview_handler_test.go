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
type overviewStub struct {calls int;value ProgramOverview;err error}
func(s *overviewStub)GetVisible(context.Context,identity.Actor,string)(Record,error){return Record{},ErrNotFound}
func(s *overviewStub)ReadOverview(_ context.Context,_ identity.Actor,_ string)(ProgramOverview,error){s.calls++;return s.value,s.err}
func overviewHTTP(h Handler,url string)*httptest.ResponseRecorder{
 mux:=http.NewServeMux();mux.HandleFunc("GET /api/v1/programs/{id}/overview",h.ServeOverviewHTTP)
 w:=httptest.NewRecorder();mux.ServeHTTP(w,httptest.NewRequest(http.MethodGet,url,nil));return w
}
func TestOverviewFailsClosedBeforeRepository(t *testing.T){
 a:=makeActor()
 for _,tc:=range []struct{name string;auth testAuth;url string;want int}{
  {"unsigned",testAuth{},"/api/v1/programs/"+testProgramUUID+"/overview",401},
  {"bad identity",testAuth{err:identity.ErrInvalidIdentity},"/api/v1/programs/"+testProgramUUID+"/overview",401},
  {"no permission",testAuth{actor:func()identity.Actor{a:=a;a.PermissionCodes=nil;return a}(),present:true},"/api/v1/programs/"+testProgramUUID+"/overview",403},
  {"invalid ID",testAuth{actor:a,present:true},"/api/v1/programs/bad/overview",404},
  {"forged tenant",testAuth{actor:a,present:true},"/api/v1/programs/"+testProgramUUID+"/overview?tenant_id=other",400},
  {"unsupported period",testAuth{actor:a,present:true},"/api/v1/programs/"+testProgramUUID+"/overview?period=90",400},
 }{
  t.Run(tc.name,func(t *testing.T){
   s:=&overviewStub{};w:=overviewHTTP(Handler{Authenticator:tc.auth,Repository:s},tc.url)
   if w.Code!=tc.want||s.calls!=0{t.Fatalf("status=%d, calls=%d body=%s",w.Code,s.calls,w.Body.String())}
  })
 }
}
func TestOverviewResponseContainsOnlyVerifiedMeasurements(t *testing.T){
 at:=time.Now().UTC()
 base:=ProgramOverview{ProgramID:testProgramUUID,ProgramRevision:"7",
  AssessmentCoverage:&AssessedRequirements{Assessed:3,Eligible:4,Unknown:1,Excluded:2,Quality:"partial",GeneratedAt:at}}
 for _,tc:=range []struct{name string;modify func(*ProgramOverview);err error;want int}{
  {"valid",nil,nil,200},
  {"unavailable measure",func(p *ProgramOverview){p.AssessmentCoverage=nil},nil,200},
  {"not found",nil,ErrNotFound,404},
  {"database unavailable",nil,errors.New("db secret"),503},
  {"wrong program",func(p *ProgramOverview){p.ProgramID="different"},nil,503},
  {"inconsistent count",func(p *ProgramOverview){p.AssessmentCoverage.Assessed=5},nil,503},
  {"unauthorized score",func(p *ProgramOverview){x:=10000;p.Supported=&x},nil,503},
 }{
  t.Run(tc.name,func(t *testing.T){
   payload:=base
   if payload.AssessmentCoverage!=nil {c:=*payload.AssessmentCoverage;payload.AssessmentCoverage=&c}
   if tc.modify!=nil{tc.modify(&payload)}
   s:=&overviewStub{value:payload,err:tc.err}
   w:=overviewHTTP(Handler{Authenticator:testAuth{actor:makeActor(),present:true},Repository:s},
    "/api/v1/programs/"+testProgramUUID+"/overview")
   if w.Code!=tc.want||s.calls!=1{t.Fatalf("status=%d, calls=%d body=%s",w.Code,s.calls,w.Body.String())}
   if w.Header().Get("Cache-Control")!="no-store"{t.Fatal("private overview cacheable")}
   if w.Code!=200 {
    if strings.Contains(w.Body.String(),"db secret"){t.Fatal("database details leaked")}
    return
   }
   var wire map[string]any
   if err:=json.Unmarshal(w.Body.Bytes(),&wire);err!=nil{t.Fatal(err)}
   for _,hidden:=range []string{"score_bps","tenant_id","principal_id","evidence_assessments","reasons"}{
    if _,exists:=wire[hidden];exists{t.Fatalf("privileged field %s disclosed",hidden)}
   }
   if wire["supported"]!=nil||wire["open_gaps"]!=nil||wire["evidence_to_review"]!=nil{
    t.Fatal("unverified assessment or gap counts made visible")
   }
  })
 }
}
