package programread

import (
 "encoding/json"
 "strings"
 "testing"
)

func TestDesignDrivenProgramMetadataRequiresNativeLifecycle(t *testing.T){
 base:=makeRecord()
 if !validProgramMetadata(base){t.Fatal("authorized Program metadata was rejected")}
 cases:=[]struct{name string;modify func(*Record)}{
  {"no code",func(p *Record){p.Code=""}},
  {"no type",func(p *Record){p.ProgramType=""}},
  {"no function",func(p *Record){p.OwningFunction=""}},
  {"fabricated compliance status",func(p *Record){p.Status="COMPLIANT"}},
  {"unrecognized status",func(p *Record){p.Status="ON_TRACK"}},
 }
 for _,tc:=range cases{
  t.Run(tc.name,func(t *testing.T){
   p:=base;tc.modify(&p)
   if validProgramMetadata(p){t.Fatalf("unsupported metadata entered Program workspace: %+v",p)}
  })
 }
 for _,status:=range []string{"DRAFT","ACTIVE","PAUSED","RETIRED"}{
  p:=base;p.Status=status
  if !validProgramMetadata(p){t.Fatalf("v1 lifecycle %s rejected",status)}
 }
 data,err:=json.Marshal(base)
 if err!=nil{t.Fatal(err)}
 var wire map[string]any
 if err:=json.Unmarshal(data,&wire);err!=nil{t.Fatal(err)}
 for _,name:=range []string{"code","status","program_type","owning_function","jurisdiction","source_revision"}{
  if _,ok:=wire[name];!ok{t.Fatalf("missing approved HTML Program context %s",name)}
 }
 for _,secret:=range []string{"tenant_id","legal_entity_id","department_path","principal_id","owner_principal_id","calculation_policy"}{
  if _,ok:=wire[secret];ok{t.Fatalf("private scope or policy leaked through Program identity: %s",secret)}
 }
}

func TestBothProgramReadsShareTheSameProjection(t *testing.T){
 for _,column:=range []string{"p.code","p.status","p.program_type","p.owning_function","p.jurisdiction"}{
  // Both SQL statements reference the exact same ordered metadata field set.
  // Query-specific scope predicates must remain separately enforced.
  if !strings.Contains(programMetadataColumns,column) {t.Fatalf("missing Program field %s",column)}
 }
 if !strings.Contains(visibleProgramSQL,programMetadataColumns) ||
    !strings.Contains(visibleProgramListSQL,programMetadataColumns) {
  t.Fatal("Program detail and bounded directory use different projections")
 }
}

