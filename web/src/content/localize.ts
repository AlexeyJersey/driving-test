import { translations } from '@/generated/translations'
import type { Question } from '@/domain/question'
import type { UiLanguage } from '@/i18n/strings'

/**
 * Returns the question as it should be displayed for a given content
 * language. Montenegrin, or any question with no translation for the chosen
 * language, comes back unchanged — the fallback the constitution requires,
 * not an edge case to special-case at call sites.
 *
 * Deliberately outside ContentProvider: that boundary's guarantee is that it
 * never edits, translates, or repairs a question. Localisation is a layer on
 * top of it, not inside it.
 */
export function localizeQuestion(question: Question, language: UiLanguage): Question {
  if (language === 'me') return question
  const entry = translations[language]?.[question.id]
  if (!entry) return question
  if (question.kind === 'order') {
    return { ...question, text: entry.text }
  }
  return { ...question, text: entry.text, options: entry.options ?? question.options }
}
