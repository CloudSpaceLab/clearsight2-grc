import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { command, v1 } from './v1Client'
import type { V1Context } from './v1Client'

type Account = { label: string; username: string; password: string }
type Session = { context: V1Context | null; loading: boolean; refresh: () => Promise<void> }
const SessionContext = createContext<Session>({ context: null, loading: true, refresh: async () => {} })
export const useV1Session = () => useContext(SessionContext)
export function V1SessionProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<V1Context | null>(null)
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function refresh() {
    setLoading(true)
    try {
      const status = await v1<{ authenticated: boolean; demo_login_available: boolean }>('/api/v1/session/status')
      setContext(status.authenticated ? await v1<V1Context>('/api/v1/context') : null)
      if (status.demo_login_available) { const result = await v1<{ accounts: Account[] }>('/api/v1/demo/accounts'); setAccounts(result.accounts) }
    } catch (e) { setContext(null); setError(e instanceof Error ? e.message : 'Session unavailable') }
    finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [])
  return <SessionContext.Provider value={{ context, loading, refresh }}>
    <section className="v1-session" aria-label="Backend session">
      {loading ? <span role="status">Checking backend session…</span> : context ? <><span><strong>{context.actor.name}</strong> · {context.tenant.name} · {context.mode}{context.demo_mode ? ' · Development demo database' : ''}</span><button className="text-link" disabled={busy} onClick={async () => { setBusy(true); try { await command('/api/v1/demo/logout', {}); await refresh() } catch (e) { setError(String(e)) } finally { setBusy(false) } }}>Sign out</button></>
        : <form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { const account = accounts.find(a => a.username === username); if (!account) throw Error('Choose a demo account'); await command('/api/v1/demo/login', { username, password: account.password }); await refresh() } catch (err) { setError(err instanceof Error ? err.message : 'Sign-in failed') } finally { setBusy(false) } }}>
          <label>Local v1 demo account<select value={username} onChange={e => setUsername(e.target.value)} required><option value="">Choose account</option>{accounts.map(a => <option key={a.username} value={a.username}>{a.label}</option>)}</select></label><button className="button" disabled={busy || !accounts.length}>Sign in</button><span>Uses the backend’s demo session; no browser identity override.</span>
        </form>}
      {error && <p role="alert">{error}</p>}
    </section>
    {children}
  </SessionContext.Provider>
}
