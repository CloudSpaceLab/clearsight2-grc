package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/CloudSpaceLab/clearsight2-grc/internal/catalog"
)

const sampleDSN = "postgres://v2_reader:private-test-secret@db.example.org/clearsight2?sslmode=verify-full"
const sampleSecret = "testing-only-signature-secret-with-sufficient-length"

func settingsFrom(values map[string]string) (programSettings, error) {
	return loadProgramSettings(func(key string) string { return values[key] })
}

func TestProgramReadExplicitOptIn(t *testing.T) {
	valid := map[string]string{
		"CLEARSIGHT_V2_PROGRAM_READ_ENABLED": "true",
		"CLEARSIGHT_V2_DATABASE_URL": sampleDSN,
		"CLEARSIGHT_V2_IDENTITY_SIGNING_SECRET": sampleSecret,
	}
	settings, err := settingsFrom(valid)
	if err != nil || !settings.Enabled {
		t.Fatalf("expected verified configuration, got %+v, %v", settings, err)
	}
	if off, err := settingsFrom(nil); err != nil || off.Enabled {
		t.Fatalf("catalog-only mode failed closed: %+v, %v", off, err)
	}
	if h, db, err := startProgramRead(t.Context(), programSettings{}); err != nil || h != nil || db != nil {
		t.Fatalf("catalog mode unexpectedly opened a database: %v", err)
	}
}

func TestProgramReadRejectsUnsafeAndPartialConfig(t *testing.T) {
	cases := []struct {
		name string
		edit func(map[string]string)
	}{
		{"false flag with credentials", func(m map[string]string) { m["CLEARSIGHT_V2_PROGRAM_READ_ENABLED"] = "false" }},
		{"flag missing", func(m map[string]string) { delete(m, "CLEARSIGHT_V2_PROGRAM_READ_ENABLED") }},
		{"flag not boolean", func(m map[string]string) { m["CLEARSIGHT_V2_PROGRAM_READ_ENABLED"] = "yes" }},
		{"missing database", func(m map[string]string) { delete(m, "CLEARSIGHT_V2_DATABASE_URL") }},
		{"missing signing secret", func(m map[string]string) { delete(m, "CLEARSIGHT_V2_IDENTITY_SIGNING_SECRET") }},
		{"weak signing secret", func(m map[string]string) { m["CLEARSIGHT_V2_IDENTITY_SIGNING_SECRET"] = "short" }},
		{"insecure transport", func(m map[string]string) {
			m["CLEARSIGHT_V2_DATABASE_URL"] = strings.Replace(sampleDSN, "verify-full", "disable", 1)
		}},
		{"TLS requires server identity", func(m map[string]string) {
			m["CLEARSIGHT_V2_DATABASE_URL"] = strings.Replace(sampleDSN, "verify-full", "require", 1)
		}},
		{"no destination", func(m map[string]string) {
			m["CLEARSIGHT_V2_DATABASE_URL"] = "postgres://v2_reader:password@/clearsight2?sslmode=verify-full"
		}},
		{"wrong scheme", func(m map[string]string) {
			m["CLEARSIGHT_V2_DATABASE_URL"] = "http://v2_reader:password@db.example.org/clearsight2?sslmode=verify-full"
		}},
		{"incomplete database credentials", func(m map[string]string) {
			m["CLEARSIGHT_V2_DATABASE_URL"] = "postgres://v2_reader@db.example.org/clearsight2?sslmode=verify-full"
		}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			cfg := map[string]string{
				"CLEARSIGHT_V2_PROGRAM_READ_ENABLED": "true",
				"CLEARSIGHT_V2_DATABASE_URL": sampleDSN,
				"CLEARSIGHT_V2_IDENTITY_SIGNING_SECRET": sampleSecret,
			}
			tc.edit(cfg)
			if _, err := settingsFrom(cfg); err == nil {
				t.Fatal("accepted unsafe configuration")
			}
		})
	}
}

func TestRouterKeepsTenantRouteDisabledByDefault(t *testing.T) {
	c, err := catalog.Load()
	if err != nil { t.Fatal(err) }
	router := buildRouter(c, nil)
	for _, route := range []struct{path string; want int}{
		{"/healthz", http.StatusOK},
		{"/api/v1/frameworks", http.StatusOK},
		{"/api/v1/programs/00000000-0000-4000-8000-000000000301", http.StatusNotFound},
		{"/api/v1/programs/00000000-0000-4000-8000-000000000301/requirements", http.StatusNotFound},
	}{
		w := httptest.NewRecorder()
		router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, route.path, nil))
		if w.Code != route.want {
			t.Fatalf("%s returned %d, want %d", route.path, w.Code, route.want)
		}
	}
	invoked := false
	protected := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		invoked = true
		w.WriteHeader(http.StatusUnauthorized)
	})
	withAuth := buildRouter(c, protected)
	w := httptest.NewRecorder()
	withAuth.ServeHTTP(w, httptest.NewRequest(http.MethodGet,
		"/api/v1/programs/00000000-0000-4000-8000-000000000301", nil))
	if !invoked || w.Code != http.StatusUnauthorized {
		t.Fatal("explicit protected Program route not registered correctly")
	}
}
