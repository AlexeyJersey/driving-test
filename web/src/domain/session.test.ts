import { describe, expect, it } from 'vitest'
import { allQuestionsFilter } from './selection'
import { answerCurrent, currentQuestionId, isFinished, startSession, tally, toRecord } from './session'

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
