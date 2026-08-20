import { MASTERY_STREAK } from './constants'
import type { AnswerValue, Question, QuestionId } from './question'
import { normaliseOrder } from './question'
import type { QuestionProgress } from '@/storage/types'

/**
 * The only write path into per-question progress.
 *
 * Mistake-set membership is derived from these counters rather than stored, so
 * the two views cannot drift apart.
 */
export function applyAnswer(
  previous: QuestionProgress | undefined,
  choice: AnswerValue,
  wasCorrect: boolean,
  at: string,
): QuestionProgress {
  return {
    attempts: (previous?.attempts ?? 0) + 1,
    correct: (previous?.correct ?? 0) + (wasCorrect ? 1 : 0),
    // A wrong answer resets the streak to zero, which is what puts a question
    // back into the mistakes set.
    streak: wasCorrect ? (previous?.streak ?? 0) + 1 : 0,
    lastChoice: choice,
    lastAnsweredAt: at,
  }
}

export function isAttempted(progress: QuestionProgress | undefined): boolean {
  return (progress?.attempts ?? 0) > 0
}

/**
 * A question counts as a mistake when it has been answered wrong at least once
 * and has not since been answered right MASTERY_STREAK times in a row.
 */
export function isMistake(progress: QuestionProgress | undefined): boolean {
  if (!progress || progress.attempts === 0) return false
  const everWrong = progress.attempts > progress.correct
  return everWrong && progress.streak < MASTERY_STREAK
}

export function isMastered(progress: QuestionProgress | undefined): boolean {
  return (progress?.streak ?? 0) >= MASTERY_STREAK
}

export function answeredCorrectly(question: Question, value: AnswerValue): boolean {
  if (question.kind === 'order') {
    return typeof value === 'string' && normaliseOrder(value) === normaliseOrder(question.answer)
  }
  return value === question.correct
}

/** Ids currently in the mistakes set, restricted to questions that still exist. */
export function mistakeIds(
  questions: readonly Question[],
  progress: Readonly<Record<QuestionId, QuestionProgress>>,
): readonly QuestionId[] {
  return questions.filter((q) => isMistake(progress[q.id])).map((q) => q.id)
}
