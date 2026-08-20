import { LANGUAGE_LABELS, LANGUAGE_NAMES, UI_LANGUAGES } from '@/i18n/strings'
import { useStrings } from '@/i18n/useStrings'
import { useLearnerState, useLearnerStore } from '@/storage/useLearnerStore'

/**
 * Switches the chrome only. Question text, options, and answer keys are the same
 * in every language, because they are what the exam is written in.
 */
export function LanguageSwitcher() {
  const store = useLearnerStore()
  const current = useLearnerState().settings.uiLanguage
  const strings = useStrings()

  return (
    <div className="flex items-center gap-1" role="group" aria-label={strings.language.label}>
      {UI_LANGUAGES.map((language) => {
        const active = language === current
        return (
          <button
            key={language}
            type="button"
            aria-pressed={active}
            title={LANGUAGE_NAMES[language]}
            onClick={() => store.setUiLanguage(language)}
            className={[
              'rounded-md px-2 py-1 text-xs font-semibold',
              active
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
            ].join(' ')}
          >
            {LANGUAGE_LABELS[language]}
          </button>
        )
      })}
    </div>
  )
}
