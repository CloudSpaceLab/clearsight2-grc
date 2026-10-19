package programread

import (
 "encoding/json"
 "errors"
 "net/http"
 "strings"
)

// ServeRequirementsHTTP exposes only approved, currently effective source
// references. It never computes applicability, evidence quality or a score.
func (h Handler) ServeRequirementsHTTP(w http.ResponseWriter,r *http.Request){
 w.Header().Set("Cache-Control","no-store")
 w.Header().Set("X-Content-Type-Options","nosniff")
 if r.Method!=http.MethodGet{
  w.Header().Set("Allow","GET")
  http.Error(w,"method not allowed",http.StatusMethodNotAllowed)
  return
 }
 actor,authorized:=h.authorizedActor(w,r)
 if !authorized{return}
 id:=strings.TrimSpace(r.PathValue("id"))
 if !isUUID(id){
  http.Error(w,"program not found",http.StatusNotFound)
  return
 }
 query,err:=listQuery(r)
 if err!=nil{
  http.Error(w,"invalid pagination",http.StatusBadRequest)
  return
 }
 repo,ok:=h.Repository.(RequirementsRepository)
 if !ok||repo==nil{
  http.Error(w,"program service unavailable",http.StatusServiceUnavailable)
  return
 }
 page,err:=repo.ListApprovedRequirements(r.Context(),actor,id,query)
 if errors.Is(err,ErrNotFound){
  http.Error(w,"program not found",http.StatusNotFound)
  return
 }
 if err!=nil||page.ProgramID!=id||page.ProgramRevision==""||len(page.Items)>query.Limit{
  http.Error(w,"program service unavailable",http.StatusServiceUnavailable)
  return
 }
 for _,item:=range page.Items{
  if !isUUID(item.ID)||item.Code==""||item.Title==""||item.Version<1||item.EffectiveFrom.IsZero(){
   http.Error(w,"program service unavailable",http.StatusServiceUnavailable)
   return
  }
 }
 if page.Items==nil{page.Items=[]RequirementReference{}}
 w.Header().Set("Content-Type","application/json; charset=utf-8")
 _=json.NewEncoder(w).Encode(page)
}
