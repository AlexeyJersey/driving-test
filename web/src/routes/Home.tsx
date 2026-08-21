import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { content } from '@/content/bundled'
import { isAttempted, mistakeIds } from '@/domain/progress'
import { matchesFilter } from '@/domain/selection'
import { categoryLabel } from '@/i18n/strings'
import { useStrings } from '@/i18n/useStrings'
import { useLearnerState, useLearnerStore } from '@/storage/useLearnerStore'
import { LanguageSelect } from '@/ui/LanguageSwitcher'

const ALL = '__all__'

export function Home() {
  const navigate = useNavigate()
  const store = useLearnerStore()
  const state = useLearnerState()
  const t = useStrings()

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

  // Both counts run over the questions that actually exist, so an orphaned
  // record from a removed question can never push a total past the bank size.
  const attempted = useMemo(
    () => questions.filter((q) => isAttempted(state.progress[q.id])).length,
    [questions, state.progress],
  )
  const mistakes = useMemo(() => mistakeIds(questions, state.progress), [questions, state.progress])

  const active = state.activeSession
  const isEmpty = matching.length === 0

  const seed = () => String(Date.now() % 2147483647)

  const start = () => {
    const params = new URLSearchParams()
    if (category !== ALL) params.set('cat', category)
    if (shuffle) params.set('shuffle', '1')
    params.set('seed', seed())
    navigate(`/study?${params.toString()}`)
  }

  const startMistakes = () => {
    const params = new URLSearchParams({ mode: 'mistakes', seed: seed() })
    navigate(`/study?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{t.appName}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t.appTagline}</p>
        </header>
        <LanguageSelect
          value={state.settings.uiLanguage}
          onChange={(language) => store.setUiLanguage(language)}
          ariaLabel={t.language.label}
        />
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-300">
        {t.home.progressSummary(attempted, questions.length)}
      </p>

      {active !== null && (
        <section className="rounded-lg border border-slate-300 p-4 dark:border-slate-600">
          <h2 className="font-semibold">{t.home.resumeTitle}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t.home.resumeBody(active.position, active.questionIds.length)}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/study?resume=1')}
              className="grow rounded-lg bg-slate-900 px-4 py-2 font-medium text-white dark:bg-slate-100 dark:text-slate-900"
            >
              {t.home.resume}
            </button>
            <button
              type="button"
              onClick={() => store.clearActiveSession()}
              className="rounded-lg border border-slate-300 px-4 py-2 dark:border-slate-600"
            >
              {t.home.discard}
            </button>
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-300 p-4 dark:border-slate-600">
        <h2 className="font-semibold">{t.home.mistakesTitle}</h2>
        {mistakes.length === 0 ? (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.home.mistakesEmpty}</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {t.home.mistakesCount(mistakes.length)}
            </p>
            <button
              type="button"
              onClick={startMistakes}
              className="mt-3 w-full rounded-lg bg-bad px-4 py-2 font-medium text-white"
            >
              {t.home.mistakesStart}
            </button>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">{t.home.pickTopic}</h2>
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
                {key === ALL ? t.home.allTopics : categoryLabel(t, key)} · {count}
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
          {t.home.shuffle}
        </label>
      </section>

      {isEmpty ? (
        <p className="rounded-lg border border-slate-300 px-3 py-4 text-sm dark:border-slate-600">
          {t.home.emptySelection}
        </p>
      ) : (
        <button
          type="button"
          onClick={start}
          className="rounded-lg bg-slate-900 px-4 py-4 text-lg font-medium text-white dark:bg-slate-100 dark:text-slate-900"
        >
          {t.home.startStudy} · {t.home.questionsAvailable(matching.length)}
        </button>
      )}
    </div>
  )
}
