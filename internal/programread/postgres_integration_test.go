//go:build postgres

package programread

import (
 "context"
 "crypto/hmac"
 "crypto/sha256"
 "database/sql"
 "encoding/base64"
 "encoding/hex"
 "encoding/json"
 "errors"
 "fmt"
 "net/http"
 "net/http/httptest"
 "os"
 "strconv"
 "strings"
 "testing"
 "time"

 "github.com/CloudSpaceLab/clearsight2-grc/internal/identity"
 _ "github.com/jackc/pgx/v5/stdlib"
)

// The disposable tables mirror the exact v1 columns needed by this read.
// These fixtures are NOT a replacement for v1 schema migration tests.
const fixtureDDL = `
CREATE TABLE organization_scopes (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL,
 department_path text[] NOT NULL, status text NOT NULL,
 valid_from timestamptz NOT NULL, valid_until timestamptz
);
CREATE TABLE programs (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL,
 organization_scope_id uuid REFERENCES organization_scopes(id),
 name text NOT NULL, version bigint NOT NULL, updated_at timestamptz NOT NULL,
 code text NOT NULL DEFAULT 'SEC-001', program_type text NOT NULL DEFAULT 'REGULATORY',
 owning_function text NOT NULL DEFAULT 'SECURITY', jurisdiction text NOT NULL DEFAULT 'NG',
 status text NOT NULL DEFAULT 'ACTIVE', calculation_policy jsonb
);
CREATE TABLE program_state_snapshots (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, program_id uuid NOT NULL,
 program_version bigint NOT NULL, projection_version bigint NOT NULL,
 generated_at timestamptz NOT NULL, calculation jsonb
);
CREATE TABLE continuity_events (
 tenant_id uuid NOT NULL, aggregate_type text NOT NULL, aggregate_id uuid NOT NULL,
 aggregate_version bigint NOT NULL, event_type text NOT NULL, payload jsonb NOT NULL,
 actor_type text NOT NULL, actor_id uuid, occurred_at timestamptz NOT NULL
);
CREATE TABLE matters (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL,
 reference text NOT NULL DEFAULT 'CASE-TEST',
 title text NOT NULL DEFAULT 'Synthetic Issue',
 matter_type text NOT NULL DEFAULT 'CONTROL_GAP', priority integer NOT NULL DEFAULT 3,
 status text NOT NULL, scope jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL
);
CREATE TABLE matter_links (
 tenant_id uuid NOT NULL, matter_id uuid NOT NULL REFERENCES matters(id),
 program_id uuid NOT NULL REFERENCES programs(id)
);
CREATE TABLE program_requirements (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, program_id uuid NOT NULL REFERENCES programs(id),
 code text NOT NULL, title text NOT NULL, version bigint NOT NULL, source_id uuid,
 status text NOT NULL, effective_from timestamptz NOT NULL, effective_until timestamptz
);
CREATE TABLE program_applicability (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, program_id uuid NOT NULL REFERENCES programs(id),
 requirement_id uuid NOT NULL, status text NOT NULL, effective_from timestamptz NOT NULL,
 effective_until timestamptz, created_at timestamptz NOT NULL
);
CREATE TABLE control_implementations (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, program_id uuid NOT NULL REFERENCES programs(id),
 name text NOT NULL, status text NOT NULL, version bigint NOT NULL,
 updated_at timestamptz NOT NULL, effective_from timestamptz NOT NULL, effective_until timestamptz
);
CREATE TABLE requirement_control_links (
 tenant_id uuid NOT NULL, program_id uuid NOT NULL, requirement_id uuid NOT NULL,
 implementation_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), retired_at timestamptz
);
CREATE TABLE evidence_contracts (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, program_id uuid NOT NULL REFERENCES programs(id),
 requirement_id uuid, control_implementation_id uuid,
 code text NOT NULL, name text NOT NULL, status text NOT NULL, version bigint NOT NULL,
 updated_at timestamptz NOT NULL,
 freshness_minutes integer NOT NULL DEFAULT 60,
 minimum_coverage numeric(6,5) NOT NULL DEFAULT 0.9
);
CREATE TABLE evidence_sources (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, status text NOT NULL, health text NOT NULL
);
CREATE TABLE evidence_contract_sources (
 tenant_id uuid NOT NULL, program_id uuid NOT NULL, contract_id uuid NOT NULL,
 source_id uuid NOT NULL
);
CREATE TABLE evidence_assessments (
 id uuid PRIMARY KEY, tenant_id uuid NOT NULL, program_id uuid NOT NULL REFERENCES programs(id),
 contract_id uuid NOT NULL REFERENCES evidence_contracts(id),
 conclusion text NOT NULL, coverage numeric(6,5) NOT NULL,
 valid_until timestamptz, assessed_at timestamptz NOT NULL, created_at timestamptz NOT NULL
);
`

func fixtureUUID(n int) string { return fmt.Sprintf("00000000-0000-4000-8000-%012d",n) }

