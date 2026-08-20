import { describe, expect, it } from 'vitest'
import type { Question } from './question'
import { allQuestionsFilter, matchesFilter, restrictToIds, selectQuestionIds } from './selection'

const q = (id: string, volume: string, category: string): Question => ({
  id,
  volume,
  page: 1,
  category,
  text: `text ${id}`,
  options: ['a', 'b', 'c'],
  correct: 0,
})

const bank: Question[] = [
  q('IV-1-1', 'IV', 'vehicle'),
  q('IV-1-2', 'IV', 'firstaid'),
  q('IV-2-1', 'IV', 'vehicle'),
  q('I-1-1', 'I', 'rules'),
  q('I-1-2', 'I', 'rules'),
]

describe('selectQuestionIds', () => {
  it('keeps source order by default, because a first pass reads better in order', () => {
    expect(selectQuestionIds(bank, allQuestionsFilter(1))).toEqual([
      'IV-1-1',
      'IV-1-2',
      'IV-2-1',
      'I-1-1',
      'I-1-2',
    ])
  })

  it('filters by volume', () => {
    const ids = selectQuestionIds(bank, { volumes: ['I'], categories: null, shuffle: false, seed: 1 })
    expect(ids).toEqual(['I-1-1', 'I-1-2'])
  })

  it('filters by category', () => {
    const ids = selectQuestionIds(bank, {
      volumes: null,
      categories: ['vehicle'],
      shuffle: false,
      seed: 1,
    })
    expect(ids).toEqual(['IV-1-1', 'IV-2-1'])
  })

  it('returns nothing when the filters intersect to nothing', () => {
    const ids = selectQuestionIds(bank, {
      volumes: ['I'],
      categories: ['vehicle'],
      shuffle: false,
      seed: 1,
    })
    expect(ids).toEqual([])
  })

  it('shuffles to the same order for the same seed, so a resumed session matches', () => {
    const filter = { volumes: null, categories: null, shuffle: true, seed: 12345 }
    const first = selectQuestionIds(bank, filter)
    const second = selectQuestionIds(bank, filter)
    expect(second).toEqual(first)
  })

  it('shuffles to a different order for a different seed', () => {
    const a = selectQuestionIds(bank, { volumes: null, categories: null, shuffle: true, seed: 1 })
    const b = selectQuestionIds(bank, { volumes: null, categories: null, shuffle: true, seed: 2 })
    expect(a).not.toEqual(b)
  })

  it('shuffling loses and invents nothing', () => {
    const ids = selectQuestionIds(bank, { volumes: null, categories: null, shuffle: true, seed: 99 })
    expect([...ids].sort()).toEqual(bank.map((x) => x.id).sort())
  })
})

describe('matchesFilter', () => {
  it('treats null as "everything" rather than "nothing"', () => {
    const only = bank[0] as Question
    expect(matchesFilter(only, allQuestionsFilter(1))).toBe(true)
  })
})

describe('restrictToIds', () => {
  it('keeps the given order while dropping ids that are not allowed', () => {
    const ids = ['IV-2-1', 'IV-1-1', 'I-1-1']
    expect(restrictToIds(ids, new Set(['I-1-1', 'IV-2-1']))).toEqual(['IV-2-1', 'I-1-1'])
  })
})
