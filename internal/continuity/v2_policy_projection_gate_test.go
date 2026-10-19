package continuity

import (
 "errors"
 "testing"
 "time"
)

func approvedPolicyFixture(t *testing.T,now time.Time)(ProgramAggregate,ProgramSourceState){
 t.Helper()
 start:=now.Add(-time.Hour)
 approval:=now.Add(-time.Minute)
 policy:=ProgramComplianceCalculationPolicy{
  Revision:"program-v1",MinimumCoverageBps:10000,
  Categories:[]ProgramComplianceCategoryWeight{{Code:"REQUIREMENTS",WeightBps:10000}},
 }
 checksum,err:=programCompliancePolicyChecksum(policy)
 if err!=nil{t.Fatal(err)}
 revision:=&ProgramCompliancePolicyRevision{
  Number:1,Definition:policy,Checksum:checksum,MakerID:"maker",ApproverID:"reviewer",
  ProposedAt:start,ApprovedAt:&approval,
 }
 aggregate:=ProgramAggregate{
  Program:Program{
   ID:"P",TenantID:"T",Status:ProgramActive,
   CalculationPolicy:&ProgramCompliancePolicyPosition{LastRevision:1,Active:revision},
  },
  Requirements:[]Requirement{{ID:"R",ProgramID:"P",Status:RequirementApproved,EffectiveFrom:start}},
  Applicability:[]Applicability{{RequirementID:"R",Status:ApplicabilityApplicable,EffectiveFrom:start}},
  ControlImplementations:[]ControlImplementation{{ID:"C",Status:ImplementationImplemented,EffectiveFrom:start}},
  RequirementControlLinks:[]RequirementControlLink{{RequirementID:"R",ImplementationID:"C",CreatedAt:start}},
  EvidenceContracts:[]EvidenceContract{{ID:"E",RequirementID:"R",Status:EvidenceContractActive,FreshnessMinutes:60,MinimumCoverage:1}},
  EvidenceAssessments:[]EvidenceAssessment{{ContractID:"E",Conclusion:EvidenceSupported,Coverage:1,AssessedAt:now.Add(-time.Second)}},
 }
 return aggregate,ProgramSourceState{Known:true,Required:1,Current:true}
}

func TestApprovedRequirementsOnlyProjectionGate(t *testing.T){
 now:=time.Date(2026,10,19,21,0,0,0,time.UTC)
 aggregate,source:=approvedPolicyFixture(t,now)
 projected,err:=requirementsOnlyProgramCalculation(aggregate,now,source)
 if err!=nil||projected==nil||projected.State!=ProgramComplianceFinal||projected.ScoreBps==nil||*projected.ScoreBps!=10000{
  t.Fatalf("valid v1 approved requirements-only projection denied: %+v, %v",projected,err)
 }

 tests:=[]struct{
  name string
  edit func(*ProgramAggregate,*ProgramSourceState)
  invalid bool
 }{
  {"unconfigured policy",func(a *ProgramAggregate,_ *ProgramSourceState){a.Program.CalculationPolicy=nil},false},
  {"inactive program",func(a *ProgramAggregate,_ *ProgramSourceState){a.Program.Status="DRAFT"},false},
  {"unapproved policy",func(a *ProgramAggregate,_ *ProgramSourceState){a.Program.CalculationPolicy.Active.ApprovedAt=nil},false},
  {"future approval",func(a *ProgramAggregate,_ *ProgramSourceState){
    after:=now.Add(time.Hour);a.Program.CalculationPolicy.Active.ApprovedAt=&after
  },false},
  {"unknown sources",func(_ *ProgramAggregate,s *ProgramSourceState){s.Known=false},false},
  {"source outage",func(_ *ProgramAggregate,s *ProgramSourceState){s.Current=false},false},
  {"forged checksum",func(a *ProgramAggregate,_ *ProgramSourceState){a.Program.CalculationPolicy.Active.Checksum="tampered"},true},
  {"self approved",func(a *ProgramAggregate,_ *ProgramSourceState){a.Program.CalculationPolicy.Active.ApproverID="maker"},true},
  {"missing reviewer",func(a *ProgramAggregate,_ *ProgramSourceState){a.Program.CalculationPolicy.Active.ApproverID=""},true},
  {"mismatched revision",func(a *ProgramAggregate,_ *ProgramSourceState){a.Program.CalculationPolicy.Active.Definition.Revision="changed"},true},
  {"missing valid policy category",func(a *ProgramAggregate,_ *ProgramSourceState){a.Program.CalculationPolicy.Active.Definition.Categories=nil},false},
 }
 for _,tc:=range tests{
  t.Run(tc.name,func(t *testing.T){
   copy,health:=approvedPolicyFixture(t,now)
   tc.edit(&copy,&health)
   result,err:=requirementsOnlyProgramCalculation(copy,now,health)
   if tc.invalid{
    if !errors.Is(err,ErrProgramComplianceCalculationInvalid)||result!=nil{
     t.Fatalf("tampered approval accepted: %+v, %v",result,err)
    }
    return
   }
   if err!=nil||result!=nil{t.Fatalf("unapproved/unhealthy projection visible: %+v, %v",result,err)}
  })
 }

 // An approved, valid policy is not enough to finalize missing evidence.
 pending,health:=approvedPolicyFixture(t,now)
 pending.EvidenceAssessments=nil
 calculation,err:=requirementsOnlyProgramCalculation(pending,now,health)
 if err!=nil||calculation==nil||calculation.ScoreBps!=nil||calculation.State!=ProgramComplianceNotAssessed{
  t.Fatalf("unassessed evidence published a final score: %+v, %v",calculation,err)
 }
}
