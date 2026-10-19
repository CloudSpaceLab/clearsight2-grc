package programread

import (
  "context"
  "errors"
  "net/http"
  "net/http/httptest"
  "strings"
  "testing"
  "time"

  "github.com/CloudSpaceLab/clearsight2-grc/internal/identity"
)

type testAuth struct { actor identity.Actor; present bool; err error }
func (a testAuth) Authenticate(*http.Request)(identity.Actor,bool,error){return a.actor,a.present,a.err}
type testRepo struct { record Record; err error; called int }
func (r *testRepo) GetVisible(_ context.Context, a identity.Actor, id string)(Record,error){
  r.called++
  if a.TenantID=="" || id=="" { panic("missing verified scope") }
  return r.record,r.err
}
func makeActor()identity.Actor{
  now:=time.Now().UTC()
  return identity.Actor{
    TenantID:"TENANT-A",PrincipalID:"PERSON-A",LegalEntityID:"LEGAL-A",Kind:"PERSON",
    PermissionCodes:[]string{identity.PermissionOversightRead},
    AuthenticationMethod:"SSO",AssuranceLevel:"MFA",SessionID:"session-1",
    IssuedAt:now.Add(-time.Minute),ExpiresAt:now.Add(time.Hour),
  }
}
func makeRecord()Record{
  return Record{ID:"P-100",Name:"Security Program",SourceRevision:"revision-1",
    UpdatedAt:time.Now().UTC(),TenantID:"TENANT-A",LegalEntityID:"LEGAL-A"}
}
func request(h Handler,url string) *httptest.ResponseRecorder {
  mux:=http.NewServeMux()
  mux.Handle("GET /api/v1/programs/{id}",h)
  w:=httptest.NewRecorder()
  mux.ServeHTTP(w,httptest.NewRequest(http.MethodGet,url,nil))
  return w
}
func TestProgramReadRequiresVerifiedIdentity(t *testing.T){
  cases:=[]struct{name string; auth identity.Authenticator; code int}{
    {"authenticator not configured",nil,http.StatusServiceUnavailable},
    {"unsigned headers are not identity",testAuth{},http.StatusUnauthorized},
    {"bad signature",testAuth{err:identity.ErrInvalidIdentity},http.StatusUnauthorized},
    {"expired",testAuth{actor:func()identity.Actor{
      a:=makeActor();a.ExpiresAt=time.Now().Add(-time.Second);return a
    }(),present:true},http.StatusUnauthorized},
  }
  for _,tc:=range cases{t.Run(tc.name,func(t *testing.T){
    repo:=&testRepo{record:makeRecord()}
    w:=request(Handler{Authenticator:tc.auth,Repository:repo},"/api/v1/programs/P-100")
    if w.Code!=tc.code || repo.called!=0{t.Fatalf("status=%d repo reads=%d",w.Code,repo.called)}
  })}
}
func TestProgramReadPermittedScope(t *testing.T){
  actor:=makeActor()
  repo:=&testRepo{record:makeRecord()}
  w:=request(Handler{Authenticator:testAuth{actor:actor,present:true},Repository:repo},"/api/v1/programs/P-100")
  if w.Code!=http.StatusOK||repo.called!=1{t.Fatalf("status=%d body=%s",w.Code,w.Body)}
  if strings.Contains(w.Body.String(),"TENANT-A")||strings.Contains(w.Body.String(),"LEGAL-A"){
    t.Fatal("internal scope identifiers leaked")
  }
  if w.Header().Get("Cache-Control")!="no-store"{t.Fatal("private response cacheable")}
}
func TestProgramReadDeniedAndCrossScope(t *testing.T){
  tests:=[]struct{
    name string;editActor func(*identity.Actor);editRecord func(*Record);expected int;repoCalled int
  }{
    {"no permissions",func(a *identity.Actor){a.PermissionCodes=nil},nil,403,0},
    {"service identity",func(a *identity.Actor){a.Kind="SERVICE"},nil,403,0},
    {"ambiguous legal entity",func(a *identity.Actor){a.LegalEntityID="*"},nil,403,0},
    {"cross tenant",nil,func(p *Record){p.TenantID="TENANT-B"},503,1},
    {"cross legal entity",nil,func(p *Record){p.LegalEntityID="LEGAL-B"},503,1},
    {"wrong requested record",nil,func(p *Record){p.ID="P-101"},503,1},
    {"empty snapshot revision",nil,func(p *Record){p.SourceRevision=""},503,1},
    {"department outside grant",func(a *identity.Actor){
      a.PermissionCodes=nil
      a.DepartmentGrants=[]identity.DepartmentGrant{{Path:[]string{"BANK","PAYMENTS"},PermissionCodes:[]string{identity.PermissionOversightRead}}}
    },func(p *Record){p.DepartmentPath=[]string{"BANK","CARDS"}},503,1},
    {"department exact grant",func(a *identity.Actor){
      a.PermissionCodes=nil
      a.DepartmentGrants=[]identity.DepartmentGrant{{Path:[]string{"BANK","PAYMENTS"},PermissionCodes:[]string{identity.PermissionOversightRead}}}
    },func(p *Record){p.DepartmentPath=[]string{"BANK","PAYMENTS"}},200,1},
  }
  for _,tt:=range tests{t.Run(tt.name,func(t *testing.T){
    actor:=makeActor();record:=makeRecord()
    if tt.editActor!=nil{tt.editActor(&actor)}
    if tt.editRecord!=nil{tt.editRecord(&record)}
    repo:=&testRepo{record:record}
    w:=request(Handler{Authenticator:testAuth{actor:actor,present:true},Repository:repo},"/api/v1/programs/P-100")
    if w.Code!=tt.expected||repo.called!=tt.repoCalled{t.Fatalf("status=%d expected=%d reads=%d",w.Code,tt.expected,repo.called)}
    if tt.expected!=200 && strings.Contains(w.Body.String(),"Security Program"){t.Fatal("record leaked")}
  })}
}
func TestProgramReadFailureModes(t *testing.T){
  actor:=makeActor()
  cases:=[]struct{name string; repo *testRepo; url string; expected int}{
    {"unconfigured repository",nil,"/api/v1/programs/P-100",503},
    {"not found",&testRepo{err:ErrNotFound},"/api/v1/programs/P-100",404},
    {"unavailable",&testRepo{err:errors.New("connection failed")},"/api/v1/programs/P-100",503},
    {"query scope spoof",&testRepo{record:makeRecord()},"/api/v1/programs/P-100?tenant_id=TENANT-B",404},
    {"empty id",&testRepo{record:makeRecord()},"/api/v1/programs/",404},
  }
  for _,tc:=range cases{t.Run(tc.name,func(t *testing.T){
    var reader Repository
    if tc.repo != nil { reader = tc.repo }
    w:=request(Handler{Authenticator:testAuth{actor:actor,present:true},Repository:reader},tc.url)
    if w.Code!=tc.expected{t.Fatalf("status=%d expected=%d body=%s",w.Code,tc.expected,w.Body)}
    if tc.name=="query scope spoof" && tc.repo.called!=0{t.Fatal("spoofed scope reached repository")}
  })}
}
func TestMethodDeniedWithoutReading(t *testing.T){
  repo:=&testRepo{record:makeRecord()}
  mux:=http.NewServeMux()
  mux.Handle("/api/v1/programs/{id}",Handler{Authenticator:testAuth{actor:makeActor(),present:true},Repository:repo})
  w:=httptest.NewRecorder()
  mux.ServeHTTP(w,httptest.NewRequest("POST","/api/v1/programs/P-100",nil))
  if w.Code!=http.StatusMethodNotAllowed||repo.called!=0{t.Fatalf("status=%d reads=%d",w.Code,repo.called)}
}
