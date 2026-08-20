import type { Tally } from '@/domain/session'
import { ui } from '@/i18n/strings'

interface SetSummaryProps {
  readonly tally: Tally
  readonly onRestart: () => void
  readonly onHome: () => void
}

export function SetSummary({ tally, onRestart, onHome }: SetSummaryProps) {
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <h2 className="text-2xl font-semibold">{ui.summary.title}</h2>

      <p className="text-4xl font-bold tabular-nums">
        {ui.summary.score(tally.correct, tally.answered)}
      </p>

      <p className="text-slate-600 dark:text-slate-300">
        {tally.wrong === 0 ? ui.summary.perfect : ui.summary.mistakes(tally.wrong)}
      </p>

      <div className="flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-lg bg-slate-900 px-4 py-3 font-medium text-white dark:bg-slate-100 dark:text-slate-900"
        >
          {ui.summary.again}
        </button>
        <button
          type="button"
          onClick={onHome}
          className="rounded-lg border border-slate-300 px-4 py-3 font-medium dark:border-slate-600"
        >
          {ui.summary.home}
        </button>
      </div>
    </div>
  )
}
