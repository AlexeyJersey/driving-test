import { Outlet } from 'react-router'
import { ui } from '@/i18n/strings'
import { useLearnerStore } from '@/storage/useLearnerStore'

interface RootProps {
  /** Set when unreadable stored progress had to be thrown away on startup. */
  readonly discardedReason: string | null
}

export function Root({ discardedReason }: RootProps) {
  const store = useLearnerStore()

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6">
      {/* A discard is never silent: statistics derived from unreadable state
          must not be shown, so the learner is told the slate was wiped. */}
      {discardedReason !== null && (
        <p className="mb-4 rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm dark:bg-warn/15">
          {ui.storage.discarded}
        </p>
      )}

      {!store.isPersistent && (
        <p className="mb-4 rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm dark:bg-warn/15">
          {ui.storage.unavailable}
        </p>
      )}

      <main className="grow">
        <Outlet />
      </main>
    </div>
  )
}
