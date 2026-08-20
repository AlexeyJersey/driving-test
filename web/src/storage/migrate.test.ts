import { describe, expect, it } from 'vitest'
import { readStoredState } from './migrate'
import { LEARNER_STATE_VERSION } from './types'

const NOW = '2026-08-20T10:00:00.000Z'
const read = (raw: string | null) => readStoredState(raw, NOW)

const progressEntry = (over: Record<string, unknown> = {}) => ({
  attempts: 3,
  correct: 2,
  streak: 1,
  lastChoice: 0,
  lastAnsweredAt: NOW,
  ...over,
})

const doc = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    version: LEARNER_STATE_VERSION,
    owner: 'local',
    progress: { 'IV-1-1': progressEntry() },
    bookmarks: ['IV-1-2'],
    sessions: [],
    activeSession: null,
    updatedAt: NOW,
    ...over,
  })

const filter = { volumes: null, categories: null, shuffle: false, seed: 42 }

describe('readStoredState', () => {
  it('treats a missing or blank document as a fresh start', () => {
    expect(read(null)).toEqual({ kind: 'empty' })
    expect(read('   ')).toEqual({ kind: 'empty' })
  })

  it('discards unreadable JSON rather than throwing', () => {
    const out = read('{not json')
    expect(out.kind).toBe('discarded')
  })

  it('discards a document that is not an object', () => {
    expect(read('[]').kind).toBe('discarded')
    expect(read('"nope"').kind).toBe('discarded')
  })

  it('discards an unknown format version and says which it found', () => {
    const out = read(doc({ version: 99 }))
    expect(out.kind).toBe('discarded')
    if (out.kind === 'discarded') expect(out.reason).toContain('99')
  })

  it('reads a current document', () => {
    const out = read(doc())
    expect(out.kind).toBe('current')
    if (out.kind !== 'current') return
    expect(out.state.progress['IV-1-1']?.attempts).toBe(3)
    expect(out.state.bookmarks).toEqual(['IV-1-2'])
    expect(out.state.owner).toBe('local')
  })

  it('drops one incoherent progress entry without discarding the rest', () => {
    // More correct answers than attempts cannot happen; every statistic derives
    // from this pair, so the record is untrustworthy — but only that record.
    const out = read(
      doc({
        progress: {
          'IV-1-1': progressEntry(),
          'IV-1-2': progressEntry({ attempts: 1, correct: 5 }),
          'IV-1-3': progressEntry({ streak: 9, correct: 1 }),
        },
      }),
    )
    expect(out.kind).toBe('current')
    if (out.kind !== 'current') return
    expect(Object.keys(out.state.progress)).toEqual(['IV-1-1'])
  })

  it('discards when bookmarks are not a list of ids', () => {
    expect(read(doc({ bookmarks: 'IV-1-2' })).kind).toBe('discarded')
    expect(read(doc({ bookmarks: [1, 2] })).kind).toBe('discarded')
  })

  it('keeps a valid active session so it can be resumed', () => {
    const active = {
      id: 's1',
      mode: 'study',
      filter,
      questionIds: ['IV-1-1', 'IV-1-2'],
      position: 1,
      answers: [{ questionId: 'IV-1-1', choice: 2, correct: true }],
      startedAt: NOW,
    }
    const out = read(doc({ activeSession: active }))
    expect(out.kind).toBe('current')
    if (out.kind !== 'current') return
    expect(out.state.activeSession?.position).toBe(1)
    expect(out.state.activeSession?.questionIds).toEqual(['IV-1-1', 'IV-1-2'])
  })

  it('drops a malformed active session but keeps the progress', () => {
    const cases: unknown[] = [
      { id: 's1', mode: 'nope', filter, questionIds: ['a'], position: 0, answers: [], startedAt: NOW },
      { id: 's1', mode: 'study', filter, questionIds: [], position: 0, answers: [], startedAt: NOW },
      { id: 's1', mode: 'study', filter, questionIds: ['a'], position: 7, answers: [], startedAt: NOW },
      { id: 's1', mode: 'study', filter: { shuffle: 'yes', seed: 1 }, questionIds: ['a'], position: 0, answers: [], startedAt: NOW },
      { id: 's1', mode: 'study', filter, questionIds: ['a'], position: 0, answers: [{ questionId: 'a' }], startedAt: NOW },
    ]
    for (const activeSession of cases) {
      const out = read(doc({ activeSession }))
      expect(out.kind).toBe('current')
      if (out.kind !== 'current') continue
      expect(out.state.activeSession).toBeNull()
      expect(Object.keys(out.state.progress)).toEqual(['IV-1-1'])
    }
  })

  it('skips unreadable session records and keeps the readable ones', () => {
    const good = {
      id: 'r1',
      mode: 'mistakes',
      filter,
      startedAt: NOW,
      finishedAt: NOW,
      answers: [{ questionId: 'IV-1-1', choice: 0, correct: false }],
    }
    const out = read(doc({ sessions: [good, { id: 'r2' }, { ...good, mode: 'exam' }] }))
    expect(out.kind).toBe('current')
    if (out.kind !== 'current') return
    expect(out.state.sessions.map((s) => s.id)).toEqual(['r1'])
  })
})
