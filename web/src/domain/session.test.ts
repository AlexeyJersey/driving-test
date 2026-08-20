import { describe, expect, it } from 'vitest'
import { allQuestionsFilter } from './selection'
import {
  answerCurrent,
  currentQuestionId,
  isFinished,
  jumpTo,
  startSession,
  tally,
  toRecord,
} from './session'

const START = '2026-08-20T10:00:00.000Z'
const END = '2026-08-20T10:05:00.000Z'
const ids = ['q1', 'q2', 'q3']
const fresh = () => startSession('s1', 'study', allQuestionsFilter(7), ids, START)

describe('session progression', () => {
  it('starts at the first question with nothing answered', () => {
    const s = fresh()
    expect(currentQuestionId(s)).toBe('q1')
    expect(s.answers).toEqual([])
    expect(isFinished(s)).toBe(false)
  })

  it('advances and records the outcome', () => {
    const s = answerCurrent(fresh(), 1, false)
    expect(currentQuestionId(s)).toBe('q2')
    expect(s.answers).toEqual([{ questionId: 'q1', choice: 1, correct: false }])
  })

  it('is finished once every question has been answered', () => {
    let s = fresh()
    for (const _ of ids) s = answerCurrent(s, 0, true)
    expect(isFinished(s)).toBe(true)
    expect(currentQuestionId(s)).toBeUndefined()
  })

  it('ignores an answer to a finished session instead of throwing', () => {
    let s = fresh()
    for (const _ of ids) s = answerCurrent(s, 0, true)
    const after = answerCurrent(s, 0, true)
    expect(after).toBe(s)
    expect(after.answers).toHaveLength(3)
  })

  it('does not mutate the session it was given', () => {
    const before = fresh()
    answerCurrent(before, 0, true)
    expect(before.position).toBe(0)
    expect(before.answers).toEqual([])
  })
})

describe('jumpTo', () => {
  it('moves to the requested position', () => {
    expect(currentQuestionId(jumpTo(fresh(), 2))).toBe('q3')
  })

  it('clamps to the ends of the set rather than going out of bounds', () => {
    expect(jumpTo(fresh(), 99).position).toBe(2)
    expect(jumpTo(fresh(), -5).position).toBe(0)
  })

  it('returns the same session when already there', () => {
    const s = fresh()
    expect(jumpTo(s, 0)).toBe(s)
  })

  it('keeps answers already given', () => {
    const s = answerCurrent(fresh(), 1, true)
    expect(jumpTo(s, 0).answers).toHaveLength(1)
  })
})

describe('answering a question twice', () => {
  it('replaces the earlier answer instead of adding another', () => {
    // Jump back over an answered question and answer it differently.
    let s = answerCurrent(fresh(), 0, true)
    s = jumpTo(s, 0)
    s = answerCurrent(s, 2, false)
    expect(s.answers).toHaveLength(1)
    expect(s.answers[0]).toEqual({ questionId: 'q1', choice: 2, correct: false })
  })

  it('never reports more answers than the set holds', () => {
    let s = fresh()
    for (let i = 0; i < 10; i += 1) {
      s = answerCurrent(jumpTo(s, i % 3), 0, true)
    }
    expect(tally(s).answered).toBeLessThanOrEqual(tally(s).total)
  })
})

describe('tally', () => {
  it('counts right and wrong against the size of the set', () => {
    let s = fresh()
    s = answerCurrent(s, 0, true)
    s = answerCurrent(s, 1, false)
    expect(tally(s)).toEqual({ answered: 2, correct: 1, wrong: 1, total: 3 })
  })

  it('reports an untouched session as nothing answered', () => {
    expect(tally(fresh())).toEqual({ answered: 0, correct: 0, wrong: 0, total: 3 })
  })
})

describe('toRecord', () => {
  it('carries the answers and both timestamps into the record', () => {
    const s = answerCurrent(fresh(), 2, true)
    const record = toRecord(s, END)
    expect(record.id).toBe('s1')
    expect(record.mode).toBe('study')
    expect(record.startedAt).toBe(START)
    expect(record.finishedAt).toBe(END)
    expect(record.answers).toHaveLength(1)
  })
})
