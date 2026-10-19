package programread

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/CloudSpaceLab/clearsight2-grc/internal/identity"
)

// SQLRepository reads the v1 program/organization-scopes schema.
// A concrete database driver and validated migrations are required at deployment.
// The repository does not publish any HTTP routes.
type SQLRepository struct {
	db *sql.DB
}

func NewSQLRepository(db *sql.DB) *SQLRepository {
	return &SQLRepository{db: db}
}

 // CheckSchema verifies the v1 read query can be prepared against the selected
 // PostgreSQL schema before the Program route is activated. It does not prove
 // migration completeness, grant authorization or access customer records.
 func CheckSchema(ctx context.Context, db *sql.DB) error {
  if db == nil { return errors.New("program database is unavailable") }
  statement, err := db.PrepareContext(ctx, visibleProgramSQL)
  if err != nil { return fmt.Errorf("program schema is incompatible: %w", err) }
  if err := statement.Close(); err != nil { return fmt.Errorf("close program schema check: %w", err) }
  listStatement, err := db.PrepareContext(ctx, visibleProgramListSQL)
  if err != nil { return fmt.Errorf("Program list schema incompatible: %w", err) }
  if err := listStatement.Close(); err != nil { return fmt.Errorf("close Program list schema check: %w", err) }
  requirementsStatement, err := db.PrepareContext(ctx, approvedRequirementsSQL)
  if err != nil { return fmt.Errorf("Program requirements schema incompatible: %w", err) }
  if err := requirementsStatement.Close(); err != nil { return fmt.Errorf("close Program requirements schema check: %w", err) }
  for _, statement := range []string{controlInventorySQL,evidenceInventorySQL} {
    prepared,err:=db.PrepareContext(ctx,statement)
    if err!=nil{return fmt.Errorf("Program inventory schema incompatible: %w",err)}
    if err:=prepared.Close();err!=nil{return fmt.Errorf("close Program inventory schema check: %w",err)}
  }
  return nil
 }

// The authorization predicate is evaluated by PostgreSQL BEFORE retrieving a row.
// A scoped actor cannot retrieve organization-wide or unassigned Programs.
// Department grants match the exact normalized path, without implicit inheritance.
const visibleProgramSQL = `
SELECT
	p.id::text,
	p.name,
	p.version,
	p.updated_at,
	p.tenant_id::text,
	p.legal_entity_id::text,
	COALESCE(to_jsonb(scope.department_path), '[]'::jsonb)::text
FROM programs AS p
LEFT JOIN organization_scopes AS scope
	ON scope.id = p.organization_scope_id
	AND scope.tenant_id = p.tenant_id
	AND scope.legal_entity_id = p.legal_entity_id
	AND scope.status = 'ACTIVE'
	AND scope.valid_from <= statement_timestamp()
	AND (scope.valid_until IS NULL OR statement_timestamp() < scope.valid_until)
WHERE p.id = $3::uuid
	AND p.tenant_id = $1::uuid
	AND p.legal_entity_id = $2::uuid
	AND (
		$4::boolean
		OR (
			scope.id IS NOT NULL
			AND EXISTS (
				SELECT 1
				FROM jsonb_array_elements($5::jsonb) AS grant_path(value)
				WHERE grant_path.value = to_jsonb(scope.department_path)
			)
		)
	)
LIMIT 1
`

type scannedRow interface {
	Scan(...any) error
}

type programQuerier interface {
	QueryRowContext(context.Context, string, ...any) scannedRow
}

type sqlQuerier struct {
	db *sql.DB
}

func (q sqlQuerier) QueryRowContext(ctx context.Context, statement string, args ...any) scannedRow {
	return q.db.QueryRowContext(ctx, statement, args...)
}

func (r *SQLRepository) GetVisible(ctx context.Context, actor identity.Actor, id string) (Record, error) {
	if r == nil || r.db == nil {
		return Record{}, errors.New("program repository unavailable")
	}
	return getVisible(ctx, sqlQuerier{db: r.db}, actor, id)
}

func getVisible(ctx context.Context, q programQuerier, actor identity.Actor, id string) (Record, error) {
	if q == nil {
		return Record{}, errors.New("program query service unavailable")
	}
	if err := actor.Valid(time.Now().UTC()); err != nil {
		return Record{}, err
	}
	if actor.LegalEntityID == "*" || strings.EqualFold(actor.Kind, "SERVICE") {
		return Record{}, ErrNotFound
	}
	id = strings.TrimSpace(id)
	if id == "" || len(id) > 128 || strings.ContainsAny(id, "/\\\r\n\t") {
		return Record{}, ErrNotFound
	}

	global, permissions, err := actorReadScope(actor)
	if err != nil {
		return Record{}, err
	}

	var p Record
	var version int64
	var pathJSON string
	err = q.QueryRowContext(ctx, visibleProgramSQL,
		actor.TenantID, actor.LegalEntityID, id, global, permissions,
	).Scan(&p.ID, &p.Name, &version, &p.UpdatedAt, &p.TenantID, &p.LegalEntityID, &pathJSON)
	if errors.Is(err, sql.ErrNoRows) {
		return Record{}, ErrNotFound
	}
	if err != nil {
		return Record{}, fmt.Errorf("read scoped program: %w", err)
	}
	if version < 1 || json.Unmarshal([]byte(pathJSON), &p.DepartmentPath) != nil {
		return Record{}, errors.New("invalid actor-scoped program projection")
	}
	p.SourceRevision = strconv.FormatInt(version, 10)
	if !visibleToActor(actor, id, p) {
		return Record{}, errors.New("invalid actor-scoped program projection")
	}
	return p, nil
}

// actorReadScope forms exact database-bound grants. It never infers hierarchical permissions.
func actorReadScope(actor identity.Actor) (bool,string,error) {
	global := identity.HasPermission(actor, identity.PermissionOversightRead)
	paths := make([][]string, 0, len(actor.DepartmentGrants))
	if !global {
		for _, grant := range actor.DepartmentGrants {
			if len(grant.Path) == 0 ||
				!identity.HasDepartmentPermission(actor, grant.Path, identity.PermissionOversightRead) {
				continue
			}
			path, err := identity.NormalizeDepartmentPath(grant.Path)
			if err != nil || len(path) == 0 {
				continue
			}
			paths = append(paths, path)
		}
		if len(paths) == 0 {
			return false, "", ErrNotFound
		}
	}
	permissions, err := json.Marshal(paths)
	if err != nil {
		return false, "", fmt.Errorf("encode allowed department paths: %w", err)
	}

	return global,string(permissions),nil
}
