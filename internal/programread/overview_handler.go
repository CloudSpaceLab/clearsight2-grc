package programread

import (
 "encoding/json"
 "errors"
 "net/http"
 "strings"
)

// ServeOverviewHTTP follows the existing signed Program metadata read guard.
// The four approved HTML slots are returned together; unavailable is null,
// never zero, and raw calculations/source IDs are never serialized.
func (h Handler) ServeOverviewHTTP(w http.ResponseWriter,r *http.Request){
 w.Header().Set("Cache-Control","no-store")
 w.Header().Set("X-Content-Type-Options","nosniff")
 if r.Method!=http.MethodGet{
  w.Header().Set("Allow","GET")
  http.Error(w,"method not allowed",http.StatusMethodNotAllowed)
  return
 }
 actor,ok:=h.authorizedActor(w,r)
 if !ok{return}
 id:=strings.TrimSpace(r.PathValue("id"))
 if !isUUID(id){http.Error(w,"program not found",http.StatusNotFound);return}
 if len(r.URL.Query())!=0{
  http.Error(w,"invalid Overview parameters",http.StatusBadRequest)
  return
 }
 repo,ok:=h.Repository.(OverviewRepository)
 if !ok || repo==nil{
  http.Error(w,"program service unavailable",http.StatusServiceUnavailable)
  return
 }
 overview,err:=repo.ReadOverview(r.Context(),actor,id)
 if errors.Is(err,ErrNotFound){
  http.Error(w,"program not found",http.StatusNotFound)
  return
 }
 if err!=nil||overview.ProgramID!=id||overview.ProgramRevision==""||
  !validAssessmentPayload(overview.AssessmentCoverage)||
  overview.Supported!=nil||overview.OpenGaps!=nil||overview.EvidenceToReview!=nil{
  http.Error(w,"program service unavailable",http.StatusServiceUnavailable)
  return
 }
 w.Header().Set("Content-Type","application/json; charset=utf-8")
 _=json.NewEncoder(w).Encode(overview)
}

func validAssessmentPayload(value *AssessedRequirements)bool{
 if value==nil{return true}
 return value.Eligible>=0&&value.Assessed>=0&&value.Unknown>=0&&value.Excluded>=0&&
  value.Assessed+value.Unknown==value.Eligible&&
  (value.Quality=="current"||value.Quality=="partial")&&!value.GeneratedAt.IsZero()
}
