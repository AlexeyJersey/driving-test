import { createContext, useContext, useSyncExternalStore } from 'react'
import type { LearnerStore } from './store'
import type { LearnerState } from './types'

/**
 * The store is an external store already, so React's own primitive is the whole
 * integration — no state library needed.
 */
export const LearnerStoreContext = createContext<LearnerStore | null>(null)

export function useLearnerStore(): LearnerStore {
  const store = useContext(LearnerStoreContext)
  if (!store) throw new Error('useLearnerStore used outside LearnerStoreContext')
  return store
}

export function useLearnerState(): LearnerState {
  const store = useLearnerStore()
  return useSyncExternalStore(
    (onChange) => store.subscribe(onChange),
    () => store.getState(),
  )
}