func testDB(t *testing.T) *sql.DB {
 t.Helper()
 dsn:=os.Getenv("CLEARSIGHT_TEST_POSTGRES_DSN")
 if dsn=="" {t.Skip("CLEARSIGHT_TEST_POSTGRES_DSN is not configured")}
 db,err:=sql.Open("pgx",dsn);if err!=nil{t.Fatal(err)}
 t.Cleanup(func(){_ = db.Close()})
 // SET search_path is connection-local; use exactly one connection.
 db.SetMaxOpenConns(1);db.SetMaxIdleConns(1)
 ctx,cancel:=context.WithTimeout(context.Background(),15*time.Second);defer cancel()
 if err=db.PingContext(ctx);err!=nil{t.Fatal(err)}
 schema:=fmt.Sprintf("clearsight_read_it_%d",time.Now().UnixNano())
 if _,err=db.ExecContext(ctx,"CREATE SCHEMA "+schema);err!=nil{t.Fatal(err)}
 t.Cleanup(func(){
  dropCtx,stop:=context.WithTimeout(context.Background(),10*time.Second);defer stop()
  _,_=db.ExecContext(dropCtx,"DROP SCHEMA IF EXISTS "+schema+" CASCADE")
 })
 if _,err=db.ExecContext(ctx,"SET search_path TO "+schema+",public");err!=nil{t.Fatal(err)}
 if _,err=db.ExecContext(ctx,fixtureDDL);err!=nil{t.Fatal(err)}
 return db
}

func seed(t *testing.T,db *sql.DB) {
 t.Helper()
 now:=time.Now().UTC()
 for _,s:=range []struct{id,tenant,entity int;path,status string;from time.Time;until any}{
  {201,1,11,"BANK/PAYMENTS","ACTIVE",now.Add(-time.Hour),nil},
  {202,1,11,"BANK/CARDS","ACTIVE",now.Add(-time.Hour),nil},
  {203,1,11,"BANK/PAYMENTS/OPS","ACTIVE",now.Add(-time.Hour),nil},
  {204,1,11,"BANK/RETIRED","RETIRED",now.Add(-time.Hour),nil},
  {205,1,11,"BANK/EXPIRED","ACTIVE",now.Add(-time.Hour),now.Add(-time.Minute)},
  {206,1,11,"BANK/FUTURE","ACTIVE",now.Add(time.Hour),nil},
  {207,2,22,"BANK/PAYMENTS","ACTIVE",now.Add(-time.Hour),nil},
 }{
  _,err:=db.Exec(`INSERT INTO organization_scopes(id,tenant_id,legal_entity_id,department_path,status,valid_from,valid_until)
 VALUES ($1::uuid,$2::uuid,$3::uuid,string_to_array($4,'/'),$5,$6,$7)`,
    fixtureUUID(s.id),fixtureUUID(s.tenant),fixtureUUID(s.entity),s.path,s.status,s.from,s.until)
  if err!=nil{t.Fatal(err)}
 }
 for _,p:=range []struct{id,tenant,entity,scope int}{
  {301,1,11,201},{302,1,11,202},{303,1,11,0},
  {304,2,22,207},{305,1,12,0},{306,1,11,203},
  {307,1,11,204},{308,1,11,205},{309,1,11,206},
 }{
  var scope any
  if p.scope!=0{scope=fixtureUUID(p.scope)}
  _,err:=db.Exec(`INSERT INTO programs (id,tenant_id,legal_entity_id,organization_scope_id,name,version,updated_at)
 VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,7,$6)`,
    fixtureUUID(p.id),fixtureUUID(p.tenant),fixtureUUID(p.entity),scope,
    fmt.Sprintf("Program %d",p.id),now)
  if err!=nil{t.Fatal(err)}
 }
}

func scopedActor(tenant,entity int, global bool,grant ...string) identity.Actor {
 now:=time.Now().UTC()
 a:=identity.Actor{
  TenantID:fixtureUUID(tenant),LegalEntityID:fixtureUUID(entity),
  PrincipalID:fixtureUUID(40),Kind:"PERSON",AuthenticationMethod:"SSO",
  AssuranceLevel:"MFA",SessionID:"session-test",
  IssuedAt:now.Add(-time.Minute),ExpiresAt:now.Add(time.Hour),
 }
 if global {a.PermissionCodes=[]string{identity.PermissionOversightRead}}
 if len(grant)>0 {a.DepartmentGrants=[]identity.DepartmentGrant{{
  Path:grant,PermissionCodes:[]string{identity.PermissionOversightRead},
 }}}
 return a
}

