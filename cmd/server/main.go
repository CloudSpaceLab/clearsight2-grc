package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/CloudSpaceLab/clearsight2-grc/internal/catalog"
)

func main() {
	c, err := catalog.Load()
	if err != nil {
		log.Fatalf("invalid framework catalog: %v", err)
	}
	settings, err := loadProgramSettings(os.Getenv)
	if err != nil {
		log.Fatalf("invalid Program read configuration: %v", err)
	}
	startup, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	protected, db, err := startProgramRead(startup, settings)
	cancel()
	if err != nil {
		log.Fatalf("Program read activation failed closed: %v", err)
	}
	if db != nil {
		defer db.Close()
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	server := &http.Server{
		Addr: ":" + port,
		Handler: securityHeaders(buildRouter(c, protected)),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout: 10 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout: 60 * time.Second,
	}
	log.Printf("ClearSight 2 API listening on %s (Program reads enabled: %t)", server.Addr, protected != nil)
	log.Fatal(server.ListenAndServe())
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("X-Frame-Options", "DENY")
		next.ServeHTTP(w, r)
	})
}
