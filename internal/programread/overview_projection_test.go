package programread
import (
 "testing"
 "time"
 "github.com/CloudSpaceLab/clearsight2-grc/internal/continuity"
)
func TestVerifiedAssessedCoverageRejectsUnapprovedAndIncoherentSnapshots(t *testing.T){
 at:=time.Date(2026,10,20,6,0,0,0,time.UTC)
 approved:=at.Add(-2*time.Hour)
 active:=&continuity.ProgramCompliancePolicyRevision{
  ApprovedAt:&approved,Definition:continuity.ProgramComplianceCalculationPolicy{Revision:"program-v1"},
 }
 score:=int64(7500)
 calc:=continuity.ProgramComplianceCalculation{
  PolicyRevision:"program-v1",State:continuity.ProgramComplianceProvisional,
  EligibleCount:4,AssessedCount:3,UnknownCount:1,ExcludedCount:1,
  Categories:[]continuity.ProgramComplianceCategoryResult{{
   Code:"REQUIREMENTS",WeightBps:10000,
   EligibleCount:4,AssessedCount:3,UnknownCount:1,ExcludedCount:1,CoverageBps:7500,
  }},
 }
 seen:=verifiedAssessedRequirements(active,7,7,at.Add(-time.Minute),at,calc)
 if seen==nil||seen.Assessed!=3||seen.Eligible!=4||seen.Quality!="partial"{
  t.Fatalf("verified provisional assessment population missing %+v",seen)
 }
 tests:=[]struct{name string;v int64;when time.Time;alter func(*continuity.ProgramComplianceCalculation)}{
  {"stale revision",6,at.Add(-time.Minute),nil},
  {"future",7,at.Add(time.Hour),nil},
  {"before approval",7,approved.Add(-time.Minute),nil},
  {"wrong policy",7,at.Add(-time.Minute),func(c *continuity.ProgramComplianceCalculation){c.PolicyRevision="unapproved"}},
  {"incoherent denominator",7,at.Add(-time.Minute),func(c *continuity.ProgramComplianceCalculation){c.Categories[0].UnknownCount=2}},
  {"fabricated final score",7,at.Add(-time.Minute),func(c *continuity.ProgramComplianceCalculation){c.State=continuity.ProgramComplianceFinal;c.ScoreBps=nil}},
  {"provisional final score",7,at.Add(-time.Minute),func(c *continuity.ProgramComplianceCalculation){c.ScoreBps=&score}},
  {"unexpected category",7,at.Add(-time.Minute),func(c *continuity.ProgramComplianceCalculation){c.Categories[0].Code="VENDORS"}},
 }
 for _,tc:=range tests{
  t.Run(tc.name,func(t *testing.T){
   copy:=calc;copy.Categories=append([]continuity.ProgramComplianceCategoryResult(nil),calc.Categories...)
   if tc.alter!=nil{tc.alter(&copy)}
   if v:=verifiedAssessedRequirements(active,7,tc.v,tc.when,at,copy);v!=nil{
    t.Fatalf("invalid retained assessment appeared: %+v",v)
   }
  })
 }
}
