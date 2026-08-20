import { useState } from 'react'
import type { LastOutcome } from '@/domain/progress'
import { useStrings } from '@/i18n/useStrings'

interface JumpPanelProps {
  readonly total: number
  /** Zero-based index of the question on screen. */
  readonly current: number
  /** How each question in the set went, most recent answer first. */
  readonly outcomes: readonly LastOutcome[]
  readonly onJump: (index: number) => void
  readonly onClose: () => void
}

const TONE: Record<LastOutcome, string> = {
  right: 'border-ok bg-ok-soft text-slate-900 dark:bg-ok/25 dark:text-slate-50',
  wrong: 'border-bad bg-bad-soft text-slate-900 dark:bg-bad/25 dark:text-slate-50',
  untouched: 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400',
}

/**
 * Jump to any question in the set, by number or by tapping it.
 *
 * The grid doubles as the answer map the whole set is missing otherwise: green
 * where the last answer was right, red where it was wrong, plain where the
 * question has not been touched. Those marks come from stored progress rather
 * than from the session, so they survive a reload and a new session and last
 * until progress is reset.
 */
export function JumpPanel({ total, current, outcomes, onJump, onClose }: JumpPanelProps) {
  const t = useStrings()
  const [typed, setTyped] = useState('')

  const go = (index: number) => {
    if (index >= 0 && index < total) onJump(index)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-white dark:bg-slate-950">
      <div className="mx-auto flex w-full max-w-2xl grow flex-col gap-4 overflow-y-auto p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const n = Number.parseInt(typed, 10)
            if (Number.isFinite(n)) go(n - 1)
            else onClose()
          }}
          className="flex items-center gap-2"
        >
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            value={typed}
            aria-label={t.study.jump}
            placeholder={`${String(current + 1)} / ${String(total)}`}
            onChange={(e) => setTyped(e.target.value.replace(/\D/g, ''))}
            className="w-24 rounded-lg border border-slate-400 px-3 py-2 text-center text-lg tabular-nums dark:border-slate-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white dark:bg-slate-100 dark:text-slate-900"
          >
            {t.study.jump}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600"
          >
            {t.study.leave}
          </button>
        </form>

        <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
          {outcomes.map((outcome, index) => (
            <button
              key={index}
              type="button"
              onClick={() => go(index)}
              aria-current={index === current ? 'true' : undefined}
              className={[
                'rounded-md border py-2 text-sm tabular-nums',
                TONE[outcome],
                index === current ? 'ring-2 ring-slate-900 dark:ring-slate-100' : '',
              ].join(' ')}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
