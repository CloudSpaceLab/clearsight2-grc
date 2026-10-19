import { useEffect, useState } from 'react'
import { fetchProgramInventory } from './inventoryClient.ts'
import type { InventoryKind, InventoryResult } from './inventoryClient.ts'

type Pagination = { key: string; cursor: string; previous: string[] }
type Loaded = { key: string; cursor: string; request: number; result: InventoryResult }
export type InventoryState = InventoryResult | { status: 'loading' }

export function useProgramInventory(kind: InventoryKind, programId: string, revision: string) {
  const key = `${programId}:${revision}:${kind}`
  const [pagination, setPagination] = useState<Pagination>({ key: '', cursor: '', previous: [] })
  const [request, setRequest] = useState(0)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const current = pagination.key === key ? pagination : { key, cursor: '', previous: [] }

  const state: InventoryState = loaded?.key === key && loaded.cursor === current.cursor &&
    loaded.request === request ? loaded.result : { status: 'loading' }

  useEffect(() => {
    const controller = new AbortController()
    void fetchProgramInventory(programId, revision, kind, current.cursor, controller.signal)
      .then(result => {
        if (!controller.signal.aborted) {
          setLoaded({ key, cursor: current.cursor, request, result })
        }
      })
    return () => controller.abort()
  }, [key, kind, programId, revision, current.cursor, request])

  return {
    state,
    hasPrevious: current.previous.length > 0,
    previous() {
      if (!current.previous.length) return
      setPagination({
        key,
        cursor: current.previous[current.previous.length - 1] ?? '',
        previous: current.previous.slice(0, -1),
      })
    },
    next() {
      if (state.status !== 'ready' || !state.page.next_cursor ||
          state.page.next_cursor === current.cursor) return
      setPagination({
        key,
        cursor: state.page.next_cursor,
        previous: [...current.previous, current.cursor],
      })
    },
    retry() { setRequest(value => value + 1) },
  }
}
