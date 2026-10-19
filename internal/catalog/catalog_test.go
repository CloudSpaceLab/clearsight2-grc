package catalog

import (
 "encoding/json"
 "net/http"
 "net/http/httptest"
 "strings"
 "testing"
)
func TestSeedValidAndGeographiesCovered(t *testing.T){
 c,err:=Load();if err!=nil{t.Fatal(err)}
 expected:=[]string{"NG","KE","ZA","GH","EU"}
 for _,j:=range expected{if len(c.Filter(j,"",""))==0{t.Errorf("%s catalog empty",j)}}
 for _,f:=range c.Items{if len(f.Requirements)!=0{t.Fatalf("unreviewed requirements in %s",f.ID)}}
}
func TestRejectDuplicateID(t *testing.T){
 c,_:=Load();c.Items=append(c.Items,c.Items[0])
 b,_:=json.Marshal(c)
 if _,err:=LoadBytes(b);err==nil{t.Fatal("accepted duplicate framework")}
}
func TestFilterAndHTTPReadOnly(t *testing.T){
 c,_:=Load()
 rs:=c.Filter("EU","banking","resilience")
 if len(rs)!=1||rs[0].ID!="EU-DORA-2022"{t.Fatalf("unexpected filter: %+v",rs)}
 req:=httptest.NewRequest(http.MethodGet,"/api/v1/frameworks?jurisdiction=GH&sector=banking",nil)
 rr:=httptest.NewRecorder();c.Handler(rr,req)
 if rr.Code!=http.StatusOK||!strings.Contains(rr.Body.String(),"GH-BOG-CYBER-2026"){t.Fatalf("response %d: %s",rr.Code,rr.Body.String())}
 rr=httptest.NewRecorder();c.Handler(rr,httptest.NewRequest(http.MethodPost,"/api/v1/frameworks",nil))
 if rr.Code!=http.StatusMethodNotAllowed{t.Fatal("catalog must be read-only")}
}
