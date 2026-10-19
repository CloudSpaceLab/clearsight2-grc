package programread

import (
  "crypto/hmac"
  "crypto/sha256"
  "encoding/base64"
  "encoding/hex"
  "encoding/json"
  "net/http"
  "net/http/httptest"
  "strconv"
  "testing"
  "time"

  "github.com/CloudSpaceLab/clearsight2-grc/internal/identity"
)

func signedRequest(t *testing.T, secret string, actor identity.Actor) *http.Request {
  t.Helper()
  request:=httptest.NewRequest(http.MethodGet,"/api/v1/programs/P-100",nil)
  payload,err:=json.Marshal(actor)
  if err!=nil{t.Fatal(err)}
  envelope:=base64.RawURLEncoding.EncodeToString(payload)
  timestamp:=strconv.FormatInt(time.Now().UTC().Unix(),10)
  mac:=hmac.New(sha256.New,[]byte(secret))
  _,_=mac.Write([]byte(request.Method+"\n"+request.URL.EscapedPath()+"\n"+timestamp+"\n"+envelope))
  request.Header.Set(identity.HeaderIdentity,envelope)
  request.Header.Set(identity.HeaderTimestamp,timestamp)
  request.Header.Set(identity.HeaderSignature,hex.EncodeToString(mac.Sum(nil)))
  return request
}

func TestProgramReadSignedIdentityEndToEnd(t *testing.T){
  secret:="signing-secret-of-at-least-thirty-two-chars"
  signed,err:=identity.NewSignedAuthenticator(secret,2*time.Minute)
  if err!=nil{t.Fatal(err)}
  repo:=&testRepo{record:makeRecord()}
  handler:=Handler{Authenticator:signed,Repository:repo}
  mux:=http.NewServeMux()
  mux.Handle("GET /api/v1/programs/{id}",handler)
  valid:=signedRequest(t,secret,makeActor())
  ok:=httptest.NewRecorder()
  mux.ServeHTTP(ok,valid)
  if ok.Code!=http.StatusOK||repo.called!=1{t.Fatalf("signed request: code=%d reads=%d",ok.Code,repo.called)}
  tampered:=signedRequest(t,secret,makeActor())
  tampered.Header.Set(identity.HeaderSignature,"ff")
  denied:=httptest.NewRecorder()
  mux.ServeHTTP(denied,tampered)
  if denied.Code!=http.StatusUnauthorized||repo.called!=1{t.Fatalf("bad signature: code=%d reads=%d",denied.Code,repo.called)}
  spoofed:=httptest.NewRequest(http.MethodGet,"/api/v1/programs/P-100",nil)
  spoofed.Header.Set("X-ClearSight-Demo-Tenant","TENANT-A")
  spoofed.Header.Set("X-ClearSight-Demo-Principal","PERSON-A")
  spoofed.Header.Set("X-ClearSight-Demo-Legal-Entity","LEGAL-A")
  denied=httptest.NewRecorder()
  mux.ServeHTTP(denied,spoofed)
  if denied.Code!=http.StatusUnauthorized||repo.called!=1{t.Fatalf("demo header bypass: code=%d reads=%d",denied.Code,repo.called)}
}
