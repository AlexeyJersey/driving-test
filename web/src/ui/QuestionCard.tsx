import type { AnswerValue, ChoiceQuestion, OrderQuestion, Question } from '@/domain/question'
import { isDisputed, normaliseOrder, orderTokens } from '@/domain/question'
import { useStrings } from '@/i18n/useStrings'

interface QuestionCardProps {
  readonly question: Question
  /** Picked but not yet submitted. */
  readonly selected: AnswerValue | null
  /** The submitted answer, or null while the question is unanswered. */
  readonly answeredValue: AnswerValue | null
  readonly onSelect: (value: AnswerValue) => void
}

type Tone = 'idle' | 'selected' | 'correct' | 'wrong'

const TONE_CLASS: Record<Tone, string> = {
  idle: 'border-slate-200 dark:border-slate-700',
  selected: 'border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800',
  correct: 'border-ok bg-ok-soft dark:bg-ok/20 text-slate-900 dark:text-slate-50',
  wrong: 'border-bad bg-bad-soft dark:bg-bad/20 text-slate-900 dark:text-slate-50',
}

const MARK: Record<Tone, string> = { idle: '', selected: '', correct: '✓', wrong: '✗' }

/**
 * Nothing distinguishes the correct answer until a choice has been submitted.
 * That is the entire advantage over the source slides, whose answer marks are
 * always visible.
 */
function toneFor(index: number, correct: number, selected: AnswerValue | null, answered: AnswerValue | null): Tone {
  if (answered === null) return index === selected ? 'selected' : 'idle'
  if (index === correct) return 'correct'
  if (index === answered) return 'wrong'
  return 'idle'
}

function ChoiceOptions({ question, selected, answeredValue, onSelect }: QuestionCardProps & { question: ChoiceQuestion }) {
  const answered = answeredValue !== null
  return (
    <ul className="flex flex-col gap-2">
      {question.options.map((option, index) => {
        const tone = toneFor(index, question.correct, selected, answeredValue)
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
  )
}

/**
 * The learner arranges the vehicle numbers marked on the photograph. The source
 * prints no options for these, so there are none to show.
 */
function OrderInput({ question, selected, answeredValue, onSelect }: QuestionCardProps & { question: OrderQuestion }) {
  const answered = answeredValue !== null
  const tokens = orderTokens(question)
  const current = typeof selected === 'string' ? selected.split('') : []
  const shown = answered && typeof answeredValue === 'string' ? answeredValue.split('') : current
  const correctTokens = normaliseOrder(question.answer).split('')
  const isRight = answered && normaliseOrder(String(answeredValue)) === normaliseOrder(question.answer)

  const append = (token: string) => {
    if (answered || current.includes(token)) return
    onSelect([...current, token].join(''))
  }
  const removeLast = () => {
    if (answered || current.length === 0) return
    onSelect(current.slice(0, -1).join(''))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {tokens.map((_, slot) => {
          const filled = shown[slot]
          const tone: Tone = !answered ? (filled ? 'selected' : 'idle') : isRight ? 'correct' : 'wrong'
          return (
            <span
              key={slot}
              className={[
                'flex size-11 items-center justify-center rounded-lg border text-lg font-semibold tabular-nums',
                TONE_CLASS[tone],
              ].join(' ')}
            >
              {filled ?? ''}
            </span>
          )
        })}
        {!answered && current.length > 0 && (
          <button
            type="button"
            onClick={removeLast}
            aria-label="⌫"
            className="ml-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600"
          >
            ⌫
          </button>
        )}
      </div>

      {!answered && (
        <div className="flex flex-wrap gap-2">
          {tokens.map((token) => (
            <button
              key={token}
              type="button"
              disabled={current.includes(token)}
              onClick={() => append(token)}
              className="size-11 rounded-lg border border-slate-300 text-lg font-semibold tabular-nums disabled:opacity-30 dark:border-slate-600"
            >
              {token}
            </button>
          ))}
        </div>
      )}

      {answered && !isRight && (
        <p className="flex items-center gap-2 text-sm">
          <span className="text-slate-600 dark:text-slate-300">✓</span>
          <span className="font-semibold tabular-nums text-ok">{correctTokens.join(' ')}</span>
        </p>
      )}
    </div>
  )
}

export function QuestionCard(props: QuestionCardProps) {
  const { question, answeredValue } = props
  const t = useStrings()
  const answered = answeredValue !== null
  const wasCorrect =
    question.kind === 'order'
      ? typeof answeredValue === 'string' &&
        normaliseOrder(answeredValue) === normaliseOrder(question.answer)
      : answeredValue === question.correct

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
        // Capped by height, not forced to the card's full width: a handful of
        // these crops (a traffic-light pole, a standing officer) are narrow
        // and tall, and stretching them to card width blows them up into a
        // blurry, screen-filling mess. Capping height and letting width
        // follow the aspect ratio leaves normal wide photos untouched, since
        // max-w-full binds first for those.
        <img
          src={question.imageUrl}
          alt=""
          className="mx-auto block max-h-[50vh] max-w-full rounded-lg border border-slate-200 dark:border-slate-700"
        />
      )}

      <p className="text-lg leading-snug font-medium text-balance">{question.text}</p>

      {question.kind === 'order' ? (
        <OrderInput {...props} question={question} />
      ) : (
        <ChoiceOptions {...props} question={question} />
      )}

      {answered && (
        <p className="text-sm font-medium">
          {wasCorrect ? (
            <span className="text-ok">{t.study.correct}</span>
          ) : (
            <span className="text-bad">{t.study.wrong}</span>
          )}
        </p>
      )}
    </div>
  )
}
