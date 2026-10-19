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

type inventoryStub struct {
 calls int
 page InventoryPage
 err error
}
func (s *inventoryStub) GetVisible(context.Context,identity.Actor,string)(Record,error){
 return Record{},ErrNotFound
}
func (s *inventoryStub) ListInventory(_ context.Context,_ identity.Actor,_ string,_ InventoryKind,_ ListQuery)(InventoryPage,error){
 s.calls++
 return s.page,s.err
}
func inventoryResponse(handler Handler,kind InventoryKind,path string)*httptest.ResponseRecorder{
 mux:=http.NewServeMux()
 mux.HandleFunc("GET /api/v1/programs/{id}/"+string(kind),
  func(w http.ResponseWriter,r *http.Request){handler.ServeInventoryHTTP(w,r,kind)})
 w:=httptest.NewRecorder()
 mux.ServeHTTP(w,httptest.NewRequest(http.MethodGet,path,nil))
 return w
}
func approvedInventory(kind InventoryKind)InventoryPage{
 code:=""
 status:="IMPLEMENTED"
 if kind==InventoryEvidenceContracts{code="EV-1";status="ACTIVE"}
 return InventoryPage{
  ProgramID:testProgramUUID,ProgramRevision:"7",
  Items:[]InventoryRecord{{
   ID:testRequirementUUID,Code:code,Name:"Current source reference",
   Status:status,Version:1,UpdatedAt:time.Now().UTC(),
  }},
 }
}

func TestInventoryHTTPFailsClosed(t *testing.T){
 actor:=makeActor()
 for _,kind:=range []InventoryKind{InventoryControls,InventoryEvidenceContracts}{
  base:="/api/v1/programs/"+testProgramUUID+"/"+string(kind)
  for _,tc:=range []struct{name string;actor testAuth;url string;status int}{
   {"unsigned",testAuth{},base,401},
   {"invalid identity",testAuth{err:identity.ErrInvalidIdentity},base,401},
   {"no grants",testAuth{actor:func()identity.Actor{a:=actor;a.PermissionCodes=nil;return a}(),present:true},base,403},
   {"bad id",testAuth{actor:actor,present:true},"/api/v1/programs/not-valid/"+string(kind),404},
   {"spoofed tenant",testAuth{actor:actor,present:true},base+"?tenant_id=other",400},
   {"unbounded page",testAuth{actor:actor,present:true},base+"?limit=51",400},
  }{
   t.Run(string(kind)+"/"+tc.name,func(t *testing.T){
    stub:=&inventoryStub{page:approvedInventory(kind)}
    w:=inventoryResponse(Handler{Authenticator:tc.actor,Repository:stub},kind,tc.url)
    if w.Code!=tc.status||stub.calls!=0{
     t.Fatalf("unexpected status %d, calls %d, body %s",w.Code,stub.calls,w.Body.String())
    }
   })
  }
  for _,tc:=range []struct{name string;update func(*InventoryPage);err error;status int}{
   {"permitted",nil,nil,200},
   {"unknown",nil,ErrNotFound,404},
   {"database error",nil,errors.New("database error"),503},
   {"wrong program",func(p *InventoryPage){p.ProgramID="00000000-0000-4000-8000-000000000302"},nil,503},
   {"invalid version",func(p *InventoryPage){p.Items[0].Version=0},nil,503},
   {"bad status",func(p *InventoryPage){p.Items[0].Status="DRAFT"},nil,503},
   {"bad id",func(p *InventoryPage){p.Items[0].ID="bad"},nil,503},
  }{
   t.Run(string(kind)+"/"+tc.name,func(t *testing.T){
    page:=approvedInventory(kind)
    if tc.update!=nil{tc.update(&page)}
    stub:=&inventoryStub{page:page,err:tc.err}
    w:=inventoryResponse(Handler{Authenticator:testAuth{actor:actor,present:true},Repository:stub},kind,base)
    if w.Code!=tc.status||stub.calls!=1{t.Fatalf("status %d, calls %d, want %d",w.Code,stub.calls,tc.status)}
    if w.Header().Get("Cache-Control")!="no-store"{t.Fatal("inventory might be cached")}
    if tc.status!=200{
     if strings.Contains(w.Body.String(),"Current source reference"){t.Fatal("hidden value leaked")}
     continue
    }
    var got InventoryPage
    if err:=json.Unmarshal(w.Body.Bytes(),&got);err!=nil||len(got.Items)!=1{
     t.Fatalf("invalid response %+v, %v",got,err)
    }
   })
  }
 }
}
