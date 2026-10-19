package programread

import (
 "context"
 "database/sql"
 "errors"
 "fmt"
 "time"

 "github.com/CloudSpaceLab/clearsight2-grc/internal/identity"
)

// InventoryKind selects a fixed server-owned query, never client-supplied SQL.
type InventoryKind string
const (
 InventoryControls InventoryKind = "controls"
 InventoryEvidenceContracts InventoryKind = "evidence-contracts"
)

// InventoryRecord is source metadata, not control effectiveness or evidence quality.
type InventoryRecord struct {
 ID string `json:"id"`
 Code string `json:"code,omitempty"`
 Name string `json:"name"`
 Status string `json:"status"`
 Version int64 `json:"version"`
 UpdatedAt time.Time `json:"updated_at"`
}
type InventoryPage struct {
 ProgramID string `json:"program_id"`
 ProgramRevision string `json:"program_revision"`
 Items []InventoryRecord `json:"items"`
 NextCursor string `json:"next_cursor,omitempty"`
}
type InventoryRepository interface {
 ListInventory(context.Context, identity.Actor, string, InventoryKind, ListQuery) (InventoryPage,error)
}

const approvedRequirementLink = `
 JOIN program_requirements req
   ON req.id=link.requirement_id
  AND req.tenant_id=link.tenant_id
  AND req.program_id=link.program_id
  AND req.status='APPROVED'
  AND req.effective_from<=transaction_timestamp()
  AND (req.effective_until IS NULL OR transaction_timestamp()<req.effective_until)`

const controlInventorySQL = `
SELECT c.id::text,''::text,c.name,c.status,c.version,c.updated_at
FROM control_implementations c
WHERE c.tenant_id=$1::uuid AND c.program_id=$2::uuid
 AND c.status IN ('PLANNED','IN_PROGRESS','IMPLEMENTED')
 AND c.effective_from<=transaction_timestamp()
 AND (c.effective_until IS NULL OR transaction_timestamp()<c.effective_until)
 AND EXISTS (
  SELECT 1 FROM requirement_control_links link` + approvedRequirementLink + `
  WHERE link.tenant_id=c.tenant_id AND link.program_id=c.program_id
   AND link.implementation_id=c.id
 )
 AND ($3::timestamptz IS NULL OR (c.updated_at,c.id)<($3::timestamptz,$4::uuid))
ORDER BY c.updated_at DESC,c.id DESC LIMIT $5`

const evidenceInventorySQL = `
SELECT e.id::text,e.code,e.name,e.status,e.version,e.updated_at
FROM evidence_contracts e
WHERE e.tenant_id=$1::uuid AND e.program_id=$2::uuid
 AND e.status='ACTIVE'
 AND (
   EXISTS (
    SELECT 1 FROM program_requirements req
    WHERE req.id=e.requirement_id AND req.tenant_id=e.tenant_id
      AND req.program_id=e.program_id AND req.status='APPROVED'
      AND req.effective_from<=transaction_timestamp()
      AND (req.effective_until IS NULL OR transaction_timestamp()<req.effective_until)
   )
   OR EXISTS (
     SELECT 1 FROM control_implementations c
     JOIN requirement_control_links link
       ON link.implementation_id=c.id AND link.tenant_id=c.tenant_id
      AND link.program_id=c.program_id` + approvedRequirementLink + `
     WHERE c.id=e.control_implementation_id AND c.tenant_id=e.tenant_id
      AND c.program_id=e.program_id
      AND c.status IN ('PLANNED','IN_PROGRESS','IMPLEMENTED')
      AND c.effective_from<=transaction_timestamp()
      AND (c.effective_until IS NULL OR transaction_timestamp()<c.effective_until)
   )
 )
 AND ($3::timestamptz IS NULL OR (e.updated_at,e.id)<($3::timestamptz,$4::uuid))
ORDER BY e.updated_at DESC,e.id DESC LIMIT $5`

func inventorySQL(kind InventoryKind)(string,error){
 switch kind {
 case InventoryControls: return controlInventorySQL,nil
 case InventoryEvidenceContracts: return evidenceInventorySQL,nil
 default:return "",errors.New("invalid inventory kind")
 }
}

// Read access is scoped by the existing Program authorization query before
// returning inventory rows. Both queries use the same repeatable-read snapshot.
func (r *SQLRepository) ListInventory(ctx context.Context,actor identity.Actor,programID string,kind InventoryKind,query ListQuery)(InventoryPage,error){
 if r==nil||r.db==nil{return InventoryPage{},errors.New("program repository unavailable")}
 statement,err:=inventorySQL(kind)
 if err!=nil{return InventoryPage{},err}
 if query.Limit<1||query.Limit>maximumPageSize{return InventoryPage{},errors.New("invalid page size")}
 cursor,err:=decodeListCursor(query.Cursor)
 if err!=nil{return InventoryPage{},err}
 if !isUUID(programID){return InventoryPage{},ErrNotFound}
 if err:=actor.Valid(time.Now().UTC());err!=nil{return InventoryPage{},err}
 tx,err:=r.db.BeginTx(ctx,&sql.TxOptions{Isolation:sql.LevelRepeatableRead,ReadOnly:true})
 if err!=nil{return InventoryPage{},fmt.Errorf("begin inventory read: %w",err)}
 defer func(){_ = tx.Rollback()}()
 program,err:=getVisible(ctx,transactionReader{tx:tx},actor,programID)
 if err!=nil{return InventoryPage{},err}
 var afterTime,afterID any
 if !cursor.UpdatedAt.IsZero(){afterTime=cursor.UpdatedAt;afterID=cursor.ID}
 rows,err:=tx.QueryContext(ctx,statement,actor.TenantID,program.ID,afterTime,afterID,query.Limit+1)
 if err!=nil{return InventoryPage{},fmt.Errorf("read Program inventory: %w",err)}
 page:=InventoryPage{ProgramID:program.ID,ProgramRevision:program.SourceRevision,Items:make([]InventoryRecord,0,query.Limit)}
 for rows.Next(){
  var item InventoryRecord
  if err:=rows.Scan(&item.ID,&item.Code,&item.Name,&item.Status,&item.Version,&item.UpdatedAt);err!=nil{
   _=rows.Close()
   return InventoryPage{},fmt.Errorf("scan Program inventory: %w",err)
  }
  if !validInventoryRecord(kind,item){
   _=rows.Close()
   return InventoryPage{},errors.New("invalid Program inventory record")
  }
  if len(page.Items)==query.Limit{
   last:=page.Items[len(page.Items)-1]
   page.NextCursor=encodeListCursor(last.UpdatedAt,last.ID)
   break
  }
  page.Items=append(page.Items,item)
 }
 if err:=rows.Err();err!=nil{_ = rows.Close();return InventoryPage{},fmt.Errorf("iterate inventory: %w",err)}
 if err:=rows.Close();err!=nil{return InventoryPage{},fmt.Errorf("close inventory: %w",err)}
 if err:=tx.Commit();err!=nil{return InventoryPage{},fmt.Errorf("finish inventory read: %w",err)}
 return page,nil
}

func validInventoryRecord(kind InventoryKind,item InventoryRecord)bool{
 if !isUUID(item.ID)||item.Name==""||item.Version<1||item.UpdatedAt.IsZero(){return false}
 switch kind {
 case InventoryControls:
  return item.Code=="" && (item.Status=="PLANNED"||item.Status=="IN_PROGRESS"||item.Status=="IMPLEMENTED")
 case InventoryEvidenceContracts:
  return item.Code!="" && item.Status=="ACTIVE"
 default:return false
 }
}
