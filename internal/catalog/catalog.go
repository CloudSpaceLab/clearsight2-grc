package catalog

import (
 "bytes"
 "embed"
 "encoding/json"
 "errors"
 "io"
 "fmt"
 "net/http"
 "net/url"
 "sort"
 "strings"
)

//go:embed data.json
var sources embed.FS

// Framework contains reference metadata, never a compliance determination.
type Framework struct {
 ID string `json:"id"`
 Title string `json:"title"`
 Edition string `json:"edition"`
 Jurisdiction string `json:"jurisdiction"`
 Sectors []string `json:"sectors"`
 Issuer string `json:"issuer"`
 SourceURL string `json:"source_url"`
 SourceStatus string `json:"source_status"`
 ContentStatus string `json:"content_status"`
 License string `json:"license"`
 Requirements []string `json:"requirements"`
}
type Catalog struct {
 SchemaVersion int `json:"schema_version"`
 SeedRevision string `json:"seed_revision"`
 Description string `json:"description"`
 Items []Framework `json:"items"`
}
func Load() (Catalog,error) {
 b,err:=sources.ReadFile("data.json");if err!=nil{return Catalog{},err}
 return LoadBytes(b)
}
func LoadBytes(b []byte) (Catalog,error) {
 var c Catalog
 dec:=json.NewDecoder(bytes.NewReader(b));dec.DisallowUnknownFields()
 if err:=dec.Decode(&c);err!=nil{return c,err}
 var tail any
 if err:=dec.Decode(&tail);err!=nil && !errors.Is(err,io.EOF){return c,err}
 if tail!=nil{return c,fmt.Errorf("unexpected additional JSON")}
 if c.SchemaVersion!=1||c.SeedRevision==""{return c,fmt.Errorf("unsupported catalog schema or revision")}
 seen:=map[string]struct{}{}
 for i,f:=range c.Items {
  if f.ID==""||f.Title==""||f.Edition==""||f.Issuer==""||len(f.Sectors)==0{return c,fmt.Errorf("incomplete framework %d",i)}
  if _,ok:=seen[f.ID];ok{return c,fmt.Errorf("duplicate edition id %s",f.ID)}
  seen[f.ID]=struct{}{}
  if f.Jurisdiction!="NG"&&f.Jurisdiction!="KE"&&f.Jurisdiction!="ZA"&&f.Jurisdiction!="GH"&&f.Jurisdiction!="EU"{return c,fmt.Errorf("invalid jurisdiction %q",f.Jurisdiction)}
  u,err:=url.Parse(f.SourceURL);if err!=nil||u.Scheme!="https"||u.Host==""||u.User!=nil{return c,fmt.Errorf("invalid official source URL for %s",f.ID)}
  if f.SourceStatus!="source_identified"&&f.SourceStatus!="verification_pending"{return c,fmt.Errorf("bad verification status for %s",f.ID)}
  if f.ContentStatus!="metadata_only"||f.License!="link_only"||len(f.Requirements)!=0{return c,fmt.Errorf("unreviewed clause content in %s",f.ID)}
 }
 return c,nil
}
func (c Catalog) Filter(jurisdiction,sector,q string) []Framework {
 q=strings.ToLower(strings.TrimSpace(q));var items []Framework
 for _,f:=range c.Items {
  if jurisdiction!=""&&f.Jurisdiction!=jurisdiction{continue}
  if sector!=""{matched:=false;for _,s:=range f.Sectors{if s==sector{matched=true;break}};if !matched{continue}}
  if q!=""&&!strings.Contains(strings.ToLower(f.Title+" "+f.ID+" "+f.Issuer+" "+f.Edition),q){continue}
  items=append(items,f)
 }
 sort.Slice(items,func(i,j int)bool{return items[i].ID<items[j].ID})
 if items==nil{return []Framework{}}
 return items
}
func (c Catalog) Handler(w http.ResponseWriter,r *http.Request) {
 if r.Method!=http.MethodGet {w.Header().Set("Allow","GET");http.Error(w,"method not allowed",http.StatusMethodNotAllowed);return}
 q:=r.URL.Query(); items:=c.Filter(q.Get("jurisdiction"),q.Get("sector"),q.Get("q"))
 w.Header().Set("Content-Type","application/json; charset=utf-8")
 w.Header().Set("Cache-Control","public, max-age=300")
 w.Header().Set("X-Content-Type-Options","nosniff")
 _=json.NewEncoder(w).Encode(struct{
  SeedRevision string `json:"seed_revision"`
  Total int `json:"total"`
  Items []Framework `json:"items"`
 }{c.SeedRevision,len(items),items})
}
