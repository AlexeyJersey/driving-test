import type { AnswerValue, QuestionId } from './question'
import type { SelectionFilter } from './selection'
import type { ActiveSession, AnswerOutcome, SessionMode, SessionRecord } from '@/storage/types'

/**
 * Session progression as pure functions over the persisted session shape.
 *
 * Nothing here knows about React, storage, or how feedback is presented — which
 * is what keeps the exam-mode seam honest: a timed, scored session is another
 * policy over these same operations.
 */

export interface Tally {
  readonly answered: number
  readonly correct: number
  readonly wrong: number
  readonly total: number
}

export function startSession(
  id: string,
  mode: SessionMode,
  filter: SelectionFilter,
  questionIds: readonly QuestionId[],
  startedAt: string,
): ActiveSession {
  return { id, mode, filter, questionIds, position: 0, answers: [], startedAt }
}

export function currentQuestionId(session: ActiveSession): QuestionId | undefined {
  return session.questionIds[session.position]
}

export function isFinished(session: ActiveSession): boolean {
  return session.position >= session.questionIds.length
}

/**
 * Records an answer to the current question and advances. Answering a finished
 * session is a no-op rather than an error: a double-tap on the last question
 * should not throw.
 */
export function answerCurrent(
  session: ActiveSession,
  choice: AnswerValue,
  wasCorrect: boolean,
): ActiveSession {
  const questionId = currentQuestionId(session)
  if (questionId === undefined) return session
  const outcome: AnswerOutcome = { questionId, choice, correct: wasCorrect }
  return {
    ...session,
    position: session.position + 1,
    answers: [...session.answers, outcome],
  }
}

export function tally(session: ActiveSession): Tally {
  const correct = session.answers.filter((a) => a.correct).length
  return {
    answered: session.answers.length,
    correct,
    wrong: session.answers.length - correct,
    total: session.questionIds.length,
  }
}

export function toRecord(session: ActiveSession, finishedAt: string): SessionRecord {
  return {
    id: session.id,
    mode: session.mode,
    filter: session.filter,
    startedAt: session.startedAt,
    finishedAt,
    answers: session.answers,
  }
}
