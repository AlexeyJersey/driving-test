import type { QuestionId } from '@/domain/question'
import type { ActiveSession, LearnerState, SessionRecord } from './types'

/**
 * The only path to persisted learner state. No component calls a storage API
 * directly, so that a remote-backed implementation can replace this one when
 * cross-device synchronisation arrives.
 */
export interface LearnerStore {
  getState(): LearnerState
  /** Returns an unsubscribe function; shaped for useSyncExternalStore. */
  subscribe(listener: () => void): () => void

  /**
   * Takes `wasCorrect` rather than deriving it, so the store never needs to know
   * what the correct answer is. Correctness is decided in `domain/`; the store's
   * job is to remember, not to judge.
   */
  recordAnswer(questionId: QuestionId, choice: number, wasCorrect: boolean): void
  toggleBookmark(questionId: QuestionId): void

  /** In flight; written on every answer, not on navigation. */
  saveActiveSession(session: ActiveSession): void
  clearActiveSession(): void
  /** Completed; trims history to MAX_SESSION_HISTORY. */
  saveSession(record: SessionRecord): void

  /** Destroys everything. The caller must confirm first — the store will not. */
  reset(): void

  /** False when device storage is unavailable and nothing will survive reload. */
  readonly isPersistent: boolean
}
