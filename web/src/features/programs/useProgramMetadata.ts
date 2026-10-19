import { useEffect, useState } from 'react'
import { loadProgramMetadata } from './programApi'
import type { ProgramReadResult } from './programApi'

export type ProgramLoadState = ProgramReadResult | { kind: 'loading' }

export function useProgramMetadata(id: string | null) {
  const [state, setState] = useState<ProgramLoadState>({ kind: 'not-selected' })
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState(id ? { kind: 'loading' } : { kind: 'not-selected' })
    void loadProgramMetadata(id, controller.signal).then(result => {
      if (!controller.signal.aborted) setState(result)
    })
    return () => controller.abort()
  }, [id, retry])

  return { state, retry: () => setRetry(value => value + 1) }
}
