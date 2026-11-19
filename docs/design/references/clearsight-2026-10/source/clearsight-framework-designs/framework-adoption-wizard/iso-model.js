// Sample bank policy and questionnaire wording. ISO references are illustrative.
export const isoProgram = {
  code: 'DB-ISMS-01',
  name: 'Digital Banking Information Security',
  scope: 'Mobile and internet banking, their supporting systems and teams, customer information, and critical service providers within the bank’s Nigerian legal entity.'
};

const policies = [
  ['scope','Clause 4','Define the digital banking ISMS scope','Document service boundaries, dependencies and applicable obligations. Review changes with service owners.','What services and dependencies are inside the approved scope?'],
  ['leadership','Clause 5','Assign accountability for digital banking security','Assign service and risk owners and document who approves security exceptions.','Who owns the Program and who approves exceptions?'],
  ['risk','Clause 6','Assess risks and maintain the treatment plan','Review the risk register, treatment owners and the Statement of Applicability when material changes occur.','Which risks and control decisions changed in the latest review?'],
  ['support','Clause 7','Maintain security competence and records','Track training for privileged operators and retain versioned policy and training records.','How do you verify that privileged operators completed their training?'],
  ['access','Clause 8 · Annex A 8.2','Review privileged digital banking access','Review administrator access quarterly, remove unnecessary grants and retain owner sign-off.','When did service owners last review privileged access?'],
  ['supplier','Annex A 5.19','Review critical service providers','Review security obligations, exceptions and supporting evidence for payment and hosting providers.','Which critical providers have open security exceptions?'],
  ['recovery','Annex A 5.30','Exercise digital banking recovery','Test recovery of mobile and web banking and record recovery times and corrective actions.','Did the last exercise meet the bank’s recovery objectives?'],
  ['audit','Clause 9','Review ISMS performance','Review internal audit findings, control performance and management decisions.','Which findings and performance trends did management review?'],
  ['improve','Clause 10','Verify corrective actions','Assign corrective actions, verify their effectiveness and retain closure evidence.','What evidence supports closing the latest corrective action?']
];

export const isoRequirements = Object.freeze(policies.map(([id,reference,title,text,prompt],i) => Object.freeze({
  id: 'iso-' + id, reference, title, text, form: title, area: 'Digital banking ISMS',
  code: 'DB-ISMS-' + String(i+1).padStart(2,'0'),
  questions: Object.freeze([prompt,'Attach the latest approved record and any open exceptions.'].map((question,j) => Object.freeze({
    id: 'iso-' + id + '-' + j, text: question, type: j ? 'File upload' : 'Long answer',
    defaultSettings: Object.freeze({expiry:true,days:i===4?90:365,evidence:j===1,smart:false,connector:'',rule:'',reviewed:false})
  })))
})));

export function freshIsoLifecycle() {
  return {stage:'setup', bank:'Example Bank Nigeria', scope:isoProgram.scope,
    requirement:isoRequirements[4].text, decisions:[]};
}

export function advanceIso(state, action, actor, reason, fields={}) {
  const transitions = {
    submit:['setup','requirement-review','owner'],
    approveRequirement:['requirement-review','activation-review','cro'],
    activate:['activation-review','active','cro'],
    submitAdoption:['active','adoption-review','owner'],
    approveAdoption:['adoption-review','adopted','cro'],
    returnProgram:['requirement-review','setup','cro'],
    returnAdoption:['adoption-review','active','cro']
  };
  const transition = transitions[action];
  if (!transition || state.stage!==transition[0] || actor!==transition[2]) return 'This action is unavailable for the current role or status.';
  if (!reason.trim()) return 'Enter a rationale to continue.';
  if (action==='submit' && !['bank','scope','requirement'].every(key=>fields[key]?.trim())) {
    return 'Enter the bank, Program scope and initial requirement.';
  }
  return {...state,...(action==='submit'?fields:{}),stage:transition[1],
    decisions:[...state.decisions,{action,actor,reason:reason.trim(),at:new Date().toISOString()}]};
}
