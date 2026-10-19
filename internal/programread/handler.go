package programread

import (
  "context"
  "encoding/json"
  "errors"
  "net/http"
  "strings"
  "time"

  "github.com/CloudSpaceLab/clearsight2-grc/internal/identity"
)

var ErrNotFound = errors.New("program not found")

// Record is metadata only. Posture and restricted Matter details must come
// separately from the actor-visible v1 Program projection.
type Record struct {
  ID string `json:"id"`
  Name string `json:"name"`
  SourceRevision string `json:"source_revision"`
  UpdatedAt time.Time `json:"updated_at"`
  TenantID string `json:"-"`
  LegalEntityID string `json:"-"`
  DepartmentPath []string `json:"-"`
}

// Repository must enforce actor scope in its query, not filter a tenant-wide
// result after fetching it. The HTTP edge rejects scope-invalid results again.
type Repository interface {
  GetVisible(context.Context, identity.Actor, string) (Record, error)
}

type Handler struct {
  Authenticator identity.Authenticator
  Repository Repository
  Now func() time.Time
}

func (h Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
  w.Header().Set("Cache-Control", "no-store")
  w.Header().Set("X-Content-Type-Options", "nosniff")
  if r.Method != http.MethodGet {
    w.Header().Set("Allow", "GET")
    http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
    return
  }
  actor,ok:=h.authorizedActor(w,r)
  if !ok{return}
  id := strings.TrimSpace(r.PathValue("id"))
  if id == "" || len(id) > 128 || strings.ContainsAny(id, "/\\") || strings.ContainsAny(id, "\r\n\t") {
    http.Error(w, "program not found", http.StatusNotFound)
    return
  }
  if scope := r.URL.Query(); scope.Has("tenant_id") || scope.Has("principal_id") ||
    scope.Has("legal_entity_id") || scope.Has("department_path") {
    http.Error(w, "program not found", http.StatusNotFound)
    return
  }
  if h.Repository == nil {
    http.Error(w, "program service unavailable", http.StatusServiceUnavailable)
    return
  }
  program, err := h.Repository.GetVisible(r.Context(), actor, id)
  if errors.Is(err, ErrNotFound) {
    http.Error(w, "program not found", http.StatusNotFound)
    return
  }
  if err != nil || !visibleToActor(actor, id, program) {
    http.Error(w, "program service unavailable", http.StatusServiceUnavailable)
    return
  }
  w.Header().Set("Content-Type", "application/json; charset=utf-8")
  _ = json.NewEncoder(w).Encode(program)
}

func hasScopedReadGrant(actor identity.Actor) bool {
  for _, grant := range actor.DepartmentGrants {
    if len(grant.Path) != 0 &&
      identity.HasDepartmentPermission(actor, grant.Path, identity.PermissionOversightRead) {
      return true
    }
  }
  return false
}

func visibleToActor(actor identity.Actor, id string, p Record) bool {
  if p.ID != id || p.Name == "" || len(p.Name) > 512 ||
    p.TenantID != actor.TenantID || p.LegalEntityID != actor.LegalEntityID ||
    strings.TrimSpace(p.SourceRevision) == "" || p.UpdatedAt.IsZero() {
    return false
  }
  if identity.HasPermission(actor, identity.PermissionOversightRead) {
    return true
  }
  return len(p.DepartmentPath) > 0 &&
    identity.HasDepartmentPermission(actor, p.DepartmentPath, identity.PermissionOversightRead)
}

func (h Handler) authorizedActor(w http.ResponseWriter,r *http.Request) (identity.Actor,bool) {
  if h.Authenticator==nil {
    http.Error(w,"identity service unavailable",http.StatusServiceUnavailable)
    return identity.Actor{},false
  }
  actor,present,err:=h.Authenticator.Authenticate(r)
  if err!=nil||!present {
    http.Error(w,"sign-in required",http.StatusUnauthorized)
    return identity.Actor{},false
  }
  now:=time.Now().UTC()
  if h.Now!=nil {now=h.Now().UTC()}
  if actor.Valid(now)!=nil {
    http.Error(w,"sign-in required",http.StatusUnauthorized)
    return identity.Actor{},false
  }
  if actor.LegalEntityID=="*"||strings.EqualFold(actor.Kind,"SERVICE")||
     (!identity.HasPermission(actor,identity.PermissionOversightRead)&&!hasScopedReadGrant(actor)) {
    http.Error(w,"access denied",http.StatusForbidden)
    return identity.Actor{},false
  }
  return actor,true
}
