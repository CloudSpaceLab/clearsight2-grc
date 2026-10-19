package programread

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

// operationalSchemaSQL is a fail-closed read-only structural gate. It checks
// selected late v1 governance contracts in addition to the Program read query.
// It is not proof of migration history or authorization configuration.
const operationalSchemaSQL = `
SELECT COALESCE(string_agg(required.table_name || '.' || required.column_name, ', ' ORDER BY required.table_name, required.column_name),'')
FROM (
  VALUES
    ('programs','tenant_id'),
    ('programs','legal_entity_id'),
    ('programs','organization_scope_id'),
    ('organization_scopes','tenant_id'),
    ('organization_scopes','legal_entity_id'),
    ('organization_scopes','department_path'),
    ('organization_scopes','status'),
    ('program_requirements','program_id'),
    ('program_state_snapshots','projection_version'),
    ('program_framework_adoptions','edition_id'),
    ('framework_clause_requirement_links','status'),
    ('organization_scope_lineage_events','scope_version'),
    ('audit_events','tenant_id'),
    ('outbox_events','tenant_id'),
    ('framework_catalog_editions','release_sha256')
) AS required(table_name,column_name)
WHERE NOT EXISTS (
 SELECT 1
 FROM pg_catalog.pg_namespace n
 JOIN pg_catalog.pg_class c ON c.relnamespace=n.oid
 JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid
 WHERE n.nspname=current_schema()
   AND c.relkind IN ('r','p')
   AND c.relname=required.table_name
   AND a.attname=required.column_name
   AND a.attnum>0 AND NOT a.attisdropped
)
`

// CheckOperationalSchema checks the v1 governance relations required before
// activating Program metadata on a deployed ClearSight 2 database. The
// separate migration rehearsal proves the pinned 155-step sequence actually
// applies in CI. Schema ownership and upgrade receipts remain deployment gates.
func CheckOperationalSchema(ctx context.Context, db *sql.DB) error {
	if db == nil {
		return errors.New("program database is unavailable")
	}
	var missing string
	if err := db.QueryRowContext(ctx, operationalSchemaSQL).Scan(&missing); err != nil {
		return fmt.Errorf("cannot verify Program governance schema: %w", err)
	}
	if missing != "" {
		return fmt.Errorf("program governance schema is incomplete: %s", missing)
	}
	return nil
}
