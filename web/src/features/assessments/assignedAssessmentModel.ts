export type AssignmentScope={tenantId:string;legalEntityId:string;actorId:string;formId:string}
export type AssignmentIdentity={id:string;tenant_id:string;legal_entity_id:string;subject_type:string;subject_id:string;status:string;form_template_id?:string;recipient?:{principal_id?:string}}
export const openAssignmentStatuses=['READY','OPEN','DRAFT']
export function isAssignedAssessment(value:AssignmentIdentity,scope:AssignmentScope):boolean{
  return !!value.id&&!!value.subject_id&&value.tenant_id===scope.tenantId&&value.legal_entity_id===scope.legalEntityId&&value.subject_type==='PROGRAM'&&value.recipient?.principal_id===scope.actorId&&value.form_template_id===scope.formId&&openAssignmentStatuses.includes(value.status)
}
