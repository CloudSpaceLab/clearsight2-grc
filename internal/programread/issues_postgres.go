package programread

import (
 "context"
 "database/sql"
 "errors"
 "fmt"
 "strings"
 "time"

 "github.com/CloudSpaceLab/clearsight2-grc/internal/identity"
)

type ProgramIssue struct {
 ID string `json:"id"`
 Reference string `json:"reference"`
 Title string `json:"title"`
 Type string `json:"type"`
 Status string `json:"status"`
 Priority int `json:"priority"`
 UpdatedAt time.Time `json:"updated_at"`
}
type IssuePage struct {
 ProgramID string `json:"program_id"`
 ProgramRevision string `json:"program_revision"`
 Items []ProgramIssue `json:"items"`
 NextCursor string `json:"next_cursor,omitempty"`
}
type IssueRepository interface {
 ListVisibleIssues(context.Context,identity.Actor,string,ListQuery)(IssuePage,error)
}

const visibleIssueListSQL = `
SELECT m.id::text,m.reference,m.title,m.matter_type,m.status,m.priority,m.updated_at
` + visibleProgramMatterScopeSQL + `
 AND ($5::timestamptz IS NULL OR (m.updated_at,m.id)<($5::timestamptz,$6::uuid))
ORDER BY m.updated_at DESC,m.id DESC
LIMIT $7
`

func (r *SQLRepository) ListVisibleIssues(
 ctx context.Context, actor identity.Actor,id string,query ListQuery,
)(IssuePage,error){
 if r==nil||r.db==nil{return IssuePage{},errors.New("Program repository unavailable")}
 if !isUUID(id){return IssuePage{},ErrNotFound}
 if err:=actor.Valid(time.Now().UTC());err!=nil{return IssuePage{},err}
 if query.Limit<1||query.Limit>maximumPageSize||query.Search!=""||query.Status!=""{
  return IssuePage{},errors.New("invalid Issues page parameters")
 }
 cursor,err:=decodeListCursor(query.Cursor)
 if err!=nil{return IssuePage{},err}
 tx,err:=r.db.BeginTx(ctx,&sql.TxOptions{ReadOnly:true,Isolation:sql.LevelRepeatableRead})
 if err!=nil{return IssuePage{},fmt.Errorf("begin scoped Issues read: %w",err)}
 defer func(){_ = tx.Rollback()}()
 program,err:=getVisible(ctx,transactionReader{tx:tx},actor,id)
 if err!=nil{return IssuePage{},err}
 var afterTime,afterID any
 if !cursor.UpdatedAt.IsZero(){afterTime=cursor.UpdatedAt;afterID=cursor.ID}
 rows,err:=tx.QueryContext(ctx,visibleIssueListSQL,
  actor.TenantID,program.ID,actor.PrincipalID,actor.LegalEntityID,
  afterTime,afterID,query.Limit+1)
 if err!=nil{return IssuePage{},fmt.Errorf("load scoped Issues: %w",err)}
 result:=IssuePage{ProgramID:id,ProgramRevision:program.SourceRevision,Items:make([]ProgramIssue,0,query.Limit)}
 for rows.Next(){
  var v ProgramIssue
  if err:=rows.Scan(&v.ID,&v.Reference,&v.Title,&v.Type,&v.Status,&v.Priority,&v.UpdatedAt);err!=nil{
   _=rows.Close();return IssuePage{},fmt.Errorf("decode visible Matter: %w",err)
  }
  if !validProgramIssue(v){
   _=rows.Close();return IssuePage{},errors.New("invalid actor-visible Matter")
  }
  if len(result.Items)==query.Limit{
   last:=result.Items[len(result.Items)-1]
   result.NextCursor=encodeListCursor(last.UpdatedAt,last.ID)
   break
  }
  result.Items=append(result.Items,v)
 }
 if err:=rows.Err();err!=nil{_ = rows.Close();return IssuePage{},fmt.Errorf("iterate visible Matters: %w",err)}
 if err:=rows.Close();err!=nil{return IssuePage{},fmt.Errorf("close visible Matters: %w",err)}
 if err:=tx.Commit();err!=nil{return IssuePage{},fmt.Errorf("finish scoped Issues read: %w",err)}
 return result,nil
}

func validProgramIssue(v ProgramIssue)bool{
 return isUUID(v.ID)&&strings.TrimSpace(v.Reference)!=""&&len(v.Reference)<=128&&
  strings.TrimSpace(v.Title)!=""&&len(v.Title)<=512&&
  strings.TrimSpace(v.Type)!=""&&len(v.Type)<=100&&
  v.Status!="CLOSED"&&v.Status!="CANCELLED"&&strings.TrimSpace(v.Status)!=""&&
  v.Priority>=1&&v.Priority<=5&&!v.UpdatedAt.IsZero()
}
