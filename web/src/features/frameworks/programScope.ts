/** Extract only a stored, human-readable Program scope description. */
export function programScopeDescription(value:unknown):string|null {
 if (!value || typeof value !== 'object' || Array.isArray(value)) return null
 const description=(value as {description?:unknown}).description
 return typeof description==='string' && description.trim() ? description.trim() : null
}
