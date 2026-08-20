import { useRegisterSW } from 'virtual:pwa-register/react'
import { useStrings } from '@/i18n/useStrings'

/**
 * Tells the learner two things the app cannot otherwise show: that it is now
 * usable without a connection, and that a newer version is waiting.
 *
 * The second matters more than it looks. A precaching service worker that never
 * offers to update is the classic way a static app gets stuck on an old build
 * forever — the exact failure that justified using the plugin rather than
 * hand-writing the worker.
 */
export function ServiceWorkerNotices() {
  const t = useStrings()
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!offlineReady && !needRefresh) return null

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600"
    >
      <span>{needRefresh ? t.pwa.updateReady : t.pwa.offlineReady}</span>
      {needRefresh && (
        <button
          type="button"
          onClick={() => void updateServiceWorker(true)}
          className="rounded-md bg-slate-900 px-3 py-1 font-medium text-white dark:bg-slate-100 dark:text-slate-900"
        >
          {t.pwa.reload}
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setOfflineReady(false)
          setNeedRefresh(false)
        }}
        className="ml-auto underline"
      >
        {t.pwa.dismiss}
      </button>
    </div>
  )
}
