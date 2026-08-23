import { describe, expect, it } from 'vitest'
import type { OrderQuestion } from './question'
import { orderTokens } from './question'

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

  it('offers only the vehicles the answer names, not a synthesized 1..N run', () => {
    // Four vehicles pictured, but only two are asked about — the tokens must
    // be "1" and "4", the vehicles named, not "1" and "2".
    expect(orderTokens(order('1 4'))).toEqual(['1', '4'])
    expect(orderTokens(order('4 3'))).toEqual(['3', '4'])
  })
})
