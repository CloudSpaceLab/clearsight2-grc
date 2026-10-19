package programread

import (
 "context"
 "database/sql"
 "encoding/json"
 "errors"
 "fmt"
 "reflect"
 "strings"
 "time"

 "github.com/CloudSpaceLab/clearsight2-grc/internal/continuity"
)

// The current JSONB position is a materialized v1 projection. Changes are
// authoritative only when corroborated by the append-only continuity ledger.
// Both reads run after actor-scoped Program authorization in one transaction.
const currentProgramPolicySQL = `
SELECT p.status, p.calculation_policy::text, p.version,
       event.aggregate_version,event.event_type,(event.payload->'position')::text
FROM programs p
LEFT JOIN LATERAL (
 SELECT aggregate_version,event_type,payload
 FROM continuity_events
 WHERE tenant_id=p.tenant_id AND aggregate_type='PROGRAM'
   AND aggregate_id=p.id
   AND event_type IN ('PROGRAM_CALCULATION_POLICY_PROPOSED',
                      'PROGRAM_CALCULATION_POLICY_APPROVED',
                      'PROGRAM_CALCULATION_POLICY_REJECTED')
 ORDER BY aggregate_version DESC LIMIT 1
) event ON TRUE
WHERE p.id=$3::uuid AND p.tenant_id=$1::uuid AND p.legal_entity_id=$2::uuid
`

// The most recent approved policy event must match the active policy from the
// materialized Program row. A proposal/rejection may follow an approval.
const lastApprovedPolicyEventSQL = `
SELECT aggregate_version,actor_type,actor_id::text,(payload->'position'->'active')::text
FROM continuity_events
WHERE tenant_id=$1::uuid AND aggregate_type='PROGRAM'
  AND aggregate_id=$2::uuid AND event_type='PROGRAM_CALCULATION_POLICY_APPROVED'
ORDER BY aggregate_version DESC LIMIT 1
`

// verifiedProgramPolicy is an internal source position, not an authorized
// percentage and not a substitute for replaying the entire aggregate.
type verifiedProgramPolicy struct {
 Status continuity.ProgramStatus
 Position *continuity.ProgramCompliancePolicyPosition
}

func equalPolicyJSON(first,second string) bool {
 var a,b any
 if json.Unmarshal([]byte(first),&a)!=nil || json.Unmarshal([]byte(second),&b)!=nil {
  return false
 }
 return reflect.DeepEqual(a,b)
}

// loadVerifiedProgramPolicy checks the materialized projection against v1's
// immutable event ledger. The caller must have already authorized Program ID
// and exact tenant/entity in the SAME read-only repeatable-read transaction.
func loadVerifiedProgramPolicy(ctx context.Context,tx *sql.Tx,tenant,entity,program string,at time.Time)(verifiedProgramPolicy,error){
 if tx==nil || !isUUID(tenant) || !isUUID(entity) || !isUUID(program) || at.IsZero(){
  return verifiedProgramPolicy{},errors.New("invalid Program policy read scope")
 }
 var status string
 var projected sql.NullString
 var programVersion int64
 var latestVersion sql.NullInt64
 var latestType,latestPosition sql.NullString
 err:=tx.QueryRowContext(ctx,currentProgramPolicySQL,tenant,entity,program).Scan(
  &status,&projected,&programVersion,&latestVersion,&latestType,&latestPosition)
 if errors.Is(err,sql.ErrNoRows){return verifiedProgramPolicy{},ErrNotFound}
 if err!=nil{return verifiedProgramPolicy{},fmt.Errorf("read Program policy position: %w",err)}
 if programVersion<1{return verifiedProgramPolicy{},errors.New("invalid Program revision")}
 result:=verifiedProgramPolicy{Status:continuity.ProgramStatus(status)}
 if status!="ACTIVE" && status!="DRAFT" && status!="PAUSED" && status!="RETIRED"{
  return verifiedProgramPolicy{},errors.New("invalid Program lifecycle")
 }
 if !projected.Valid && !latestVersion.Valid {
  return result,nil // No policy event or materialized policy yet.
 }
 if !projected.Valid || !latestVersion.Valid || !latestPosition.Valid ||
   !latestType.Valid || latestVersion.Int64<1 ||
   latestVersion.Int64>programVersion ||
   !equalPolicyJSON(projected.String,latestPosition.String){
  return verifiedProgramPolicy{},errors.New("Program policy projection differs from its event ledger")
 }

 var position continuity.ProgramCompliancePolicyPosition
 if err:=json.Unmarshal([]byte(projected.String),&position);err!=nil{
  return verifiedProgramPolicy{},errors.New("invalid Program policy position")
 }
 if position.LastRevision<1 || position.LastRevision>1000000{
  return verifiedProgramPolicy{},errors.New("invalid Program policy history")
 }
 if position.Active==nil{
  result.Position=&position
  return result,nil
 }
 active:=position.Active
 if active.Number<1 || active.Number>position.LastRevision ||
   !isUUID(active.MakerID) || !isUUID(active.ApproverID) ||
   strings.EqualFold(active.MakerID,active.ApproverID) ||
   active.ApprovedAt==nil || active.ApprovedAt.IsZero() ||
   active.ApprovedAt.After(at) || active.ProposedAt.IsZero() ||
   active.ProposedAt.After(*active.ApprovedAt){
  return verifiedProgramPolicy{},errors.New("invalid approved Program policy actors or dates")
 }
 if err:=continuity.ValidateProgramComplianceCalculationPolicy(active.Definition);err!=nil{
  return verifiedProgramPolicy{},fmt.Errorf("invalid approved policy definition: %w",err)
 }
 checksum,err:=continuity.PolicyFingerprint(active.Definition)
 if err!=nil || checksum!=active.Checksum ||
   active.Definition.Revision!=fmt.Sprintf("program-v%d",active.Number){
  return verifiedProgramPolicy{},errors.New("approved Program policy checksum or revision invalid")
 }
 var approvedVersion int64
 var approvedType,approvedActor,approvedPayload string
 err=tx.QueryRowContext(ctx,lastApprovedPolicyEventSQL,tenant,program).Scan(
  &approvedVersion,&approvedType,&approvedActor,&approvedPayload)
 if errors.Is(err,sql.ErrNoRows){
  return verifiedProgramPolicy{},errors.New("approved Program policy has no approval event")
 }
 if err!=nil{return verifiedProgramPolicy{},fmt.Errorf("read policy approval event: %w",err)}
 activeJSON,err:=json.Marshal(active)
 if err!=nil{return verifiedProgramPolicy{},fmt.Errorf("encode approved policy: %w",err)}
 if approvedVersion<1 || approvedVersion>latestVersion.Int64 ||
   approvedType!="PERSON" || !strings.EqualFold(approvedActor,active.ApproverID) ||
   !equalPolicyJSON(string(activeJSON),approvedPayload){
  return verifiedProgramPolicy{},errors.New("approved Program policy differs from approval event")
 }
 result.Position=&position
 return result,nil
}
