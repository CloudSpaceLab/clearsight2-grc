package programread

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
 "strings"
	"time"

	"github.com/CloudSpaceLab/clearsight2-grc/internal/identity"
)

const visibleProgramListSQL = "SELECT " + programMetadataColumns + `

FROM programs AS p
LEFT JOIN organization_scopes AS scope
  ON scope.id=p.organization_scope_id
 AND scope.tenant_id=p.tenant_id
 AND scope.legal_entity_id=p.legal_entity_id
 AND scope.status='ACTIVE'
 AND scope.valid_from<=statement_timestamp()
 AND (scope.valid_until IS NULL OR statement_timestamp()<scope.valid_until)
WHERE p.tenant_id=$1::uuid
  AND p.legal_entity_id=$2::uuid
  AND (
    $3::boolean
    OR (
      scope.id IS NOT NULL AND EXISTS (
        SELECT 1 FROM jsonb_array_elements($4::jsonb) AS grant_path(value)
        WHERE grant_path.value=to_jsonb(scope.department_path)
      )
    )
  )
  AND ($5::timestamptz IS NULL OR (p.updated_at,p.id)<($5::timestamptz,$6::uuid))
  AND ($8::text='' OR p.code ILIKE $8::text || '%'
       OR p.name ILIKE '%' || $8::text || '%')
  AND ($9::text='' OR p.status=$9::text)
ORDER BY p.updated_at DESC,p.id DESC
LIMIT $7
`

// ListVisible applies tenant, entity and exact organization scope in SQL,
// not in the browser and not after a tenant-wide data fetch.
func (r *SQLRepository) ListVisible(ctx context.Context, actor identity.Actor, query ListQuery) (ListPage,error) {
	if r==nil||r.db==nil {return ListPage{},errors.New("program repository unavailable")}
	if err:=actor.Valid(time.Now().UTC());err!=nil{return ListPage{},err}
	if actor.LegalEntityID=="*"||strings.EqualFold(actor.Kind,"SERVICE") {
		return ListPage{},ErrNotFound
	}
	if query.Limit<1||query.Limit>maximumPageSize{return ListPage{},errors.New("invalid page size")}
	cursor,err:=decodeListCursor(query.Cursor)
	if err!=nil{return ListPage{},err}
	global,paths,err:=actorReadScope(actor)
	if err!=nil{return ListPage{},err}
	var afterTime any
	var afterID any
	if !cursor.UpdatedAt.IsZero() {
		afterTime=cursor.UpdatedAt
		afterID=cursor.ID
	}
	rows,err:=r.db.QueryContext(ctx,visibleProgramListSQL,
		actor.TenantID,actor.LegalEntityID,global,paths,afterTime,afterID,query.Limit+1,
   escapeProgramSearch(query.Search),query.Status)
	if err!=nil{return ListPage{},fmt.Errorf("read scoped Program list: %w",err)}
	defer rows.Close()
	result:=ListPage{Items:make([]Record,0,query.Limit)}
	for rows.Next() {
		var record Record
		var version int64
		var pathJSON string
		if err:=rows.Scan(&record.ID,&record.Name,&version,&record.UpdatedAt,
			&record.TenantID,&record.LegalEntityID,&pathJSON,
   &record.Code,&record.Status,&record.ProgramType,&record.OwningFunction,&record.Jurisdiction);err!=nil {
			return ListPage{},fmt.Errorf("scan Program list: %w",err)
		}
		if version<1||!isUUID(record.ID)||
			json.Unmarshal([]byte(pathJSON),&record.DepartmentPath)!=nil {
			return ListPage{},errors.New("invalid scoped Program record")
		}
		record.SourceRevision=fmt.Sprint(version)
		if !visibleToActor(actor,record.ID,record){
			return ListPage{},errors.New("invalid actor-visible Program record")
		}
		if len(result.Items)==query.Limit {
			last:=result.Items[len(result.Items)-1]
			result.NextCursor=encodeListCursor(last.UpdatedAt,last.ID)
			break
		}
		result.Items=append(result.Items,record)
	}
	if err:=rows.Err();err!=nil{return ListPage{},fmt.Errorf("list Program rows: %w",err)}
	return result,nil
}

// Treat %, _ and backslashes as literal search text, not LIKE wildcards.
// Values remain bound parameters; no SQL string interpolation.
func escapeProgramSearch(value string)string{
 return strings.NewReplacer("\\","\\\\","%","\\%","_","\\_").Replace(value)
}
