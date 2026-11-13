export type AdoptionPageIdentity={program_version:number;adoption_id:string}

/** Reject pages from a different revision or adoption rather than mixing records. */
export function verifyAdoptionPage(page:AdoptionPageIdentity,expected:{version:number;adoptionId:string}):void {
 if(page.program_version!==expected.version||page.adoption_id!==expected.adoptionId)
  throw Error('The Program or framework adoption changed. Refresh the Program before continuing.')
}
