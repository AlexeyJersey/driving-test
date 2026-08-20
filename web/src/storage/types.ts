import type { AnswerValue, CategoryKey, QuestionId, VolumeKey } from '@/domain/question'
import { DEFAULT_UI_LANGUAGE } from '@/i18n/strings'
import type { UiLanguage } from '@/i18n/strings'

/**
 * Bumped only when the stored shape changes in a way an older document cannot
 * simply be read as. Every bump needs a migration or a deliberate discard.
 */
export const LEARNER_STATE_VERSION = 1

export type SessionMode = 'study' | 'mistakes' | 'bookmarks'

/** What a session was asked to cover. Kept so a session can be described later. */
export interface SessionFilter {
  /** null means "every volume present". */
  readonly volumes: readonly VolumeKey[] | null
  /** null means "every category". */
  readonly categories: readonly CategoryKey[] | null
  readonly shuffle: boolean
  /** Seed for the shuffle, so a resumed session keeps its exact order. */
  readonly seed: number
}

export interface AnswerOutcome {
  readonly questionId: QuestionId
  /** An option index, or a sequence string for an order question. */
  readonly choice: AnswerValue
  readonly correct: boolean
}

/**
 * Per-question aggregate. Deliberately not an event log: every statistic the
 * app reports derives from these counters, and a log would grow without bound.
 */
export interface QuestionProgress {
  readonly attempts: number
  readonly correct: number
  /** Consecutive correct answers ending now. Zero after any wrong answer. */
  readonly streak: number
  readonly lastChoice: AnswerValue
  readonly lastAnsweredAt: string
}

/**
 * A session in flight, persisted on every answer so a discarded page loses
 * neither the answers nor the learner's place.
 */
export interface ActiveSession {
  readonly id: string
  readonly mode: SessionMode
  readonly filter: SessionFilter
  /**
   * The resolved set, stored rather than recomputed. The mistakes set shrinks as
   * the learner answers it, so re-evaluating the filter on resume would hand
   * back a different, shorter set mid-session.
   */
  readonly questionIds: readonly QuestionId[]
  /** Index into questionIds of the next unanswered question. */
  readonly position: number
  readonly answers: readonly AnswerOutcome[]
  readonly startedAt: string
}

export interface SessionRecord {
  readonly id: string
  readonly mode: SessionMode
  readonly filter: SessionFilter
  readonly startedAt: string
  readonly finishedAt: string
  readonly answers: readonly AnswerOutcome[]
}

/**
 * Preferences, kept in the same document as progress so they travel the same
 * path — and, once synchronisation exists, follow the learner between devices.
 */
export interface LearnerSettings {
  readonly uiLanguage: UiLanguage
}

export interface LearnerState {
  readonly version: number
  /**
   * Always "local" in this release. The slot exists so attaching an identity
   * later is additive rather than a migration of meaning — see the constitution
   * on cross-device synchronisation.
   */
  readonly owner: 'local'
  readonly progress: Readonly<Record<QuestionId, QuestionProgress>>
  readonly bookmarks: readonly QuestionId[]
  /** Completed sessions, newest first, capped at MAX_SESSION_HISTORY. */
  readonly sessions: readonly SessionRecord[]
  readonly activeSession: ActiveSession | null
  readonly settings: LearnerSettings
  readonly updatedAt: string
}

export function emptyLearnerState(now: string): LearnerState {
  return {
    version: LEARNER_STATE_VERSION,
    owner: 'local',
    progress: {},
    bookmarks: [],
    sessions: [],
    activeSession: null,
    settings: { uiLanguage: DEFAULT_UI_LANGUAGE },
    updatedAt: now,
  }
}
