import { questions, volumes } from '@/generated/content'
import type { CategoryKey, Question, QuestionId, VolumeMeta } from '@/domain/question'
import type { ContentProvider } from './provider'

/**
 * Reads the bundle that build-content generated from `data/`. Synchronous,
 * because the content is part of the build — which is why no screen needs a
 * loading state for questions.
 */
class BundledContentProvider implements ContentProvider {
  private readonly byId: Map<QuestionId, Question>
  private readonly categories: readonly CategoryKey[]

  constructor() {
    this.byId = new Map(questions.map((q) => [q.id, q]))
    this.categories = [...new Set(questions.map((q) => q.category))]
  }

  getVolumes(): readonly VolumeMeta[] {
    return volumes
  }

  getCategories(): readonly CategoryKey[] {
    return this.categories
  }

  getAllQuestions(): readonly Question[] {
    return questions
  }

  /**
   * Undefined rather than a throw: stored progress may reference a question a
   * later data revision removed, and that must degrade quietly instead of
   * breaking the statistics screen.
   */
  getQuestion(id: QuestionId): Question | undefined {
    return this.byId.get(id)
  }

  getQuestions(ids: readonly QuestionId[]): readonly Question[] {
    const found: Question[] = []
    for (const id of ids) {
      const q = this.byId.get(id)
      if (q) found.push(q)
    }
    return found
  }
}

export const content: ContentProvider = new BundledContentProvider()
