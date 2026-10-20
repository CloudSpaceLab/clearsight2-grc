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
	if err := CheckOperationalSchema(ctx, db); err != nil { t.Fatalf("full v1 governance schema rejected: %v", err) }
	if err := CheckOverviewSchema(ctx,db);err!=nil{t.Fatalf("v1 Overview retained calculation schema rejected: %v",err)}

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
	// Requirements are drawn from the actual pinned v1 schema, not the reduced fixture.
	exec(`INSERT INTO program_requirements
	    (id,tenant_id,program_id,code,title,statement,modality,status,effective_from)
	    VALUES ($1::uuid,$2::uuid,$3::uuid,'SEC-1','Current approved requirement','Synthetic acceptance requirement','MUST','APPROVED',$4),
	           ($5::uuid,$2::uuid,$3::uuid,'SEC-DRAFT','Draft requirement','Unapproved content','MUST','DRAFT',$4),
	           ($6::uuid,$7::uuid,$8::uuid,'OTHER-TENANT','Other tenant requirement','Synthetic protected statement','MUST','APPROVED',$4)`,
	    fixtureUUID(1401),fixtureUUID(1001),fixtureUUID(1301),time.Now().UTC().Add(-time.Hour),
	    fixtureUUID(1402),fixtureUUID(1403),fixtureUUID(1002),fixtureUUID(1303))
	requirements, err := reader.ListApprovedRequirements(ctx,permitted,fixtureUUID(1301),ListQuery{Limit:10})
	if err!=nil||len(requirements.Items)!=1||requirements.Items[0].Code!="SEC-1"{
		t.Fatalf("full v1 approved requirement read failed: %+v %v",requirements,err)
	}
	if _,err:=reader.ListApprovedRequirements(ctx,permitted,fixtureUUID(1303),ListQuery{Limit:10});!errors.Is(err,ErrNotFound){
		t.Fatalf("full v1 cross-tenant requirement read was not denied: %v",err)
	}
	if _,err:=reader.ListApprovedRequirements(ctx,scopedActor(1001,1011,false,"BANK","CARDS"),fixtureUUID(1301),ListQuery{Limit:10});!errors.Is(err,ErrNotFound){
		t.Fatalf("full v1 wrong department requirement read was not denied: %v",err)
	}

	// Verify the inventory joins against all pinned v1 migrations.
	exec(`INSERT INTO control_objectives(id,tenant_id,program_id,code,name,outcome,status)
	    VALUES($1::uuid,$2::uuid,$3::uuid,'AUTH','Authentication','Synthetic intended outcome','ACTIVE')`,
	    fixtureUUID(1501),fixtureUUID(1001),fixtureUUID(1301))
	exec(`INSERT INTO control_implementations(id,tenant_id,program_id,objective_id,name,description,implementation_type,status,effective_from)
	    VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,'MFA configuration','Synthetic confidential description','MANUAL','IMPLEMENTED',$5)`,
	    fixtureUUID(1511),fixtureUUID(1001),fixtureUUID(1301),fixtureUUID(1501),
	    time.Now().UTC().Add(-time.Hour))
	exec(`INSERT INTO requirement_control_links(id,tenant_id,program_id,requirement_id,implementation_id)
	    VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid)`,
	    fixtureUUID(1521),fixtureUUID(1001),fixtureUUID(1301),fixtureUUID(1401),fixtureUUID(1511))
	exec(`INSERT INTO evidence_contracts(id,tenant_id,program_id,requirement_id,code,name,claim,
	    freshness_minutes,minimum_coverage,contradiction_policy,failure_action,status)
	    VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,'AUTH-E1','MFA evidence','Synthetic confidential evidence claim',
	    1440,1,'REVIEW','FLAG','ACTIVE')`,
	    fixtureUUID(1531),fixtureUUID(1001),fixtureUUID(1301),fixtureUUID(1401))
	exec(`INSERT INTO evidence_contracts(id,tenant_id,program_id,requirement_id,code,name,claim,
	    freshness_minutes,minimum_coverage,contradiction_policy,failure_action,status)
	    VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,'AUTH-DRAFT','Draft contract','Synthetic draft claim',
	    1440,1,'REVIEW','FLAG','DRAFT')`,
	    fixtureUUID(1532),fixtureUUID(1001),fixtureUUID(1301),fixtureUUID(1401))
	for _,tc:=range []struct{kind InventoryKind;recordID int}{
		{InventoryControls,1511},{InventoryEvidenceContracts,1531},
	}{
		page,err:=reader.ListInventory(ctx,permitted,fixtureUUID(1301),tc.kind,ListQuery{Limit:20})
		if err!=nil||len(page.Items)!=1||page.Items[0].ID!=fixtureUUID(tc.recordID){
			t.Fatalf("full v1 %s inventory mismatch: %+v %v",tc.kind,page,err)
		}
		if _,err:=reader.ListInventory(ctx,permitted,fixtureUUID(1303),tc.kind,ListQuery{Limit:20});!errors.Is(err,ErrNotFound){
			t.Fatalf("%s exposed another tenant's Program: %v",tc.kind,err)
		}
	}

	// Validate the canonical evaluator loader against the complete pinned
	// production schema, not only the disposable read-contract fixtures.
	if err:=CheckCoverageSourceSchema(ctx,db);err!=nil{
		t.Fatalf("full v1 coverage source schema mismatch: %v",err)
	}
	coverage,err:=reader.currentCoverage(ctx,permitted,fixtureUUID(1301))
	if err!=nil||len(coverage)!=1||coverage[fixtureUUID(1401)].Complete{
		t.Fatalf("unknown applicability must never become compliance: %+v %v",coverage,err)
	}
	if _,err:=reader.currentCoverage(ctx,permitted,fixtureUUID(1303));!errors.Is(err,ErrNotFound){
		t.Fatalf("cross-tenant canonical source read was not denied: %v",err)
	}

	// On the complete pinned v1 schema, only the authenticated principal's
	// visible Matters may influence the Program-facing exception position.
	exec(`INSERT INTO matters(id,tenant_id,legal_entity_id,reference,matter_type,status,priority,title,summary,scope)
	VALUES ($1::uuid,$2::uuid,$5::uuid,'V2-A','CONTROL_GAP','TRIAGE',3,'Synthetic internal','Test only','{}'::jsonb),
	       ($3::uuid,$2::uuid,$5::uuid,'V2-B','CONTROL_GAP','TRIAGE',3,'Synthetic restricted','Test only',
	       jsonb_build_object('access','RESTRICTED','allowed_principal_ids',jsonb_build_array($4::text)))`,
		fixtureUUID(1601),fixtureUUID(1001),fixtureUUID(1602),fixtureUUID(9999),fixtureUUID(1011))
	exec(`INSERT INTO matter_links(tenant_id,matter_id,program_id)
	VALUES($1::uuid,$2::uuid,$3::uuid),($1::uuid,$4::uuid,$3::uuid)`,
		fixtureUUID(1001),fixtureUUID(1601),fixtureUUID(1301),fixtureUUID(1602))
	internal,err:=reader.currentCoverageSnapshot(ctx,permitted,fixtureUUID(1301))
	if err!=nil || internal.VisibleMatters.OpenCount!=1 {
		t.Fatalf("restricted Matter leaked through v1 schema: %+v %v",internal.VisibleMatters,err)
	}
	if _,err:=reader.currentCoverageSnapshot(ctx,permitted,fixtureUUID(1303));!errors.Is(err,ErrNotFound){
		t.Fatalf("cross-tenant Matter count reached outside actor scope: %v",err)
	}
	issues,err:=reader.ListVisibleIssues(ctx,permitted,fixtureUUID(1301),ListQuery{Limit:10})
	if err!=nil||len(issues.Items)!=1||issues.Items[0].ID!=fixtureUUID(1601){
		t.Fatalf("pinned v1 Matter list disclosed an unauthorized record: %+v %v",issues,err)
	}
	if _,err:=reader.ListVisibleIssues(ctx,permitted,fixtureUUID(1303),ListQuery{Limit:10});!errors.Is(err,ErrNotFound){
		t.Fatalf("pinned v1 Issue listing bypassed tenant authorization: %v",err)
	}

}
