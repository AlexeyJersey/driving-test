import type { CategoryKey, Question, QuestionId, VolumeKey } from './question'

export interface SelectionFilter {
  /** null means every volume present. */
  readonly volumes: readonly VolumeKey[] | null
  /** null means every category. */
  readonly categories: readonly CategoryKey[] | null
  readonly shuffle: boolean
  readonly seed: number
}

export const allQuestionsFilter = (seed: number): SelectionFilter => ({
  volumes: null,
  categories: null,
  shuffle: false,
  seed,
})

/**
 * Deterministic PRNG (mulberry32). Deterministic on purpose: a resumed session
 * must reproduce its exact order, or the stored position would point at a
 * different question than the one the learner left off at.
 */
function randomFrom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = [...items]
  const next = randomFrom(seed)
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1))
    const a = out[i] as T
    const b = out[j] as T
    out[i] = b
    out[j] = a
  }
  return out
}

export function matchesFilter(question: Question, filter: SelectionFilter): boolean {
  if (filter.volumes && !filter.volumes.includes(question.volume)) return false
  if (filter.categories && !filter.categories.includes(question.category)) return false
  return true
}

/**
 * Turns a filter into the ordered list of question ids a session will ask.
 *
 * Separating *what to ask* from *how to ask it* is the exam-mode seam: a timed,
 * scored session is a different policy over the same resolved set.
 */
export function selectQuestionIds(
  questions: readonly Question[],
  filter: SelectionFilter,
): readonly QuestionId[] {
  const matching = questions.filter((q) => matchesFilter(q, filter))
  const ordered = filter.shuffle ? shuffled(matching, filter.seed) : matching
  return ordered.map((q) => q.id)
}

/** Restricts an already-resolved set, preserving its order. */
export function restrictToIds(
  ids: readonly QuestionId[],
  allowed: ReadonlySet<QuestionId>,
): readonly QuestionId[] {
  return ids.filter((id) => allowed.has(id))
}
