import { DEFAULT_UI_LANGUAGE, UI_LANGUAGES } from '@/i18n/strings'
import type { UiLanguage } from '@/i18n/strings'
import type {
  ActiveSession,
  AnswerOutcome,
  LearnerSettings,
  LearnerState,
  QuestionProgress,
  SessionFilter,
  SessionMode,
  SessionRecord,
} from './types'
import { LEARNER_STATE_VERSION, emptyLearnerState } from './types'

/**
 * What reading the stored document produced. A discard is always clean and
 * always reported: presenting statistics derived from unreadable state is
 * forbidden, so the caller must be able to tell the learner it happened.
 */
export type StoredStateOutcome =
  | { readonly kind: 'empty' }
  | { readonly kind: 'current'; readonly state: LearnerState }
  | { readonly kind: 'discarded'; readonly reason: string }

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0

const isIsoish = (v: unknown): v is string => typeof v === 'string' && v.length > 0

const isAnswerValue = (v: unknown): v is number | string =>
  (typeof v === 'number' && Number.isInteger(v)) || typeof v === 'string'

function readProgress(v: unknown): QuestionProgress | null {
  if (!isObject(v)) return null
  const { attempts, correct, streak, lastChoice, lastAnsweredAt } = v
  if (!isCount(attempts) || !isCount(correct) || !isCount(streak)) return null
  if (typeof lastChoice !== 'number' || !Number.isInteger(lastChoice)) return null
  if (!isIsoish(lastAnsweredAt)) return null
  // A record claiming more correct answers than attempts is incoherent; every
  // statistic derives from these two, so a bad pair would poison the whole screen.
  if (correct > attempts || streak > correct) return null
  return { attempts, correct, streak, lastChoice, lastAnsweredAt }
}

function readStringArray(v: unknown): readonly string[] | null {
  if (!Array.isArray(v)) return null
  return v.every((x) => typeof x === 'string') ? (v as string[]) : null
}

function readAnswers(v: unknown): readonly AnswerOutcome[] | null {
  if (!Array.isArray(v)) return null
  const out: AnswerOutcome[] = []
  for (const a of v) {
    if (!isObject(a)) return null
    const { questionId, choice, correct } = a
    if (typeof questionId !== 'string' || !isAnswerValue(choice) || typeof correct !== 'boolean') {
      return null
    }
    out.push({ questionId, choice, correct })
  }
  return out
}

const isMode = (v: unknown): v is SessionMode =>
  v === 'study' || v === 'mistakes' || v === 'bookmarks'

function readFilter(v: unknown): SessionFilter | null {
  if (!isObject(v)) return null
  if (typeof v.shuffle !== 'boolean' || typeof v.seed !== 'number') return null
  // null is a meaningful value here — it means "everything" — so it is not an
  // error, while a present-but-malformed list is.
  const volumes = v.volumes === null ? null : readStringArray(v.volumes)
  const categories = v.categories === null ? null : readStringArray(v.categories)
  if (v.volumes !== null && volumes === null) return null
  if (v.categories !== null && categories === null) return null
  return { volumes, categories, shuffle: v.shuffle, seed: v.seed }
}

/**
 * Validated rather than cast, because this is what the resume prompt reads. A
 * half-written session here would crash the study screen on launch, which is the
 * worst possible place to discover that storage cannot be trusted.
 */
function readActiveSession(v: unknown): ActiveSession | null {
  if (!isObject(v)) return null
  const questionIds = readStringArray(v.questionIds)
  const answers = readAnswers(v.answers)
  const filter = readFilter(v.filter)
  if (typeof v.id !== 'string' || !isMode(v.mode) || !filter || !questionIds || !answers) return null
  if (questionIds.length === 0) return null
  if (!isCount(v.position) || v.position > questionIds.length) return null
  if (!isIsoish(v.startedAt)) return null
  return {
    id: v.id,
    mode: v.mode,
    filter,
    questionIds,
    position: v.position,
    answers,
    startedAt: v.startedAt,
  }
}

/**
 * Absent settings are not an error: a document written before the language
 * switcher existed is still perfectly readable, and defaulting is the whole
 * migration this change needs — no version bump, no discarded progress.
 */
function readSettings(v: unknown): LearnerSettings {
  const fallback: LearnerSettings = { uiLanguage: DEFAULT_UI_LANGUAGE }
  if (!isObject(v)) return fallback
  const candidate = v.uiLanguage
  return UI_LANGUAGES.includes(candidate as UiLanguage)
    ? { uiLanguage: candidate as UiLanguage }
    : fallback
}

function readSessions(v: unknown): readonly SessionRecord[] {
  if (!Array.isArray(v)) return []
  const out: SessionRecord[] = []
  for (const r of v) {
    if (!isObject(r)) continue
    const answers = readAnswers(r.answers)
    const filter = readFilter(r.filter)
    if (typeof r.id !== 'string' || !isMode(r.mode) || !filter || !answers) continue
    if (!isIsoish(r.startedAt) || !isIsoish(r.finishedAt)) continue
    out.push({
      id: r.id,
      mode: r.mode,
      filter,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      answers,
    })
  }
  return out
}

/**
 * Parses whatever is in storage into usable state, or says why it could not.
 *
 * There is only one version so far, so "an older version" can only mean a
 * document this build does not understand, and the honest response is a clean
 * discard. Real migration machinery arrives with the first schema change that
 * needs it — building it now would be speculative code with no case to serve.
 */
export function readStoredState(raw: string | null, now: string): StoredStateOutcome {
  if (raw === null || raw.trim() === '') return { kind: 'empty' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { kind: 'discarded', reason: 'stored progress was not readable JSON' }
  }

  if (!isObject(parsed)) {
    return { kind: 'discarded', reason: 'stored progress was not an object' }
  }
  if (parsed.version !== LEARNER_STATE_VERSION) {
    return {
      kind: 'discarded',
      reason: `stored progress used format version ${String(parsed.version)}, this build reads ${LEARNER_STATE_VERSION}`,
    }
  }

  const progressRaw = parsed.progress
  if (!isObject(progressRaw)) {
    return { kind: 'discarded', reason: 'stored progress had no progress map' }
  }
  const progress: Record<string, QuestionProgress> = {}
  for (const [id, value] of Object.entries(progressRaw)) {
    const entry = readProgress(value)
    // One unreadable question's record is not worth discarding a whole history.
    if (entry) progress[id] = entry
  }

  const bookmarks = readStringArray(parsed.bookmarks)
  if (!bookmarks) {
    return { kind: 'discarded', reason: 'stored bookmarks were not a list of ids' }
  }

  const base = emptyLearnerState(now)
  return {
    kind: 'current',
    state: {
      ...base,
      progress,
      bookmarks,
      sessions: readSessions(parsed.sessions),
      activeSession: readActiveSession(parsed.activeSession),
      settings: readSettings(parsed.settings),
      updatedAt: isIsoish(parsed.updatedAt) ? parsed.updatedAt : now,
    },
  }
}
