import { describe, expect, it } from 'vitest'
import type { OrderQuestion } from './question'
import { orderSlots, orderTokens } from './question'

const order = (answer: string): OrderQuestion => ({
  id: 'II-1-1',
  volume: 'II',
  page: 1,
  category: 'situations',
  text: '',
  kind: 'order',
  answer,
})

describe('orderTokens', () => {
  it('offers every vehicle when the answer orders all of them', () => {
    expect(orderTokens(order('3 1 2'))).toEqual(['1', '2', '3'])
  })

  it('offers every pictured vehicle when only some of them may pass', () => {
    // Four vehicles pictured, only two allowed through: picking which two is
    // half the question, so all four must be on offer.
    expect(orderTokens(order('1 4'))).toEqual(['1', '2', '3', '4'])
    expect(orderTokens(order('4 3'))).toEqual(['1', '2', '3', '4'])
  })
})

describe('orderSlots', () => {
  it('gives one slot per vehicle the answer places, not per token offered', () => {
    expect(orderSlots(order('3 1 2'))).toBe(3)
    expect(orderSlots(order('1 4'))).toBe(2)
  })
})
