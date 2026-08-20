import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { content } from '@/content/bundled'
import { answeredCorrectly, isMistake, lastOutcome } from '@/domain/progress'
import type { AnswerValue, Question } from '@/domain/question'
import { orderTokens } from '@/domain/question'
import { selectQuestionIds } from '@/domain/selection'
import type { SelectionFilter } from '@/domain/selection'
import {
  answerCurrent,
  currentQuestionId,
  isFinished,
  jumpTo,
  startSession,
  tally,
  toRecord,
} from '@/domain/session'
import { useStrings } from '@/i18n/useStrings'
import type { ActiveSession, SessionMode } from '@/storage/types'
import { useLearnerState, useLearnerStore } from '@/storage/useLearnerStore'
import { JumpPanel } from '@/ui/JumpPanel'
import { QuestionCard } from '@/ui/QuestionCard'
import { SetSummary } from '@/ui/SetSummary'

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `s-${String(Date.now())}`

/**
 * Whether a stored session is the same run the URL is asking for.
 *
 * The seed is part of the comparison on purpose: reloading keeps the URL, so the
 * seed matches and the run resumes where it was. Starting again from the home
 * screen mints a new seed, so that correctly begins a new run.
 */
function isSameRun(session: ActiveSession, mode: SessionMode, filter: SelectionFilter): boolean {
  const f = session.filter
  return (
    session.mode === mode &&
    f.shuffle === filter.shuffle &&
    f.seed === filter.seed &&
    JSON.stringify(f.volumes) === JSON.stringify(filter.volumes) &&
    JSON.stringify(f.categories) === JSON.stringify(filter.categories)
  )
}

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

  const t = useStrings()

  const resuming = params.get('resume') === '1'
  const mode: SessionMode = params.get('mode') === 'mistakes' ? 'mistakes' : 'study'

  /**
   * Built once, from the URL or from the stored session. Resuming reuses the
   * stored questionIds rather than re-running the filter: a set can change
   * underneath a learner mid-session, which would hand them a different, shorter
   * run than the one they left.
   */
  const [session, setSession] = useState<ActiveSession | null>(() => {
    if (resuming) return state.activeSession
    const filter = filterFromParams(params)
    // A reload lands here with the same URL; pick the run back up rather than
    // starting it over and losing the learner's place.
    const stored = state.activeSession
    if (stored && isSameRun(stored, mode, filter)) return stored
    // The mistakes set is resolved once, here. It shrinks as the learner answers
    // it, so re-deriving it mid-session would hand back a shorter run than the
    // one they started — which is why the resolved ids go into the session.
    const include =
      mode === 'mistakes'
        ? (q: Question) => isMistake(state.progress[q.id])
        : undefined
    const ids = selectQuestionIds(content.getAllQuestions(), filter, include)
    if (ids.length === 0) return null
    return startSession(newId(), mode, filter, ids, new Date().toISOString())
  })

  const [selected, setSelected] = useState<AnswerValue | null>(null)
  const [answeredValue, setAnsweredValue] = useState<AnswerValue | null>(null)
  const [jumping, setJumping] = useState(false)
  const recorded = useRef(false)

  const question: Question | undefined = useMemo(() => {
    if (!session) return undefined
    const id = currentQuestionId(session)
    return id === undefined ? undefined : content.getQuestion(id)
  }, [session])

  const finished = session !== null && isFinished(session)

  /** Runs the same set again — what "once more" has to mean to be honest. */
  const restart = (from: ActiveSession) => {
    // Deliberately the same questions, not a freshly derived mistakes set: the
    // learner asked to repeat this run, and half of it has just left the set.
    const ids = from.questionIds
    recorded.current = false
    setSelected(null)
    setAnsweredValue(null)
    setSession(startSession(newId(), from.mode, from.filter, ids, new Date().toISOString()))
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
        <p>{t.home.emptySelection}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-lg border border-slate-300 px-4 py-3 dark:border-slate-600"
        >
          {t.summary.home}
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
        <p>{t.storage.discarded}</p>
        <button
          type="button"
          onClick={() => {
            store.clearActiveSession()
            navigate('/')
          }}
          className="rounded-lg border border-slate-300 px-4 py-3 dark:border-slate-600"
        >
          {t.summary.home}
        </button>
      </div>
    )
  }

  /**
   * Coming back to a question — by jumping, or after a reload — shows the answer
   * that was given rather than pretending it is untouched.
   */
  const priorAnswer = session.answers.find((a) => a.questionId === question.id)
  const shownAnswer = answeredValue ?? priorAnswer?.choice ?? null
  const answered = shownAnswer !== null

  const submit = () => {
    if (selected === null || !isComplete) return
    const wasCorrect = answeredCorrectly(question, selected)
    setAnsweredValue(selected)
    // Progress and position are both written now, so closing the app while the
    // feedback is on screen loses neither the answer nor the place.
    store.recordAnswer(question.id, selected, wasCorrect)
    store.saveActiveSession(answerCurrent(session, selected, wasCorrect))
  }

  const jump = (index: number) => {
    const moved = jumpTo(session, index)
    setSession(moved)
    // The position is part of the session, so a jump is worth remembering: come
    // back later and you are where you left off, not where you started.
    store.saveActiveSession(moved)
    setSelected(null)
    setAnsweredValue(null)
  }

  const advance = () => {
    if (shownAnswer === null) return
    setSession(answerCurrent(session, shownAnswer, answeredCorrectly(question, shownAnswer)))
    setSelected(null)
    setAnsweredValue(null)
  }

  /**
   * An order question is only answerable once every vehicle has been placed;
   * a choice question is answerable as soon as an option is picked.
   */
  const isComplete =
    question.kind === 'order'
      ? typeof selected === 'string' && selected.length === orderTokens(question).length
      : selected !== null
  const isLast = session.position === session.questionIds.length - 1

  return (
    <div className="flex flex-col gap-5 pb-24">
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <button
          type="button"
          onClick={() => setJumping(true)}
          title={t.study.jump}
          className="tabular-nums underline decoration-dotted"
        >
          {t.study.position(session.position + 1, session.questionIds.length)}
        </button>
        <button type="button" onClick={() => navigate('/')} className="underline">
          {t.study.leave}
        </button>
      </div>

      <QuestionCard
        question={question}
        selected={selected}
        answeredValue={shownAnswer}
        onSelect={setSelected}
      />

      {jumping && (
        <JumpPanel
          total={session.questionIds.length}
          current={session.position}
          outcomes={session.questionIds.map((id) => lastOutcome(state.progress[id]))}
          onJump={jump}
          onClose={() => setJumping(false)}
        />
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
        <div className="mx-auto max-w-2xl pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            disabled={!answered && !isComplete}
            onClick={answered ? advance : submit}
            className="w-full rounded-lg bg-slate-900 px-4 py-4 text-lg font-medium text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
          >
            {answered ? (isLast ? t.study.finish : t.study.next) : t.study.submit}
          </button>
        </div>
      </div>
    </div>
  )
}
