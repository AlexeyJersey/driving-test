import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { content } from '@/content/bundled'
import { isAttempted } from '@/domain/progress'
import { matchesFilter } from '@/domain/selection'
import { categoryLabel, ui } from '@/i18n/strings'
import { useLearnerState, useLearnerStore } from '@/storage/useLearnerStore'

const ALL = '__all__'

export function Home() {
  const navigate = useNavigate()
  const store = useLearnerStore()
  const state = useLearnerState()

  const [category, setCategory] = useState<string>(ALL)
  const [shuffle, setShuffle] = useState(false)

  const questions = content.getAllQuestions()
  const categories = content.getCategories()

  const matching = useMemo(
    () =>
      questions.filter((q) =>
        matchesFilter(q, {
          volumes: null,
          categories: category === ALL ? null : [category],
          shuffle: false,
          seed: 0,
        }),
      ),
    [questions, category],
  )

  // Coverage over the questions that actually exist, so an orphaned progress
  // record from a removed question can never push the count past the total.
  const attempted = useMemo(
    () => questions.filter((q) => isAttempted(state.progress[q.id])).length,
    [questions, state.progress],
  )

  const active = state.activeSession
  const isEmpty = matching.length === 0

  const start = () => {
    const params = new URLSearchParams()
    if (category !== ALL) params.set('cat', category)
    if (shuffle) params.set('shuffle', '1')
    params.set('seed', String(Date.now() % 2147483647))
    navigate(`/study?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{ui.appName}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">{ui.appTagline}</p>
      </header>

      <p className="text-sm text-slate-600 dark:text-slate-300">
        {ui.home.progressSummary(attempted, questions.length)}
      </p>

      {active !== null && (
        <section className="rounded-lg border border-slate-300 p-4 dark:border-slate-600">
          <h2 className="font-semibold">{ui.home.resumeTitle}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {ui.home.resumeBody(active.position, active.questionIds.length)}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/study?resume=1')}
              className="grow rounded-lg bg-slate-900 px-4 py-2 font-medium text-white dark:bg-slate-100 dark:text-slate-900"
            >
              {ui.home.resume}
            </button>
            <button
              type="button"
              onClick={() => store.clearActiveSession()}
              className="rounded-lg border border-slate-300 px-4 py-2 dark:border-slate-600"
            >
              {ui.home.discard}
            </button>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">{ui.home.pickTopic}</h2>
        <div className="flex flex-wrap gap-2">
          {[ALL, ...categories].map((key) => {
            const count =
              key === ALL ? questions.length : questions.filter((q) => q.category === key).length
            const selected = key === category
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                aria-pressed={selected}
                className={[
                  'rounded-full border px-3 py-2 text-sm',
                  selected
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                    : 'border-slate-300 dark:border-slate-600',
                ].join(' ')}
              >
                {key === ALL ? ui.home.allTopics : categoryLabel(key)} · {count}
              </button>
            )
          })}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={shuffle}
            onChange={(e) => setShuffle(e.target.checked)}
            className="size-4"
          />
          Перемешать вопросы
        </label>
      </section>

      {isEmpty ? (
        <p className="rounded-lg border border-slate-300 px-3 py-4 text-sm dark:border-slate-600">
          {ui.home.emptySelection}
        </p>
      ) : (
        <button
          type="button"
          onClick={start}
          className="rounded-lg bg-slate-900 px-4 py-4 text-lg font-medium text-white dark:bg-slate-100 dark:text-slate-900"
        >
          {ui.home.startStudy} · {ui.home.questionsAvailable(matching.length)}
        </button>
      )}
    </div>
  )
}
