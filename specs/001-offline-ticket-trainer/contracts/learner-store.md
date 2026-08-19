# Contract: LearnerStore

The single path to persisted learner state (Constitution Principle II). No component calls
`localStorage`, or any storage API, directly.

## Interface

```ts
interface LearnerStore {
  getState(): LearnerState;
  subscribe(listener: () => void): () => void;   // for useSyncExternalStore

  recordAnswer(questionId: QuestionId, choice: number, wasCorrect: boolean): void;
  toggleBookmark(questionId: QuestionId): void;

  saveActiveSession(session: ActiveSession): void; // in-flight, written on every answer
  clearActiveSession(): void;
  saveSession(record: SessionRecord): void;        // completed; trims to MAX_SESSION_HISTORY

  reset(): void;                                  // deliberate wipe, confirmed by the caller

  readonly isPersistent: boolean;                 // false when device storage is unavailable
}
```

`recordAnswer` takes `wasCorrect` rather than deriving it, so the store never needs to know what
the correct answer is. Correctness is decided in `domain/`, against content from the
`ContentProvider`; the store's job is to remember, not to judge.

## Implementations

- **`LocalLearnerStore`** — one versioned key in `localStorage`, one JSON document, written on
  every mutation. Reads are synchronous, so the first render already shows real progress.
- **`MemoryLearnerStore`** — the fallback when storage throws or is unavailable, as in some
  private-browsing modes. Every study flow works; nothing survives a reload. `isPersistent` is
  `false`, and the interface exposes that so the app can tell the learner rather than pretending
  (FR-020).

## Session continuity

A mobile browser may discard the page at any time — backgrounding the app is enough. The active
session is therefore written on every answer, not on navigation, and holds its resolved
`questionIds` rather than a filter to re-evaluate. That distinction matters for the mistakes
drill: its membership changes as the learner answers, so recomputing the set on resume would
hand back a different, shorter set mid-session.

## Versioning and migration

The stored document carries `version`. On load: matching version is used as is; an older version
is migrated if a migration exists, otherwise discarded; an unparseable document is discarded.
Discards are always clean and always surfaced — statistics derived from unreadable state must
never be shown (FR-021).

## Concurrency

Two open tabs each hold the document in memory and each write it whole, so the last write wins
and the other tab's changes are lost. This is accepted rather than solved: the app is for one
learner on one device, and the realistic multi-tab case is an accidental duplicate rather than
deliberate parallel study. Should it ever matter, the fix is to listen for the storage event and
re-read — a change confined to `LocalLearnerStore`, which is what this boundary is for.

## Guarantees

- Every mutation persists before returning, so closing the app mid-session cannot lose answers
  already given, nor the learner's position in the set.
- `saveSession` trims `sessions` to `MAX_SESSION_HISTORY`, so the document cannot grow without
  bound.
- `toggleBookmark` never touches `progress`, and `recordAnswer` never touches `bookmarks`.
- `reset` is the only operation that destroys data, and the store does not confirm — the caller
  must (FR-016).
- Nothing is transmitted anywhere. There is no network code in any implementation (FR-022).

## What this boundary buys later

Accounts mean learner state living on a server, keyed by user. That is another implementation of
this interface — likely with async methods and a sync policy. Keeping `LearnerState` a single
document that already carries an `owner` slot is what makes that a replacement rather than a
migration of meaning.

Per Constitution v1.1.0, this release ships no remote implementation, no auth, and no unused
`owner` handling beyond the constant `"local"`.
