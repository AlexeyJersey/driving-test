import { MAX_SESSION_HISTORY } from '@/domain/constants'
import { applyAnswer } from '@/domain/progress'
import type { AnswerValue, QuestionId } from '@/domain/question'
import type { UiLanguage } from '@/i18n/strings'
import { readStoredState } from './migrate'
import type { LearnerStore } from './store'
import type { ActiveSession, LearnerState, SessionRecord } from './types'
import { emptyLearnerState } from './types'

/** Versioned so a future schema change can be detected rather than misread. */
const STORAGE_KEY = 'driving-test/learner/v1'

const now = () => new Date().toISOString()

abstract class BaseLearnerStore implements LearnerStore {
  protected state: LearnerState
  private readonly listeners = new Set<() => void>()

  constructor(initial: LearnerState) {
    this.state = initial
    // Bound once here so any of these can be passed as a bare callback (an
    // event handler prop, for instance) without the caller having to remember
    // to wrap it in an arrow function to keep `this` attached — the mistake
    // that briefly broke the content-language switcher.
    this.recordAnswer = this.recordAnswer.bind(this)
    this.toggleBookmark = this.toggleBookmark.bind(this)
    this.setUiLanguage = this.setUiLanguage.bind(this)
    this.setContentLanguage = this.setContentLanguage.bind(this)
    this.unlock = this.unlock.bind(this)
    this.saveActiveSession = this.saveActiveSession.bind(this)
    this.clearActiveSession = this.clearActiveSession.bind(this)
    this.saveSession = this.saveSession.bind(this)
    this.reset = this.reset.bind(this)
  }

  abstract readonly isPersistent: boolean
  protected abstract persist(state: LearnerState): void

  getState(): LearnerState {
    return this.state
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Every mutation persists before returning, so nothing is lost on a kill. */
  private commit(next: Omit<LearnerState, 'updatedAt'>): void {
    this.state = { ...next, updatedAt: now() }
    this.persist(this.state)
    for (const listener of this.listeners) listener()
  }

  recordAnswer(questionId: QuestionId, choice: AnswerValue, wasCorrect: boolean): void {
    this.commit({
      ...this.state,
      progress: {
        ...this.state.progress,
        [questionId]: applyAnswer(this.state.progress[questionId], choice, wasCorrect, now()),
      },
    })
  }

  toggleBookmark(questionId: QuestionId): void {
    const has = this.state.bookmarks.includes(questionId)
    this.commit({
      ...this.state,
      // Never touches progress — a bookmark is independent of answer history.
      bookmarks: has
        ? this.state.bookmarks.filter((id) => id !== questionId)
        : [...this.state.bookmarks, questionId],
    })
  }

  saveActiveSession(session: ActiveSession): void {
    this.commit({ ...this.state, activeSession: session })
  }

  clearActiveSession(): void {
    if (this.state.activeSession === null) return
    this.commit({ ...this.state, activeSession: null })
  }

  saveSession(record: SessionRecord): void {
    this.commit({
      ...this.state,
      sessions: [record, ...this.state.sessions].slice(0, MAX_SESSION_HISTORY),
      activeSession: null,
    })
  }

  setUiLanguage(language: UiLanguage): void {
    if (this.state.settings.uiLanguage === language) return
    this.commit({ ...this.state, settings: { ...this.state.settings, uiLanguage: language } })
  }

  setContentLanguage(language: UiLanguage): void {
    if (this.state.settings.contentLanguage === language) return
    this.commit({ ...this.state, settings: { ...this.state.settings, contentLanguage: language } })
  }

  unlock(): void {
    if (this.state.settings.unlocked) return
    this.commit({ ...this.state, settings: { ...this.state.settings, unlocked: true } })
  }

  reset(): void {
    this.commit({ ...emptyLearnerState(now()), settings: this.state.settings })
  }
}

/** Backed by localStorage: the working copy the interface reads and writes. */
class LocalLearnerStore extends BaseLearnerStore {
  readonly isPersistent = true

  protected persist(state: LearnerState): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Quota exhausted or storage revoked mid-session. Studying continues on
      // the in-memory copy; the notice driven by isPersistent is a US3 concern.
    }
  }
}

/**
 * Fallback when device storage is unavailable, as in some private-browsing
 * modes. Every study flow works; nothing survives a reload, and `isPersistent`
 * is how the interface knows to say so rather than pretend.
 */
class MemoryLearnerStore extends BaseLearnerStore {
  readonly isPersistent = false

  protected persist(): void {
    // Nowhere to go.
  }
}

function storageWorks(): boolean {
  try {
    const probe = `${STORAGE_KEY}/probe`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export interface CreatedStore {
  readonly store: LearnerStore
  /** Set when stored progress had to be thrown away, so the learner can be told. */
  readonly discardedReason: string | null
}

/**
 * Asks the browser to treat this origin's storage as persistent.
 *
 * Safari evicts local storage for sites that have not been used for a while, and
 * this is the only lever a page has against it. The browser may refuse, and
 * installing to the home screen matters more than the request does, so the
 * result is not worth reacting to — but not asking would be leaving progress
 * more exposed than it needs to be.
 */
function requestPersistence(): void {
  void navigator.storage?.persist?.().catch(() => undefined)
}

export function createLearnerStore(): CreatedStore {
  const timestamp = now()

  if (!storageWorks()) {
    return { store: new MemoryLearnerStore(emptyLearnerState(timestamp)), discardedReason: null }
  }

  requestPersistence()

  const outcome = readStoredState(window.localStorage.getItem(STORAGE_KEY), timestamp)
  const state = outcome.kind === 'current' ? outcome.state : emptyLearnerState(timestamp)

  if (outcome.kind === 'discarded') {
    // Clean discard: never present statistics derived from unreadable state.
    window.localStorage.removeItem(STORAGE_KEY)
  }

  return {
    store: new LocalLearnerStore(state),
    discardedReason: outcome.kind === 'discarded' ? outcome.reason : null,
  }
}
