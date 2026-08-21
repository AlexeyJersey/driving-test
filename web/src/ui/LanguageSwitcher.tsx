import { LANGUAGE_LABELS, LANGUAGE_NAMES, UI_LANGUAGES } from '@/i18n/strings'
import type { UiLanguage } from '@/i18n/strings'

interface LanguagePickerProps {
  readonly value: UiLanguage
  readonly onChange: (language: UiLanguage) => void
  readonly ariaLabel: string
}

/**
 * The question's content language: full-width, edge to edge, on a phone —
 * these are the biggest tap targets on the card on purpose, since switching
 * mid-question is a frequent action. Past the sm breakpoint there is no edge
 * to reach for, so the row just centres as a compact group instead.
 */
function LanguagePicker({ value, onChange, ariaLabel }: LanguagePickerProps) {
  return (
    <div
      className="flex w-full items-center justify-between gap-2 sm:w-auto sm:gap-4"
      role="group"
      aria-label={ariaLabel}
    >
      {UI_LANGUAGES.map((language) => {
        const active = language === value
        return (
          <button
            key={language}
            type="button"
            aria-pressed={active}
            aria-label={LANGUAGE_NAMES[language]}
            title={LANGUAGE_NAMES[language]}
            onClick={() => onChange(language)}
            className={[
              'rounded-lg border px-5 py-3 text-2xl leading-none transition-colors',
              active
                ? 'border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800'
                : 'border-slate-200 opacity-60 hover:opacity-100 dark:border-slate-700',
            ].join(' ')}
          >
            {LANGUAGE_LABELS[language]}
          </button>
        )
      })}
    </div>
  )
}

interface LanguageSelectProps {
  readonly value: UiLanguage
  readonly onChange: (language: UiLanguage) => void
  readonly ariaLabel: string
}

/** The interface language: one setting, tucked into a native select rather than a full picker row. */
function LanguageSelect({ value, onChange, ariaLabel }: LanguageSelectProps) {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value as UiLanguage)}
      className="rounded-lg border border-slate-300 bg-transparent px-2 py-1 text-sm dark:border-slate-600"
    >
      {UI_LANGUAGES.map((language) => (
        <option key={language} value={language}>
          {LANGUAGE_LABELS[language]} {LANGUAGE_NAMES[language]}
        </option>
      ))}
    </select>
  )
}

export { LanguagePicker, LanguageSelect }
