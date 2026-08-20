import { useState } from 'react'
import type { ReactNode } from 'react'
import { useStrings } from '@/i18n/useStrings'
import { useLearnerState, useLearnerStore } from '@/storage/useLearnerStore'

/**
 * A build-time passcode, baked into the bundle by the deploy workflow.
 *
 * This is a facade, not a lock: the source and every question are still
 * reachable at their own URLs once someone has the passcode, and the passcode
 * itself sits in plain text in the shipped JS. It exists only to keep a casual
 * visitor from landing on the app; it is not a substitute for the repository
 * being private. See research.md for the real access-control plan.
 *
 * Undefined in local dev (no env var set), so nothing here gets in the way of
 * working on the app.
 */
const PASSCODE: string | undefined = import.meta.env.VITE_APP_PASSCODE

interface PasscodeGateProps {
  readonly children: ReactNode
}

export function PasscodeGate({ children }: PasscodeGateProps) {
  const store = useLearnerStore()
  const state = useLearnerState()
  const t = useStrings()
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(false)

  if (!PASSCODE || state.settings.unlocked) return children

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (value === PASSCODE) {
          store.unlock()
        } else {
          setWrong(true)
          setValue('')
        }
      }}
      className="flex grow flex-col items-center justify-center gap-3 px-4 py-10"
    >
      <p className="text-lg font-medium">{t.gate.prompt}</p>
      <input
        autoFocus
        type="password"
        inputMode="text"
        value={value}
        placeholder={t.gate.placeholder}
        onChange={(e) => {
          setValue(e.target.value)
          setWrong(false)
        }}
        className="w-56 rounded-lg border border-slate-400 px-3 py-2 text-center dark:border-slate-500"
      />
      {wrong && <p className="text-sm text-bad">{t.gate.wrong}</p>}
      <button
        type="submit"
        className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white dark:bg-slate-100 dark:text-slate-900"
      >
        {t.gate.submit}
      </button>
    </form>
  )
}
