import { LANGUAGE_LABELS, LANGUAGE_NAMES, UI_LANGUAGES } from '@/i18n/strings'
import type { UiLanguage } from '@/i18n/strings'

interface LanguagePickerProps {
  readonly value: UiLanguage
  readonly onChange: (language: UiLanguage) => void
  readonly ariaLabel: string
}

/**
 * The flag-button row itself, with no opinion on which setting it drives. Two
 * independent things in this app happen to need the exact same three-way
 * choice — the interface chrome and, separately, a question's content — and
 * showing up identical in both places is what makes the second one need no
 * explanatory label: a learner who has already used one instance of this
 * understands the other on sight.
 */
function LanguagePicker({ value, onChange, ariaLabel }: LanguagePickerProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={ariaLabel}>
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
              'rounded-md px-2 py-1 text-base leading-none',
              active ? 'opacity-100' : 'opacity-45 hover:opacity-75',
            ].join(' ')}
          >
            {LANGUAGE_LABELS[language]}
          </button>
        )
      })}
    </div>
  )
}

export { LanguagePicker }
