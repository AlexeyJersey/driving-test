import { describe, expect, it } from 'vitest'
import { MASTERY_STREAK } from './constants'
import {
  answeredCorrectly,
  applyAnswer,
  isAttempted,
  isMastered,
  isMistake,
  mistakeIds,
} from './progress'
import type { Question } from './question'
import type { QuestionProgress } from '@/storage/types'

const AT = '2026-08-20T10:00:00.000Z'

/** Replays a sequence of right/wrong answers from nothing. */
const replay = (...outcomes: boolean[]): QuestionProgress | undefined => {
  let p: QuestionProgress | undefined
  for (const ok of outcomes) p = applyAnswer(p, ok ? 0 : 1, ok, AT)
  return p
}

describe('applyAnswer', () => {
  it('counts the first answer', () => {
    const p = applyAnswer(undefined, 2, true, AT)
    expect(p).toEqual({ attempts: 1, correct: 1, streak: 1, lastChoice: 2, lastAnsweredAt: AT })
  })

  it('accumulates attempts and correct answers', () => {
    const p = replay(true, false, true)
    expect(p?.attempts).toBe(3)
    expect(p?.correct).toBe(2)
  })

  it('resets the streak on a wrong answer', () => {
    expect(replay(true, true, false)?.streak).toBe(0)
  })

  it('remembers the most recent choice', () => {
    expect(applyAnswer(replay(true), 1, false, AT).lastChoice).toBe(1)
  })
})

describe('isMistake', () => {
  it('is false for a question never answered', () => {
    expect(isMistake(undefined)).toBe(false)
  })

  it('is false for a question only ever answered correctly', () => {
    expect(isMistake(replay(true))).toBe(false)
  })

  it('becomes true on a wrong answer', () => {
    expect(isMistake(replay(false))).toBe(true)
  })

  it('stays true after only one correct answer, since one could be a guess', () => {
    expect(MASTERY_STREAK).toBe(2)
    expect(isMistake(replay(false, true))).toBe(true)
  })

  it('becomes false after MASTERY_STREAK correct answers in a row', () => {
    expect(isMistake(replay(false, true, true))).toBe(false)
  })

  it('becomes true again when a later wrong answer resets the streak', () => {
    expect(isMistake(replay(false, true, true, false))).toBe(true)
  })

  it('needs the correct answers to be consecutive', () => {
    expect(isMistake(replay(false, true, false, true))).toBe(true)
  })
})

describe('isAttempted and isMastered', () => {
  it('distinguishes never-answered from answered', () => {
    expect(isAttempted(undefined)).toBe(false)
    expect(isAttempted(replay(false))).toBe(true)
  })

  it('marks a question mastered once the streak reaches the threshold', () => {
    expect(isMastered(replay(true))).toBe(false)
    expect(isMastered(replay(true, true))).toBe(true)
  })
})

describe('mistakeIds', () => {
  const question = (id: string): Question => ({
    id,
    volume: 'IV',
    page: 1,
    category: 'vehicle',
    text: id,
    options: ['a', 'b'],
    correct: 0,
  })

  it('lists only questions that still exist in the bank', () => {
    const bank = [question('a'), question('b')]
    const progress = {
      a: replay(false) as QuestionProgress,
      b: replay(true) as QuestionProgress,
      // Orphaned: the data no longer contains this question.
      gone: replay(false) as QuestionProgress,
    }
    expect(mistakeIds(bank, progress)).toEqual(['a'])
  })
})

describe('answeredCorrectly', () => {
  it('compares the choice against the recorded key', () => {
    const q: Question = {
      id: 'x',
      volume: 'IV',
      page: 1,
      category: 'vehicle',
      text: 'x',
      options: ['a', 'b', 'c'],
      correct: 2,
    }
    expect(answeredCorrectly(q, 2)).toBe(true)
    expect(answeredCorrectly(q, 0)).toBe(false)
  })
})
