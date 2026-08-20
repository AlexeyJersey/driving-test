import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { content } from '@/content/bundled'
import { answeredCorrectly } from '@/domain/progress'
import type { Question } from '@/domain/question'
import { selectQuestionIds } from '@/domain/selection'
import type { SelectionFilter } from '@/domain/selection'
import { answerCurrent, currentQuestionId, isFinished, startSession, tally, toRecord } from '@/domain/session'
import { ui } from '@/i18n/strings'
import type { ActiveSession } from '@/storage/types'
import { useLearnerState, useLearnerStore } from '@/storage/useLearnerStore'
import { QuestionCard } from '@/ui/QuestionCard'
import { SetSummary } from '@/ui/SetSummary'

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `s-${String(Date.now())}`

function filterFromParams(params: URLSearchParams): SelectionFilter {
  const cat = params.get('cat')
  return {
    volumes: null,
    categories: cat === null ? null : [cat],
    shuffle: params.get('shuffle') === '1',
    seed: Number(params.get('seed') ?? '1') || 1,
  }
}

export function Study() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const store = useLearnerStore()
  const state = useLearnerState()

  const resuming = params.get('resume') === '1'

  /**
   * Built once, from the URL or from the stored session. Resuming reuses the
   * stored questionIds rather than re-running the filter: a set can change
   * underneath a learner mid-session, which would hand them a different, shorter
   * run than the one they left.
   */
  const [session, setSession] = useState<ActiveSession | null>(() => {
    if (resuming) return state.activeSession
    const filter = filterFromParams(params)
    const ids = selectQuestionIds(content.getAllQuestions(), filter)
    if (ids.length === 0) return null
    return startSession(newId(), 'study', filter, ids, new Date().toISOString())
  })

  const [selected, setSelected] = useState<number | null>(null)
  const [answeredChoice, setAnsweredChoice] = useState<number | null>(null)
  const recorded = useRef(false)

  const question: Question | undefined = useMemo(() => {
    if (!session) return undefined
    const id = currentQuestionId(session)
    return id === undefined ? undefined : content.getQuestion(id)
  }, [session])

  const finished = session !== null && isFinished(session)

  /** Runs the same filter again — what "once more" has to mean to be honest. */
  const restart = (from: ActiveSession) => {
    const ids = selectQuestionIds(content.getAllQuestions(), from.filter)
    recorded.current = false
    setSelected(null)
    setAnsweredChoice(null)
    setSession(
      ids.length === 0
        ? null
        : startSession(newId(), from.mode, from.filter, ids, new Date().toISOString()),
    )
  }

  // Write the completed run exactly once, whichever way this screen unmounts.
  useEffect(() => {
    if (!session || !finished || recorded.current) return
    recorded.current = true
    store.saveSession(toRecord(session, new Date().toISOString()))
  }, [finished, session, store])

  if (session === null) {
    return (
      <div className="flex flex-col gap-4 py-10">
        <p>{ui.home.emptySelection}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-lg border border-slate-300 px-4 py-3 dark:border-slate-600"
        >
          {ui.summary.home}
        </button>
      </div>
    )
  }

  if (finished) {
    return (
      <SetSummary
        tally={tally(session)}
        onRestart={() => restart(session)}
        onHome={() => navigate('/')}
      />
    )
  }

  if (question === undefined) {
    // The stored session points at a question this build no longer contains.
    return (
      <div className="flex flex-col gap-4 py-10">
        <p>{ui.storage.discarded}</p>
        <button
          type="button"
          onClick={() => {
            store.clearActiveSession()
            navigate('/')
          }}
          className="rounded-lg border border-slate-300 px-4 py-3 dark:border-slate-600"
        >
          {ui.summary.home}
        </button>
      </div>
    )
  }

  const submit = () => {
    if (selected === null) return
    const wasCorrect = answeredCorrectly(question, selected)
    setAnsweredChoice(selected)
    // Progress and position are both written now, so closing the app while the
    // feedback is on screen loses neither the answer nor the place.
    store.recordAnswer(question.id, selected, wasCorrect)
    store.saveActiveSession(answerCurrent(session, selected, wasCorrect))
  }

  const advance = () => {
    if (answeredChoice === null) return
    setSession(answerCurrent(session, answeredChoice, answeredCorrectly(question, answeredChoice)))
    setSelected(null)
    setAnsweredChoice(null)
  }

  const answered = answeredChoice !== null
  const isLast = session.position === session.questionIds.length - 1

  return (
    <div className="flex flex-col gap-5 pb-24">
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span className="tabular-nums">
          {ui.study.position(session.position + 1, session.questionIds.length)}
        </span>
        <button type="button" onClick={() => navigate('/')} className="underline">
          {ui.study.leave}
        </button>
      </div>

      <QuestionCard
        question={question}
        selected={selected}
        answeredChoice={answeredChoice}
        onSelect={setSelected}
      />

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
        <div className="mx-auto max-w-2xl pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            disabled={!answered && selected === null}
            onClick={answered ? advance : submit}
            className="w-full rounded-lg bg-slate-900 px-4 py-4 text-lg font-medium text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
          >
            {answered ? (isLast ? ui.study.finish : ui.study.next) : ui.study.submit}
          </button>
        </div>
      </div>
    </div>
  )
}
