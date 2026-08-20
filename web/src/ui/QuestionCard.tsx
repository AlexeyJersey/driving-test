import type { Question } from '@/domain/question'
import { isDisputed } from '@/domain/question'
import { useStrings } from '@/i18n/useStrings'

interface QuestionCardProps {
  readonly question: Question
  /** The option the learner has picked but not yet submitted. */
  readonly selected: number | null
  /** The submitted choice, or null while the question is unanswered. */
  readonly answeredChoice: number | null
  readonly onSelect: (index: number) => void
}

type OptionTone = 'idle' | 'selected' | 'correct' | 'wrong'

/**
 * Decides how one option looks.
 *
 * The load-bearing rule is that nothing distinguishes the correct option until a
 * choice has been submitted — that is the entire advantage over the source
 * slides, whose answer marks are always visible.
 */
function toneFor(
  index: number,
  correct: number,
  selected: number | null,
  answeredChoice: number | null,
): OptionTone {
  if (answeredChoice === null) return index === selected ? 'selected' : 'idle'
  if (index === correct) return 'correct'
  if (index === answeredChoice) return 'wrong'
  return 'idle'
}

const TONE_CLASS: Record<OptionTone, string> = {
  idle: 'border-slate-200 dark:border-slate-700',
  selected: 'border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800',
  correct: 'border-ok bg-ok-soft dark:bg-ok/20 text-slate-900 dark:text-slate-50',
  wrong: 'border-bad bg-bad-soft dark:bg-bad/20 text-slate-900 dark:text-slate-50',
}

const MARK: Record<OptionTone, string> = {
  idle: '',
  selected: '',
  correct: '✓',
  wrong: '✗',
}

export function QuestionCard({ question, selected, answeredChoice, onSelect }: QuestionCardProps) {
  const t = useStrings()
  const answered = answeredChoice !== null

  return (
    <div className="flex flex-col gap-4">
      {isDisputed(question) && (
        <div
          role="note"
          className="rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm dark:bg-warn/15"
        >
          <strong className="block font-semibold">⚠ {t.study.disputedTitle}</strong>
          <span className="text-slate-700 dark:text-slate-200">{t.study.disputedBody}</span>
        </div>
      )}

      {question.imageUrl !== undefined && (
        <img
          src={question.imageUrl}
          alt=""
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700"
        />
      )}

      <p className="text-lg leading-snug font-medium text-balance">{question.text}</p>

      <ul className="flex flex-col gap-2">
        {question.options.map((option, index) => {
          const tone = toneFor(index, question.correct, selected, answeredChoice)
          return (
            <li key={index}>
              <button
                type="button"
                disabled={answered}
                aria-pressed={index === selected}
                onClick={() => onSelect(index)}
                className={[
                  'flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left',
                  'transition-colors disabled:cursor-default',
                  TONE_CLASS[tone],
                ].join(' ')}
              >
                <span className="min-w-4 pt-0.5 text-center font-semibold tabular-nums">
                  {MARK[tone] || index + 1}
                </span>
                <span className="grow">{option}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {answered && (
        <p className="text-sm font-medium">
          {answeredChoice === question.correct ? (
            <span className="text-ok">{t.study.correct}</span>
          ) : (
            <span className="text-bad">{t.study.wrong}</span>
          )}
        </p>
      )}
    </div>
  )
}
