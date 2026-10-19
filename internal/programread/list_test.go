package programread

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/CloudSpaceLab/clearsight2-grc/internal/identity"
)

type listStub struct {
	calls int
	page ListPage
	err error
}
func (r *listStub) GetVisible(context.Context, identity.Actor,string)(Record,error){
	return Record{},ErrNotFound
}
func (r *listStub) ListVisible(_ context.Context,actor identity.Actor,query ListQuery)(ListPage,error){
	r.calls++
	if actor.TenantID==""||query.Limit<=0{panic("unsafe Program list query")}
	return r.page,r.err
}
func listRequest(handler Handler,path string)*httptest.ResponseRecorder{
	mux:=http.NewServeMux()
	mux.HandleFunc("GET /api/v1/programs",handler.ServeListHTTP)
	w:=httptest.NewRecorder()
	mux.ServeHTTP(w,httptest.NewRequest(http.MethodGet,path,nil))
	return w
}
func TestListCursorRoundTripAndValidation(t *testing.T) {
	now:=time.Date(2026,10,19,12,20,25,123456000,time.UTC)
	id:="00000000-0000-4000-8000-000000000301"
	cursor:=encodeListCursor(now,id)
	result,err:=decodeListCursor(cursor)
	if err!=nil||result.ID!=id||!result.UpdatedAt.Equal(now){
		t.Fatalf("roundtrip failed: %+v %v",result,err)
	}
	for _,invalid:=range []string{
		"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
		"invalid!!!","e30", // JSON object with missing timestamp and UUID
	} {
		if _,err:=decodeListCursor(invalid);err==nil{t.Fatalf("accepted invalid cursor %s",invalid)}
	}
	for _,query:=range []string{
		"/api/v1/programs?tenant_id=spoof",
		"/api/v1/programs?principal_id=spoof",
		"/api/v1/programs?legal_entity_id=spoof",
		"/api/v1/programs?department_path=BANK",
		"/api/v1/programs?limit=0",
		"/api/v1/programs?limit=51",
		"/api/v1/programs?limit=abc",
		"/api/v1/programs?limit=2&limit=3",
		"/api/v1/programs?cursor=bad",
		"/api/v1/programs?unknown=anything",
	} {
		_,err:=listQuery(httptest.NewRequest(http.MethodGet,query,nil))
		if err==nil{t.Fatalf("accepted unsafe query %s",query)}
	}
	p,err:=listQuery(httptest.NewRequest(http.MethodGet,"/api/v1/programs?limit=2",nil))
	if err!=nil||p.Limit!=2||p.Cursor!=""{t.Fatalf("incorrect page: %+v %v",p,err)}
	if !reflect.DeepEqual(ListQuery{Limit:defaultPageSize},ListQuery{Limit:25}){
		t.Fatal("default page size changed")
	}
}

func TestProgramListHTTPAuthorizesBeforeReading(t *testing.T) {
	a:=makeActor()
	for _,tc:=range []struct{
		name string
		auth testAuth
		url string
		code int
	}{
		{"not signed",testAuth{},"/api/v1/programs",401},
		{"invalid signature",testAuth{err:identity.ErrInvalidIdentity},"/api/v1/programs",401},
		{"no permission",testAuth{actor:func()identity.Actor{x:=a;x.PermissionCodes=nil;return x}(),present:true},"/api/v1/programs",403},
		{"service account",testAuth{actor:func()identity.Actor{x:=a;x.Kind="SERVICE";return x}(),present:true},"/api/v1/programs",403},
		{"invalid cursor",testAuth{actor:a,present:true},"/api/v1/programs?cursor=garbage",400},
		{"spoofed tenant",testAuth{actor:a,present:true},"/api/v1/programs?tenant_id=evil",400},
	}{
		t.Run(tc.name,func(t *testing.T){
			repo:=&listStub{}
			w:=listRequest(Handler{Authenticator:tc.auth,Repository:repo},tc.url)
			if w.Code!=tc.code||repo.calls!=0{
				t.Fatalf("status=%d reads=%d body=%s",w.Code,repo.calls,w.Body.String())
			}
		})
	}
	repo:=&listStub{page:ListPage{Items:[]Record{makeRecord()}}}
	w:=listRequest(Handler{Authenticator:testAuth{actor:a,present:true},Repository:repo},"/api/v1/programs?limit=2")
	if w.Code!=200||repo.calls!=1||w.Header().Get("Cache-Control")!="no-store"{
		t.Fatalf("authorized list: %d %s",w.Code,w.Body.String())
	}
	if strings.Contains(w.Body.String(),"TENANT-A")||strings.Contains(w.Body.String(),"LEGAL-A"){
		t.Fatal("internal scope metadata leaked")
	}
	var page ListPage
	if err:=json.Unmarshal(w.Body.Bytes(),&page);err!=nil||len(page.Items)!=1{
		t.Fatalf("invalid list payload: %v %+v",err,page)
	}
}
func TestProgramListRejectsRepositoryScopeLeak(t *testing.T){
	a:=makeActor()
	for _,tc:=range []struct{name string;edit func(*Record)}{
		{"cross tenant",func(r *Record){r.TenantID="ANOTHER"}},
		{"cross legal entity",func(r *Record){r.LegalEntityID="ANOTHER"}},
		{"empty revision",func(r *Record){r.SourceRevision=""}},
		{"wrong department",func(r *Record){r.DepartmentPath=[]string{"OTHER"}}},
	}{
		t.Run(tc.name,func(t *testing.T){
			actor:=a
			if tc.name=="wrong department"{
				actor.PermissionCodes=nil
				actor.DepartmentGrants=[]identity.DepartmentGrant{{Path:[]string{"BANK","PAYMENTS"},PermissionCodes:[]string{identity.PermissionOversightRead}}}
			}
			p:=makeRecord()
			p.ID="00000000-0000-4000-8000-000000000301"
			tc.edit(&p)
			repo:=&listStub{page:ListPage{Items:[]Record{p}}}
			w:=listRequest(Handler{Authenticator:testAuth{actor:actor,present:true},Repository:repo},"/api/v1/programs")
			if w.Code!=503||strings.Contains(w.Body.String(),p.Name){
				t.Fatalf("scope failure leaked or misclassified: %d %s",w.Code,w.Body.String())
			}
		})
	}
	repo:=&listStub{err:errors.New("database offline")}
	w:=listRequest(Handler{Authenticator:testAuth{actor:a,present:true},Repository:repo},"/api/v1/programs")
	if w.Code!=503{t.Fatalf("unavailable database must fail closed: %d",w.Code)}
}
