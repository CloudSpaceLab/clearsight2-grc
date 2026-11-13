import { V1Error } from '../programs/v1Client.ts'

/** A network failure may occur after a command reached v1, so never assert that it failed. */
export function formCommandError(error:unknown):string {
  if (error instanceof V1Error && error.status === 409) return 'This form has changed since you opened it. Copy your unsaved edits, then use Open draft to load the latest revision before applying them again.'
  if (error instanceof V1Error && (error.status === 401 || error.status === 403)) return 'Your session or permission does not allow this action. Keep a copy of unsaved edits, then sign in again or contact the assigned owner.'
  if (error instanceof TypeError) return 'The connection was interrupted, so the result is unknown. Keep a copy of unsaved edits and check the form’s latest status before trying again.'
  return error instanceof Error ? error.message : 'The form action could not be completed. Keep a copy of unsaved edits and try again.'
}
