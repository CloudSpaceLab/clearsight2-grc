package programread

import (
 "context"
 "database/sql"
 "errors"
 "fmt"
 "time"

 "github.com/CloudSpaceLab/clearsight2-grc/internal/identity"
)

// RequirementReference is a current, approved source record—not an
// applicability decision, assessed control, or compliance score.
type RequirementReference struct {
 ID string `json:"id"`
 Code string `json:"code"`
 Title string `json:"title"`
 Version int64 `json:"version"`
 EffectiveFrom time.Time `json:"effective_from"`
}

type RequirementPage struct {
 ProgramID string `json:"program_id"`
 ProgramRevision string `json:"program_revision"`
 Items []RequirementReference `json:"items"`
 NextCursor string `json:"next_cursor,omitempty"`
}

type RequirementsRepository interface {
 ListApprovedRequirements(context.Context, identity.Actor, string, ListQuery) (RequirementPage,error)
}

// The query runs inside the SAME repeatable-read transaction as the existing
// actor-scoped Program lookup. Authorization cannot race a scope change.
const approvedRequirementsSQL = `
SELECT r.id::text,r.code,r.title,r.version,r.effective_from
FROM program_requirements AS r
WHERE r.tenant_id=$1::uuid
  AND r.program_id=$2::uuid
  AND r.status='APPROVED'
  AND r.effective_from<=transaction_timestamp()
  AND (r.effective_until IS NULL OR transaction_timestamp()<r.effective_until)
  AND ($3::timestamptz IS NULL OR (r.effective_from,r.id)<($3::timestamptz,$4::uuid))
ORDER BY r.effective_from DESC,r.id DESC
LIMIT $5
`

type transactionReader struct { tx *sql.Tx }
func (r transactionReader) QueryRowContext(ctx context.Context, statement string,args ...any) scannedRow {
 return r.tx.QueryRowContext(ctx,statement,args...)
}

func (r *SQLRepository) ListApprovedRequirements(ctx context.Context, actor identity.Actor, programID string, query ListQuery) (RequirementPage,error) {
 if r==nil||r.db==nil{return RequirementPage{},errors.New("program repository unavailable")}
 if query.Limit<1||query.Limit>maximumPageSize{return RequirementPage{},errors.New("invalid requirement page size")}
 cursor,err:=decodeListCursor(query.Cursor)
 if err!=nil{return RequirementPage{},err}
 if !isUUID(programID){return RequirementPage{},ErrNotFound}
 if err:=actor.Valid(time.Now().UTC());err!=nil{return RequirementPage{},err}
 tx,err:=r.db.BeginTx(ctx,&sql.TxOptions{Isolation:sql.LevelRepeatableRead,ReadOnly:true})
 if err!=nil{return RequirementPage{},fmt.Errorf("begin scoped requirement read: %w",err)}
 defer func(){_ = tx.Rollback()}()

 program,err:=getVisible(ctx,transactionReader{tx:tx},actor,programID)
 if err!=nil{return RequirementPage{},err}

 var afterTime,afterID any
 if !cursor.UpdatedAt.IsZero(){
  afterTime=cursor.UpdatedAt
  afterID=cursor.ID
 }
 rows,err:=tx.QueryContext(ctx,approvedRequirementsSQL,
  actor.TenantID,program.ID,afterTime,afterID,query.Limit+1)
 if err!=nil{return RequirementPage{},fmt.Errorf("read approved requirements: %w",err)}
 page:=RequirementPage{
  ProgramID:program.ID,ProgramRevision:program.SourceRevision,
  Items:make([]RequirementReference,0,query.Limit),
 }
 for rows.Next(){
  var item RequirementReference
  if err:=rows.Scan(&item.ID,&item.Code,&item.Title,&item.Version,&item.EffectiveFrom);err!=nil{
   _=rows.Close()
   return RequirementPage{},fmt.Errorf("scan approved requirement: %w",err)
  }
  if !isUUID(item.ID)||item.Version<1||item.Code==""||item.Title==""||item.EffectiveFrom.IsZero(){
   _=rows.Close()
   return RequirementPage{},errors.New("invalid approved requirement record")
  }
  if len(page.Items)==query.Limit{
   last:=page.Items[len(page.Items)-1]
   page.NextCursor=encodeListCursor(last.EffectiveFrom,last.ID)
   break
  }
  page.Items=append(page.Items,item)
 }
 if err:=rows.Err();err!=nil{
  _=rows.Close()
  return RequirementPage{},fmt.Errorf("iterate approved requirements: %w",err)
 }
 if err:=rows.Close();err!=nil{return RequirementPage{},fmt.Errorf("close approved requirements: %w",err)}
 if err:=tx.Commit();err!=nil{return RequirementPage{},fmt.Errorf("complete scoped requirement read: %w",err)}
 return page,nil
}
