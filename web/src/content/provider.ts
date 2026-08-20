import type { CategoryKey, Question, QuestionId, VolumeMeta } from '@/domain/question'

/**
 * The only path from the application to question content.
 *
 * Read-only by construction: there is no save, update, or delete, and adding one
 * is exactly the future change this boundary exists to absorb. When an
 * administrator interface arrives it becomes a second implementation of this
 * interface, and no screen that consumes questions changes.
 */
export interface ContentProvider {
  getVolumes(): readonly VolumeMeta[]
  getCategories(): readonly CategoryKey[]
  getAllQuestions(): readonly Question[]
  getQuestion(id: QuestionId): Question | undefined
  /** Preserves the order given, because that order is the study order. */
  getQuestions(ids: readonly QuestionId[]): readonly Question[]
}
