package programread

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/CloudSpaceLab/clearsight2-grc/internal/identity"
)

type queryStub struct {
	calls int
	statement string
	args []any
	row scannedRow
}

func (q *queryStub) QueryRowContext(_ context.Context, statement string, args ...any) scannedRow {
	q.calls++
	q.statement = statement
	q.args = args
	return q.row
}

type validRow struct {
	id, name, tenant, entity, path string
	version int64
}
func (r validRow) Scan(dest ...any) error {
	*(dest[0].(*string)) = r.id
	*(dest[1].(*string)) = r.name
	*(dest[2].(*int64)) = r.version
	*(dest[3].(*time.Time)) = time.Now().UTC()
	*(dest[4].(*string)) = r.tenant
	*(dest[5].(*string)) = r.entity
	*(dest[6].(*string)) = r.path
 *(dest[7].(*string))="SEC-001"
 *(dest[8].(*string))="ACTIVE"
 *(dest[9].(*string))="REGULATORY"
 *(dest[10].(*string))="SECURITY"
 *(dest[11].(*string))="NG"
	return nil
}
type errorRow struct{err error}
func (r errorRow) Scan(...any) error{return r.err}

func TestSQLProgramReadUsesBoundActorScope(t *testing.T) {
	actor := makeActor()
	queries:= &queryStub{row:validRow{
		id:"P-100",name:"Security Program",tenant:actor.TenantID,
		entity:actor.LegalEntityID,path:"[]",version:7,
	}}
	p,err:=getVisible(context.Background(),queries,actor,"P-100")
	if err!=nil{t.Fatal(err)}
	if p.SourceRevision!="7" || queries.calls!=1 {
		t.Fatalf("unexpected projection: %+v; calls=%d",p,queries.calls)
	}
	if len(queries.args)!=5 || !reflect.DeepEqual(queries.args,[]any{
		actor.TenantID,actor.LegalEntityID,"P-100",true,"[]",
	}){t.Fatalf("unexpected scoped query args: %v",queries.args)}
	for _,predicate:=range []string{
		"p.tenant_id = $1::uuid", "p.legal_entity_id = $2::uuid",
		"p.id = $3::uuid", "$4::boolean", "jsonb_array_elements($5::jsonb)",
	} {
		if !strings.Contains(queries.statement,predicate){t.Errorf("missing SQL scope constraint %s",predicate)}
	}
}

func TestSQLProgramReadRequiresExactDepartmentGrant(t *testing.T) {
	actor:=makeActor()
	actor.PermissionCodes=nil
	actor.DepartmentGrants=[]identity.DepartmentGrant{
		{Path:[]string{"bank","payments"},PermissionCodes:[]string{identity.PermissionOversightRead}},
		{Path:[]string{"bank","other"},PermissionCodes:[]string{"CONFIG_READ"}},
	}
	q:=&queryStub{row:validRow{id:"P-100",name:"Payments",
		tenant:actor.TenantID,entity:actor.LegalEntityID,
		path:`["BANK","PAYMENTS"]`,version:12}}
	got,err:=getVisible(context.Background(),q,actor,"P-100")
	if err!=nil{t.Fatal(err)}
	if !reflect.DeepEqual(got.DepartmentPath,[]string{"BANK","PAYMENTS"}){
		t.Fatal("department path not decoded",got.DepartmentPath)
	}
	var paths [][]string
	if err:=json.Unmarshal([]byte(q.args[4].(string)),&paths);err!=nil{t.Fatal(err)}
	if !reflect.DeepEqual(paths,[][]string{{"BANK","PAYMENTS"}}){
		t.Fatalf("unpermitted paths sent to database: %v",paths)
	}
	q.row=validRow{id:"P-100",name:"Other",tenant:actor.TenantID,
		entity:actor.LegalEntityID,path:`["BANK","OTHER"]`,version:12}
	if _,err:=getVisible(context.Background(),q,actor,"P-100");err==nil{
		t.Fatal("cross-department response was accepted")
	}
}

func TestSQLProgramReadFailsClosedBeforeQuery(t *testing.T) {
	actor:=makeActor()
	t.Run("no grants",func(t *testing.T){
		actor.PermissionCodes=nil
		q:=&queryStub{}
		if _,err:=getVisible(context.Background(),q,actor,"P-100");!errors.Is(err,ErrNotFound)||q.calls!=0{
			t.Fatalf("unauthorized actor reached database: %v, %d",err,q.calls)
		}
	})
	t.Run("missing repository",func(t *testing.T){
		var r *SQLRepository
		if _,err:=r.GetVisible(context.Background(),makeActor(),"P-100");err==nil{t.Fatal("nil repository accepted")}
	})
	t.Run("missing queryer",func(t *testing.T){
		if _,err:=getVisible(context.Background(),nil,makeActor(),"P-100");err==nil{t.Fatal("nil query accepted")}
	})
	t.Run("expired actor",func(t *testing.T){
		expired:=makeActor()
		expired.ExpiresAt=time.Now().Add(-time.Second)
		q:=&queryStub{}
		if _,err:=getVisible(context.Background(),q,expired,"P-100");err==nil||q.calls!=0{
			t.Fatalf("expired actor reached database: %v, %d",err,q.calls)
		}
	})
}

func TestSQLProgramReadCannotLeakCrossTenantOrBadRevision(t *testing.T) {
	actor:=makeActor()
	for _,tc:=range []struct{name string; row scannedRow; notFound bool}{
		{"absent",errorRow{sql.ErrNoRows},true},
		{"db error",errorRow{errors.New("database failure")},false},
		{"cross tenant",validRow{id:"P-100",name:"Program",tenant:"TENANT-B",entity:actor.LegalEntityID,path:"[]",version:3},false},
		{"cross entity",validRow{id:"P-100",name:"Program",tenant:actor.TenantID,entity:"LEGAL-B",path:"[]",version:3},false},
		{"zero revision",validRow{id:"P-100",name:"Program",tenant:actor.TenantID,entity:actor.LegalEntityID,path:"[]",version:0},false},
		{"bad department JSON",validRow{id:"P-100",name:"Program",tenant:actor.TenantID,entity:actor.LegalEntityID,path:"garbage",version:3},false},
	} {
		t.Run(tc.name,func(t *testing.T){
			q:=&queryStub{row:tc.row}
			_,err:=getVisible(context.Background(),q,actor,"P-100")
			if err==nil{t.Fatal("invalid scoped record accepted")}
			if tc.notFound && !errors.Is(err,ErrNotFound){t.Fatalf("not-found must remain opaque: %v",err)}
		})
	}
}
