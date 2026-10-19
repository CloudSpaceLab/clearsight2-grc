package main

import (
 "log"
 "net/http"
 "os"
 "time"

 "github.com/CloudSpaceLab/clearsight2-grc/internal/catalog"
)

func main() {
 c,err:=catalog.Load()
 if err!=nil{log.Fatalf("refusing to start with invalid framework catalog: %v",err)}
 mux:=http.NewServeMux()
 mux.HandleFunc("GET /healthz",func(w http.ResponseWriter,r *http.Request){
  w.Header().Set("Cache-Control","no-store")
  w.WriteHeader(http.StatusOK)
  _,_=w.Write([]byte("ok\n"))
 })
 mux.HandleFunc("GET /api/v1/frameworks",c.Handler)
 port:=os.Getenv("PORT")
 if port==""{port="8080"}
 server:=&http.Server{
  Addr:":"+port,Handler:securityHeaders(mux),
  ReadHeaderTimeout:5*time.Second,
  ReadTimeout:10*time.Second,
  WriteTimeout:15*time.Second,
  IdleTimeout:60*time.Second,
 }
 log.Printf("ClearSight 2 catalog read API listening on %s",server.Addr)
 log.Fatal(server.ListenAndServe())
}
func securityHeaders(next http.Handler) http.Handler {
 return http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  w.Header().Set("X-Content-Type-Options","nosniff")
  w.Header().Set("Referrer-Policy","strict-origin-when-cross-origin")
  w.Header().Set("X-Frame-Options","DENY")
  next.ServeHTTP(w,r)
 })
}
