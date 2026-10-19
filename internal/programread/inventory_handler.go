package programread

import (
 "encoding/json"
 "errors"
 "net/http"
 "strings"
)

// ServeInventoryHTTP shares the existing signed actor boundary. Each inventory
// kind is selected by a registered route, not query text.
func (h Handler) ServeInventoryHTTP(w http.ResponseWriter,r *http.Request,kind InventoryKind){
 w.Header().Set("Cache-Control","no-store")
 w.Header().Set("X-Content-Type-Options","nosniff")
 if r.Method!=http.MethodGet{
  w.Header().Set("Allow","GET")
  http.Error(w,"method not allowed",http.StatusMethodNotAllowed)
  return
 }
 actor,ok:=h.authorizedActor(w,r)
 if !ok{return}
 programID:=strings.TrimSpace(r.PathValue("id"))
 if !isUUID(programID){http.Error(w,"program not found",http.StatusNotFound);return}
 query,err:=listQuery(r)
 if err!=nil{http.Error(w,"invalid pagination",http.StatusBadRequest);return}
 if _,err:=inventorySQL(kind);err!=nil{http.Error(w,"not found",http.StatusNotFound);return}
 repo,ok:=h.Repository.(InventoryRepository)
 if !ok||repo==nil{http.Error(w,"program service unavailable",http.StatusServiceUnavailable);return}
 page,err:=repo.ListInventory(r.Context(),actor,programID,kind,query)
 if errors.Is(err,ErrNotFound){http.Error(w,"program not found",http.StatusNotFound);return}
 if err!=nil||page.ProgramID!=programID||page.ProgramRevision==""||len(page.Items)>query.Limit||len(page.NextCursor)>256{
  http.Error(w,"program service unavailable",http.StatusServiceUnavailable)
  return
 }
 for _,item:=range page.Items{
  if !validInventoryRecord(kind,item){
   http.Error(w,"program service unavailable",http.StatusServiceUnavailable)
   return
  }
 }
 if page.Items==nil{page.Items=[]InventoryRecord{}}
 w.Header().Set("Content-Type","application/json; charset=utf-8")
 _=json.NewEncoder(w).Encode(page)
}
