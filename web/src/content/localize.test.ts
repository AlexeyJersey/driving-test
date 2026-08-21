import { describe, expect, it, vi } from 'vitest'

// The generated bundle does not exist until build-content runs, so the module
// under test is mocked here rather than imported from @/generated/translations.
vi.mock('@/generated/translations', () => ({
  translations: {
    en: {
      'IV-1-1': { text: 'English text', options: ['a', 'b', 'c'] },
      'II-5-1': { text: 'English order text' }, // an order question: no options
    },
    ru: {},
  },
}))

import { localizeQuestion } from './localize'
import type { ChoiceQuestion, OrderQuestion } from '@/domain/question'

const choice: ChoiceQuestion = {
  id: 'IV-1-1',
  kind: 'choice',
  volume: 'IV',
  page: 1,
  category: 'vehicle',
  text: 'Crnogorski tekst',
  options: ['x', 'y', 'z'],
  correct: 2,
}

const order: OrderQuestion = {
  id: 'II-5-1',
  kind: 'order',
  volume: 'II',
  page: 5,
  category: 'situations',
  text: 'Crnogorski tekst',
  answer: '1 3 2',
}

describe('localizeQuestion', () => {
  it('returns the question unchanged for the source language', () => {
    expect(localizeQuestion(choice, 'me')).toBe(choice)
  })

  it('swaps text and options when a translation exists', () => {
    const out = localizeQuestion(choice, 'en') as ChoiceQuestion
    expect(out.text).toBe('English text')
    expect(out.options).toEqual(['a', 'b', 'c'])
  })

  it('never changes the correct-answer index', () => {
    const out = localizeQuestion(choice, 'en') as ChoiceQuestion
    expect(out.correct).toBe(choice.correct)
  })

  it('falls back to the source untouched when no translation exists for that language', () => {
    expect(localizeQuestion(choice, 'ru')).toEqual(choice)
  })

  it('translates only text for an order question, never inventing options', () => {
    const out = localizeQuestion(order, 'en') as OrderQuestion
    expect(out.text).toBe('English order text')
    expect('options' in out).toBe(false)
    expect(out.answer).toBe(order.answer)
  })

  it('falls back to source when the id has no entry at all', () => {
    const untranslated = { ...choice, id: 'IV-9-9' }
    expect(localizeQuestion(untranslated, 'en')).toEqual(untranslated)
  })
})
