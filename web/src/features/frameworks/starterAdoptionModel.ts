export type StarterField={id:string;section_id:string;label:string;type:string;required:boolean;description?:string;options?:string[]}
export type StarterRequirement={code:string;title:string;statement:string;original_statement:string;original_title?:string;reference:string;version:number;form_template_id:string;form_template_version:number;form_name:string;form_status:string;form_approved:boolean;group_id:string;group_title:string;fields:StarterField[];decision:''|'KEEP'|'TAILOR'|'REVIEW';reason:string}
export type StarterConfiguration={requirements:StarterRequirement[];owner_id:string;respondent_scope_ids:string[]}
export type StarterAdoption={id:string;template_code:string;status:'DRAFT'|'PENDING'|'ACTIVE'|'REJECTED';rationale:string;configuration:StarterConfiguration;proposed_by:string}
export function freshStarterConfiguration(requirements:StarterRequirement[],owner:string):StarterConfiguration{return {requirements:requirements.map(r=>({...structuredClone(r),decision:'',reason:''})),owner_id:owner,respondent_scope_ids:[]}}
export function starterStepError(config:StarterConfiguration,step:number):string{
 if(!config.requirements.length)return 'No starter requirements are available. Install the framework starter pack before continuing.'
 if(config.requirements.some(r=>!r.decision||(r.decision!=='KEEP'&&!r.reason.trim())))return 'Review every requirement and enter a reason for each change or applicability review.'
 if(step>=2&&config.requirements.some(r=>!r.form_approved))return 'The linked questionnaire needs independent approval in Forms before adoption can be submitted.'
 if(step>=3&&(!config.owner_id||!config.respondent_scope_ids.length))return 'Select at least one respondent department or unit.'
 return ''
}
export function groupHref(r:StarterRequirement){return `?screen=assessment&form=${encodeURIComponent(r.form_template_id)}&version=${r.form_template_version}&group=${encodeURIComponent(r.group_id)}`}

export function keepStarterWording(requirement:StarterRequirement):StarterRequirement{return {...requirement,title:requirement.original_title||requirement.title,statement:requirement.original_statement,decision:'KEEP',reason:''}}
