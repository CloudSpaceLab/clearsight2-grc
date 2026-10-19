import { useProgramInventory } from './useProgramInventory.ts'
import type { InventoryKind } from './inventoryClient.ts'

const formats: Record<InventoryKind, { title: string; description: string; empty: string }> = {
  controls: {
    title: 'Linked controls',
    description: 'Recorded implementation status',
    empty: 'No current controls linked to approved requirements.',
  },
  'evidence-contracts': {
    title: 'Evidence contracts',
    description: 'Active collection requirements',
    empty: 'No active evidence contracts linked to approved requirements.',
  },
}

export function ProgramInventoryPanel({
  kind, programId, revision, onRefreshProgram,
}: {
  kind: InventoryKind
  programId: string
  revision: string
  onRefreshProgram: () => void
}) {
  const inventory = useProgramInventory(kind, programId, revision)
  const definition = formats[kind]
  const state = inventory.state

  return <section className="surface program-inventory" aria-label={definition.title}>
    <div className="surface-heading">
      <div><h2>{definition.title}</h2><p>{definition.description}</p></div>
    </div>
    {state.status === 'loading' ? <p className="program-context-empty" role="status">Loading {definition.title.toLowerCase()}…</p>
      : state.status === 'ready' ? (
        state.page.items.length === 0
          ? <p className="program-context-empty" role="status">{definition.empty}</p>
          : <div className="assessment-table-wrap"><table className="assessment-table">
              <caption className="sr-only">{definition.title}</caption>
              <thead><tr>
                {kind === 'evidence-contracts' && <th>Code</th>}
                <th>{kind === 'controls' ? 'Control' : 'Contract'}</th>
                <th>{kind === 'controls' ? 'Recorded status' : 'Version'}</th>
                <th>Updated</th>
              </tr></thead>
              <tbody>{state.page.items.map(item => <tr key={item.id}>
                {kind === 'evidence-contracts' && <td>{item.code}</td>}
                <td>{item.name}</td>
                <td>{kind === 'controls' ? item.status.replaceAll('_', ' ').toLowerCase() : item.version}</td>
                <td>{new Date(item.updated_at).toLocaleDateString()}</td>
              </tr>)}</tbody>
            </table></div>
      ) : <div className="program-context-empty" role={state.status === 'unavailable' ? 'alert' : 'status'}>
        <p>{state.status === 'unauthenticated' ? 'Sign in required.'
          : state.status === 'forbidden' ? 'Access denied.'
          : state.status === 'not_found' ? 'Program unavailable.'
          : state.status === 'changed' ? 'Program changed. Reload to review current records.'
          : 'Records unavailable.'}</p>
        {(state.status === 'unavailable' || state.status === 'changed') &&
          <button type="button" className="text-link"
            onClick={() => {
              if (state.status === 'changed') onRefreshProgram()
              inventory.retry()
            }}>{state.status === 'changed' ? 'Reload Program' : 'Retry'}</button>}
      </div>}
    {state.status === 'ready' && (inventory.hasPrevious || !!state.page.next_cursor) &&
      <nav className="program-directory-pagination" aria-label={definition.title + ' pages'}>
        <button className="button" type="button" onClick={inventory.previous}
          disabled={!inventory.hasPrevious}>Previous</button>
        <button className="button" type="button" onClick={inventory.next}
          disabled={!state.page.next_cursor}>Next</button>
      </nav>}
    {state.status === 'ready' && <p className="program-inventory-note">
      {kind === 'controls'
        ? 'Implementation status is recorded, not independently verified.'
        : 'A contract does not establish evidence submission or review.'}
    </p>}
  </section>
}
