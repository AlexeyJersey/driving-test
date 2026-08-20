import { stringsFor } from './strings'
import type { Strings } from './strings'
import { useLearnerState } from '@/storage/useLearnerStore'

/** The active dictionary, following the learner's stored preference. */
export function useStrings(): Strings {
  return stringsFor(useLearnerState().settings.uiLanguage)
}
