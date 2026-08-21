import { Outlet } from 'react-router'
import { useStrings } from '@/i18n/useStrings'
import { useLearnerStore } from '@/storage/useLearnerStore'
import { PasscodeGate } from '@/ui/PasscodeGate'
import { ServiceWorkerNotices } from '@/ui/ServiceWorkerNotices'

interface RootProps {
  /** Set when unreadable stored progress had to be thrown away on startup. */
  readonly discardedReason: string | null
}

export function Root({ discardedReason }: RootProps) {
  const store = useLearnerStore()
  const t = useStrings()

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6">
      {/* A discard is never silent: statistics derived from unreadable state
          must not be shown, so the learner is told the slate was wiped. */}
      {discardedReason !== null && (
        <p className="mb-4 rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm dark:bg-warn/15">
          {t.storage.discarded}
        </p>
      )}

      {!store.isPersistent && (
        <p className="mb-4 rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm dark:bg-warn/15">
          {t.storage.unavailable}
        </p>
      )}

      <PasscodeGate>
        <ServiceWorkerNotices />

        <main className="grow">
          <Outlet />
        </main>
      </PasscodeGate>
    </div>
  )
}
