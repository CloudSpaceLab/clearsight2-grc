//go:build postgres

package programread

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/CloudSpaceLab/clearsight2-grc/internal/identity"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// This test uses the entire upstream migration chain, not the reduced
// read-contract fixture. CI must provision an isolated database for it.
func TestPinnedV1CompleteSchemaActorScope(t *testing.T) {
	dsn := os.Getenv("CLEARSIGHT_TEST_UPSTREAM_DSN")
	if dsn == "" {
		t.Skip("full-schema test requires CLEARSIGHT_TEST_UPSTREAM_DSN")
	}
	db, err := sql.Open("pgx", dsn)
	if err != nil { t.Fatal(err) }
	t.Cleanup(func() { _ = db.Close() })
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil { t.Fatal(err) }
	if err := CheckSchema(ctx, db); err != nil { t.Fatal(err) }

	exec := func(statement string, args ...any) {
		t.Helper()
		if _, err := db.ExecContext(ctx, statement, args...); err != nil { t.Fatal(err) }
	}
	// All identifiers are synthetic. No customer database is ever used.
	exec("INSERT INTO tenants(id,slug,name) VALUES ($1::uuid,'v2-compat-tenant-a','Compatibility A'),($2::uuid,'v2-compat-tenant-b','Compatibility B')",
		fixtureUUID(1001), fixtureUUID(1002))
	exec(`INSERT INTO legal_entities(id,tenant_id,code,name,jurisdiction)
	VALUES ($1::uuid,$2::uuid,'BANK-A','Bank A','NG'),
	       ($3::uuid,$4::uuid,'BANK-B','Bank B','NG'),
	       ($5::uuid,$6::uuid,'ENTITY-C','Entity C','NG')`,
		fixtureUUID(1011),fixtureUUID(1001),
		fixtureUUID(1022),fixtureUUID(1002),
		fixtureUUID(1012),fixtureUUID(1001))

	exec(`INSERT INTO organization_scopes
	(id,tenant_id,legal_entity_id,code,name,kind,department_path,origin,status,valid_from)
	VALUES ($1::uuid,$2::uuid,$3::uuid,'PAYMENTS','Payments','DEPARTMENT',ARRAY['BANK','PAYMENTS'],'MANAGED','ACTIVE',$4),
	       ($5::uuid,$2::uuid,$3::uuid,'CARDS','Cards','DEPARTMENT',ARRAY['BANK','CARDS'],'MANAGED','ACTIVE',$4),
	       ($6::uuid,$7::uuid,$8::uuid,'PAYMENTS','Payments','DEPARTMENT',ARRAY['BANK','PAYMENTS'],'MANAGED','ACTIVE',$4)`,
		fixtureUUID(1201),fixtureUUID(1001),fixtureUUID(1011),time.Now().UTC().Add(-time.Hour),
		fixtureUUID(1202),fixtureUUID(1203),fixtureUUID(1002),fixtureUUID(1022))

	exec(`INSERT INTO programs
	(id,tenant_id,legal_entity_id,organization_scope_id,code,name,program_type,
	 owning_function,jurisdiction,effective_from)
	VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,'SECURITY-A','Security A','REGULATORY','SECURITY','NG',$5),
	       ($6::uuid,$2::uuid,$3::uuid,$7::uuid,'SECURITY-B','Security B','REGULATORY','SECURITY','NG',$5),
	       ($8::uuid,$9::uuid,$10::uuid,$11::uuid,'SECURITY-C','Security C','REGULATORY','SECURITY','NG',$5)`,
		fixtureUUID(1301),fixtureUUID(1001),fixtureUUID(1011),fixtureUUID(1201),time.Now().UTC().Add(-time.Hour),
		fixtureUUID(1302),fixtureUUID(1202),
		fixtureUUID(1303),fixtureUUID(1002),fixtureUUID(1022),fixtureUUID(1203))

	reader := NewSQLRepository(db)
	permitted := scopedActor(1001,1011,false,"BANK","PAYMENTS")
	global := scopedActor(1001,1011,true)
	for _, tc := range []struct{
		name string; actor identity.Actor; program int; allowed bool
	}{
		{"exact permitted",permitted,1301,true},
		{"ungranted department",permitted,1302,false},
		{"cross tenant",permitted,1303,false},
		{"wrong entity",scopedActor(1001,1012,true),1301,false},
		{"global own",global,1302,true},
		{"global other tenant",global,1303,false},
		{"parent has no inherited grant",scopedActor(1001,1011,false,"BANK"),1301,false},
	} {
		t.Run(tc.name,func(t *testing.T){
			p,err:=reader.GetVisible(ctx,tc.actor,fixtureUUID(tc.program))
			if tc.allowed {
				if err!=nil || p.ID!=fixtureUUID(tc.program) || p.SourceRevision==""{
					t.Fatalf("authorized Program missing: %+v %v",p,err)
				}
			} else if !errors.Is(err,ErrNotFound) {
				t.Fatalf("unexpected disclosure or error: %+v %v",p,err)
			}
		})
	}
}