func TestPostgresScopedProgramRead(t *testing.T){
 db:=testDB(t);seed(t,db)
 repo:=NewSQLRepository(db)
 global:=scopedActor(1,11,true)
 exact:=scopedActor(1,11,false,"BANK","PAYMENTS")
 for _,tt:=range []struct{name string;actor identity.Actor;id int;allow bool}{
  {"global own",global,301,true},
  {"global unassigned",global,303,true},
  {"global other tenant",global,304,false},
  {"global other entity",global,305,false},
  {"exact own",exact,301,true},
  {"exact excludes cards",exact,302,false},
  {"exact excludes unassigned",exact,303,false},
  {"exact excludes child",exact,306,false},
  {"parent is not inherited",scopedActor(1,11,false,"BANK"),301,false},
  {"child exact",scopedActor(1,11,false,"BANK","PAYMENTS","OPS"),306,true},
  {"retired scope",scopedActor(1,11,false,"BANK","RETIRED"),307,false},
  {"expired scope",scopedActor(1,11,false,"BANK","EXPIRED"),308,false},
  {"future scope",scopedActor(1,11,false,"BANK","FUTURE"),309,false},
  {"other tenant matching scope",scopedActor(2,22,false,"BANK","PAYMENTS"),301,false},
  {"missing id",global,999,false},
 }{
  t.Run(tt.name,func(t *testing.T){
   p,err:=repo.GetVisible(context.Background(),tt.actor,fixtureUUID(tt.id))
   if tt.allow {
    if err!=nil||p.ID!=fixtureUUID(tt.id)||p.SourceRevision!="7"{
     t.Fatalf("expected permitted record, got %+v: %v",p,err)
    }
   }else if !errors.Is(err,ErrNotFound){
    t.Fatalf("out-of-scope record must be opaque 404, got %v",err)
   }
  })
 }
 expired:=global;expired.ExpiresAt=time.Now().Add(-time.Second)
 if _,err:=repo.GetVisible(context.Background(),expired,fixtureUUID(301));err==nil{
  t.Fatal("expired actor was allowed")
 }
 service:=global;service.Kind="SERVICE"
 if _,err:=repo.GetVisible(context.Background(),service,fixtureUUID(301));!errors.Is(err,ErrNotFound){
  t.Fatal("service actor was allowed",err)
 }
}

func signedProgramRequest(t *testing.T,secret string,a identity.Actor,id int)*http.Request{
 t.Helper()
 req:=httptest.NewRequest(http.MethodGet,"/api/v1/programs/"+fixtureUUID(id),nil)
 raw,err:=json.Marshal(a);if err!=nil{t.Fatal(err)}
 envelope:=base64.RawURLEncoding.EncodeToString(raw)
 ts:=strconv.FormatInt(time.Now().UTC().Unix(),10)
 mac:=hmac.New(sha256.New,[]byte(secret))
 _,_=mac.Write([]byte(strings.Join([]string{req.Method,req.URL.EscapedPath(),ts,envelope},"\n")))
 req.Header.Set(identity.HeaderIdentity,envelope)
 req.Header.Set(identity.HeaderTimestamp,ts)
 req.Header.Set(identity.HeaderSignature,hex.EncodeToString(mac.Sum(nil)))
 return req
}

func TestPostgresSignedProgramRead(t *testing.T){
 db:=testDB(t);seed(t,db)
 const secret="test-only-signing-secret-at-least-32-characters"
 signed,err:=identity.NewSignedAuthenticator(secret,2*time.Minute)
 if err!=nil{t.Fatal(err)}
 mux:=http.NewServeMux()
 mux.Handle("GET /api/v1/programs/{id}",Handler{
  Authenticator:signed,Repository:NewSQLRepository(db),
 })
 for _,tt:=range []struct{name string;actor identity.Actor;want int}{
  {"authorized",scopedActor(1,11,false,"BANK","PAYMENTS"),http.StatusOK},
  {"other tenant",scopedActor(2,22,true),http.StatusNotFound},
  {"other entity",scopedActor(1,12,true),http.StatusNotFound},
  {"other department",scopedActor(1,11,false,"BANK","CARDS"),http.StatusNotFound},
  {"missing permission",scopedActor(1,11,false),http.StatusForbidden},
 }{
  t.Run(tt.name,func(t *testing.T){
   w:=httptest.NewRecorder()
   mux.ServeHTTP(w,signedProgramRequest(t,secret,tt.actor,301))
   if w.Code!=tt.want{t.Fatalf("status=%d expected=%d body=%s",w.Code,tt.want,w.Body.String())}
   if tt.want!=http.StatusOK&&strings.Contains(w.Body.String(),"Program 301"){t.Fatal("leaked record")}
  })
 }
 tampered:=signedProgramRequest(t,secret,scopedActor(1,11,true),301)
 tampered.Header.Set(identity.HeaderSignature,"00")
 w:=httptest.NewRecorder();mux.ServeHTTP(w,tampered)
 if w.Code!=http.StatusUnauthorized{t.Fatalf("unsigned read permitted: %d",w.Code)}
}


func TestPostgresSchemaReadinessGate(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	if err := CheckOperationalSchema(ctx, db); err == nil {
		t.Fatal("reduced Program-only schema must not pass governance readiness")
	}
	if err := CheckSchema(ctx, db); err != nil {
		t.Fatalf("compatible v1 read columns rejected: %v", err)
	}
	if _, err := db.ExecContext(ctx, "ALTER TABLE organization_scopes DROP COLUMN department_path"); err != nil {
		t.Fatal(err)
	}
	if err := CheckSchema(ctx, db); err == nil {
		t.Fatal("incompatible scope schema was accepted")
	}
	if err := CheckSchema(ctx, nil); err == nil {
		t.Fatal("missing database accepted")
	}
}
