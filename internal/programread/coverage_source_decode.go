package programread

import (
 "context"
 "database/sql"

 "github.com/CloudSpaceLab/clearsight2-grc/internal/continuity"
)

// These adapters only decode columns already owned by the pinned v1 domain.
// Evaluation logic remains exclusively in continuity.CurrentRequirementCoverage.
func loadCoverageFacts(ctx context.Context,tx *sql.Tx,tenant,program string,a *continuity.ProgramAggregate)error{
 if err:=loadSourceRows(ctx,tx,coverageRequirementsSQL,tenant,program,func(rows *sql.Rows)error{
  var r continuity.Requirement
  var status string
  var until sql.NullTime
  if err:=rows.Scan(&r.ID,&status,&r.EffectiveFrom,&until);err!=nil{return err}
  r.Status=continuity.RequirementStatus(status)
  r.TenantID=tenant;r.ProgramID=program;r.EffectiveUntil=optionalTime(until)
  a.Requirements=append(a.Requirements,r)
  return nil
 });err!=nil{return err}

 if err:=loadSourceRows(ctx,tx,coverageApplicabilitySQL,tenant,program,func(rows *sql.Rows)error{
  var r continuity.Applicability
  var status string
  var until sql.NullTime
  if err:=rows.Scan(&r.RequirementID,&status,&r.EffectiveFrom,&until,&r.CreatedAt);err!=nil{return err}
  r.Status=continuity.ApplicabilityStatus(status);r.EffectiveUntil=optionalTime(until)
  a.Applicability=append(a.Applicability,r)
  return nil
 });err!=nil{return err}

 if err:=loadSourceRows(ctx,tx,coverageControlsSQL,tenant,program,func(rows *sql.Rows)error{
  var r continuity.ControlImplementation
  var status string
  var until sql.NullTime
  if err:=rows.Scan(&r.ID,&status,&r.EffectiveFrom,&until);err!=nil{return err}
  r.Status=continuity.ControlImplementationStatus(status);r.EffectiveUntil=optionalTime(until)
  a.ControlImplementations=append(a.ControlImplementations,r)
  return nil
 });err!=nil{return err}

 if err:=loadSourceRows(ctx,tx,coverageLinksSQL,tenant,program,func(rows *sql.Rows)error{
  var r continuity.RequirementControlLink
  var retired sql.NullTime
  if err:=rows.Scan(&r.RequirementID,&r.ImplementationID,&r.CreatedAt,&retired);err!=nil{return err}
  r.RetiredAt=optionalTime(retired)
  a.RequirementControlLinks=append(a.RequirementControlLinks,r)
  return nil
 });err!=nil{return err}

 if err:=loadSourceRows(ctx,tx,coverageContractsSQL,tenant,program,func(rows *sql.Rows)error{
  var r continuity.EvidenceContract
  var status string
  if err:=rows.Scan(&r.ID,&r.RequirementID,&r.ControlImplementationID,
   &status,&r.FreshnessMinutes,&r.MinimumCoverage);err!=nil{return err}
  r.Status=continuity.EvidenceContractStatus(status)
  a.EvidenceContracts=append(a.EvidenceContracts,r)
  return nil
 });err!=nil{return err}

 return loadSourceRows(ctx,tx,coverageAssessmentsSQL,tenant,program,func(rows *sql.Rows)error{
  var r continuity.EvidenceAssessment
  var conclusion string
  var until sql.NullTime
  if err:=rows.Scan(&r.ContractID,&conclusion,&r.Coverage,
   &until,&r.AssessedAt,&r.CreatedAt);err!=nil{return err}
  r.Conclusion=continuity.EvidenceConclusion(conclusion);r.ValidUntil=optionalTime(until)
  a.EvidenceAssessments=append(a.EvidenceAssessments,r)
  return nil
 })
}
