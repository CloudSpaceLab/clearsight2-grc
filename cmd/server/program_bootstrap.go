package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/CloudSpaceLab/clearsight2-grc/internal/catalog"
	"github.com/CloudSpaceLab/clearsight2-grc/internal/identity"
	"github.com/CloudSpaceLab/clearsight2-grc/internal/programread"
	_ "github.com/jackc/pgx/v5/stdlib"
)

// Program reads are explicitly opt-in. Public catalog mode never connects to
// customer data or exposes the Program route.
type programSettings struct {
	Enabled bool
	DatabaseURL string
	SigningSecret string
}

func loadProgramSettings(getenv func(string) string) (programSettings, error) {
	if getenv == nil {
		return programSettings{}, errors.New("configuration reader is unavailable")
	}
	flag := strings.TrimSpace(getenv("CLEARSIGHT_V2_PROGRAM_READ_ENABLED"))
	dsn := strings.TrimSpace(getenv("CLEARSIGHT_V2_DATABASE_URL"))
	secret := getenv("CLEARSIGHT_V2_IDENTITY_SIGNING_SECRET")
	if flag != "" && flag != "true" && flag != "false" {
		return programSettings{}, errors.New("invalid Program read feature flag")
	}
	if flag != "true" {
		if dsn != "" || secret != "" {
			return programSettings{}, errors.New("Program read settings require explicit enablement")
		}
		return programSettings{}, nil
	}
	if len(secret) < 32 {
		return programSettings{}, errors.New("Program identity signing secret must contain at least 32 bytes")
	}
	u, err := url.Parse(dsn)
	if err != nil || (u.Scheme != "postgres" && u.Scheme != "postgresql") ||
		u.User == nil || u.User.Username() == "" || u.Hostname() == "" ||
		strings.Trim(u.Path, "/") == "" || u.Fragment != "" ||
		u.Query().Get("sslmode") != "verify-full" {
		return programSettings{}, errors.New("Program database requires a PostgreSQL URL with sslmode=verify-full")
	}
	if _, ok := u.User.Password(); !ok {
		return programSettings{}, errors.New("Program database credentials are incomplete")
	}
	return programSettings{Enabled: true, DatabaseURL: dsn, SigningSecret: secret}, nil
}

func startProgramRead(ctx context.Context, cfg programSettings) (http.Handler, *sql.DB, error) {
	if !cfg.Enabled {
		return nil, nil, nil
	}
	signed, err := identity.NewSignedAuthenticator(cfg.SigningSecret, 2*time.Minute)
	if err != nil {
		return nil, nil, fmt.Errorf("configure identity verification: %w", err)
	}
	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		return nil, nil, fmt.Errorf("open Program database: %w", err)
	}
	db.SetMaxOpenConns(12)
	db.SetMaxIdleConns(6)
	db.SetConnMaxLifetime(20 * time.Minute)
	db.SetConnMaxIdleTime(5 * time.Minute)
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, nil, fmt.Errorf("Program database unavailable: %w", err)
	}
	if err := programread.CheckSchema(ctx, db); err != nil {
		_ = db.Close()
		return nil, nil, err
	}
	if err := programread.CheckOperationalSchema(ctx, db); err != nil {
		_ = db.Close()
		return nil, nil, err
	}
	handler := programread.Handler{
		Authenticator: signed,
		Repository: programread.NewSQLRepository(db),
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		queryCtx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		if r.URL.Path == "/api/v1/programs" {
			handler.ServeListHTTP(w, r.WithContext(queryCtx))
			return
		}
		if r.Pattern == "GET /api/v1/programs/{id}/requirements" {
			handler.ServeRequirementsHTTP(w,r.WithContext(queryCtx))
			return
		}
		switch r.Pattern {
        case "GET /api/v1/programs/{id}/controls":
            handler.ServeInventoryHTTP(w,r.WithContext(queryCtx),programread.InventoryControls)
            return
        case "GET /api/v1/programs/{id}/evidence-contracts":
            handler.ServeInventoryHTTP(w,r.WithContext(queryCtx),programread.InventoryEvidenceContracts)
            return
        }
        handler.ServeHTTP(w, r.WithContext(queryCtx))
	}), db, nil
}

func buildRouter(c catalog.Catalog, protectedProgram http.Handler) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok\n"))
	})
	mux.HandleFunc("GET /api/v1/frameworks", c.Handler)
	if protectedProgram != nil {
		mux.Handle("GET /api/v1/programs", protectedProgram)
		mux.Handle("GET /api/v1/programs/{id}", protectedProgram)
		mux.Handle("GET /api/v1/programs/{id}/requirements", protectedProgram)
        mux.Handle("GET /api/v1/programs/{id}/controls", protectedProgram)
        mux.Handle("GET /api/v1/programs/{id}/evidence-contracts", protectedProgram)
	}
	return mux
}
