package programread

import (
 "encoding/json"
 "errors"
 "net/http"
 "strings"
)

// ServeIssuesHTTP exposes only current Matters visible to the signed principal.
// Source payloads, access allow-lists, decisions, actions and evidence remain private.
func (h Handler) ServeIssuesHTTP(w http.ResponseWriter,r *http.Request){
 w.Header().Set("Cache-Control","no-store")
 w.Header().Set("X-Content-Type-Options","nosniff")
 if r.Method!=http.MethodGet{
  w.Header().Set("Allow","GET");http.Error(w,"method not allowed",http.StatusMethodNotAllowed);return
 }
 actor,ok:=h.authorizedActor(w,r);if !ok{return}
 id:=strings.TrimSpace(r.PathValue("id"))
 if !isUUID(id){http.Error(w,"program not found",http.StatusNotFound);return}
 query,err:=listQuery(r)
 if err!=nil{http.Error(w,"invalid Issues pagination",http.StatusBadRequest);return}
 repo,ok:=h.Repository.(IssueRepository)
 if !ok||repo==nil{http.Error(w,"program service unavailable",http.StatusServiceUnavailable);return}
 page,err:=repo.ListVisibleIssues(r.Context(),actor,id,query)
 if errors.Is(err,ErrNotFound){http.Error(w,"program not found",http.StatusNotFound);return}
 if err!=nil||page.ProgramID!=id||page.ProgramRevision==""||
   len(page.Items)>query.Limit||len(page.NextCursor)>256{
  http.Error(w,"program service unavailable",http.StatusServiceUnavailable);return
 }
 for _,item:=range page.Items{
  if !validProgramIssue(item){
   http.Error(w,"program service unavailable",http.StatusServiceUnavailable);return
  }
 }
 if page.Items==nil{page.Items=[]ProgramIssue{}}
 w.Header().Set("Content-Type","application/json; charset=utf-8")
 _=json.NewEncoder(w).Encode(page)
}
