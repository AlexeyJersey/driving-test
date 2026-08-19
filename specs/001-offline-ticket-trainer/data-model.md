# Phase 1 Data Model: Offline Driving-Ticket Trainer

Two bodies of data meet in this app and must never be confused: **content**, which is generated
outside the app and is read-only (Principle III), and **learner state**, which the app owns and
persists on the device (Principle II). Nothing in content is written by the app; nothing in
learner state is shipped in the build.

## Content

### Question

The unit of study. Produced by the pipeline, validated at build time, never mutated at runtime.

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `id` | string | yes | Unique across the whole bank, and permanent. Format `<volume>-<page>-<index>`, e.g. `IV-4-5`. See **Identifier stability** below — this format is positional, which makes it readable and traceable but fragile under re-extraction. |
| `volume` | string | yes | Roman numeral of the source deck. Establishes provenance (FR-030). |
| `page` | integer | yes | Slide number within the volume. With `volume`, locates the source render for verification (Principle I). |
| `category` | string | yes | Topic key used for filtering and per-topic accuracy. |
| `text` | string | yes | Question text in Montenegrin, verbatim from source (FR-001). Non-empty. |
| `options` | string[] | yes | Ordered answer options, verbatim. At least two, each non-empty. Order is meaningful: `correct` indexes into it. |
| `correct` | integer | yes | Zero-based index into `options`. Must be in range. |
| `image` | string \| null | no | Filename of an accompanying illustration, for volumes whose questions reference a picture (FR-007). Absent or null means a text-only question. |
| `review` | string | no | Present **only** when the extracted answer key is disputed or unverified. Its presence is what the app surfaces as a warning (FR-004); its text explains the doubt. Removing it is how a resolved dispute stops warning. |
| `note` | string | no | Editorial remark about the record that is **not** a doubt about the answer — most often that a typo in the source text was corrected. Never surfaced as a warning (FR-004). Kept separate from `review` because a warning that fires where nothing is wrong trains the learner to ignore warnings. |

**Invariants enforced by the build-time validator** (FR-028), each failing the build with the
offending id:

- `id` unique across all volumes.
- `correct` an integer in `[0, options.length)`.
- `options.length >= 2`, no empty option strings.
- `text` non-empty.
- `volume` and `page` present — provenance is not optional, because Principle I depends on it.
- `image`, when present, names a file that exists at `data/images/<volume>/<image>`.
- `review` and `note`, when present, are non-empty strings.
- No existing `id` denotes different content than it did in the previous revision of the data
  (see **Identifier stability**).

### Identifier stability

Learner progress is keyed by question id, so an id must denote the same question forever. The
chosen format is positional — volume, slide, index on the slide — which is what makes an id
traceable back to a slide for verification, and is also its weakness: if a re-extraction of a
volume adds or drops one question on a slide, every later index on that slide shifts by one.
Nothing about the resulting file is malformed. Ids stay unique, `correct` stays in range, the
build passes — and a learner's history silently reattaches to different questions.

The rules that prevent this:

- Ids are allocated once and never reused for different content.
- Regeneration MUST diff against the current `data/` and refuse to write when an existing id
  would come to denote a different question.
- A question discovered on re-extraction receives a new id; it never displaces an existing one
  by renumbering. Where a positional slot is genuinely new, a suffixed index is used rather than
  shifting its neighbours.
- Removing a question retires its id permanently.

This check belongs to the pipeline rather than to the application's validator, because the
application never sees the previous revision. The validator can only confirm the file is
well-formed; only a diff against the prior data can confirm it means the same thing.

**Explicitly absent**: any translated text. Translation, when it arrives, is a separate artifact
keyed by question id (Principle IV), and its absence must leave the app fully working.

### Volume

Not a stored record — a grouping derived from the set of question data files present. The app
reads whatever volumes exist and reports totals over them (FR-006). Adding a volume is adding a
file; no code changes (SC-008).

### Category

Not a stored record — the distinct `category` values found in the loaded questions, with display
labels held in `src/i18n` rather than in content, so interface language stays separable from
question language (Principle IV). Naming: the spec calls this concept *Topic*; in data and code
it is the `category` field. They are the same thing — the spec speaks the learner's language,
the data speaks the pipeline's.

## Learner State

One document, owned by `LearnerStore`, persisted under a single versioned key. Shaped so it
could later belong to an identified user without changing the meaning of any field
(Principle II).

### LearnerState

| Field | Type | Notes |
|-------|------|-------|
| `version` | integer | Schema version of this document. Drives migration or clean reset (FR-021). |
| `owner` | `"local"` | Always `"local"` in this release. The slot exists so attaching a user identity later is additive rather than a redefinition. No account logic reads it. |
| `progress` | `Record<questionId, QuestionProgress>` | Per-question aggregates. Absent key means never attempted. |
| `bookmarks` | questionId[] | Independent of answer history (FR-013). |
| `sessions` | SessionRecord[] | Completed sessions, newest first, capped at `MAX_SESSION_HISTORY`. |
| `activeSession` | ActiveSession \| null | The in-flight session, if any, so it can be resumed after the page is discarded (FR-031). |
| `updatedAt` | ISO timestamp | Last write. |

### QuestionProgress

Per-question aggregate, deliberately not an event log (research.md §8).

| Field | Type | Notes |
|-------|------|-------|
| `attempts` | integer | Total answers submitted for this question. Sums to "answers given". |
| `correct` | integer | How many of those were right. |
| `streak` | integer | Consecutive correct answers ending now. Zero after any wrong answer. |
| `lastChoice` | integer | Index of the option chosen most recently. |
| `lastAnsweredAt` | ISO timestamp | Used for ordering and for future recency features. |

**Derived, never stored** — computing rather than storing these is what keeps the two views from
disagreeing:

- *Attempted*: `attempts > 0`. Coverage is the count of attempted questions over total available
  (FR-014, FR-015).
- *Orphaned progress*: a `progress` entry whose id is absent from the current bank — a question
  that a later data revision dropped. Every statistic is computed over the intersection of
  `progress` and the loaded questions, so orphans are ignored rather than counted (FR-032).
  Without this rule, coverage could exceed the number of questions that exist. Orphans are kept
  rather than deleted, since a question removed by mistake and restored later should bring its
  history back with it.
- *Mistake set membership*: has been answered wrong at least once (`attempts > correct`) **and**
  `streak < MASTERY_STREAK`. A question leaves the set the moment its streak reaches the
  threshold (FR-010) and re-enters when a wrong answer resets it (FR-011).
- *Accuracy*: `correct / attempts`, overall and grouped by category.

### SessionRecord

A finished run through a selected set. Stored so statistics and, later, exam history have
something to report; capped so storage cannot grow without bound.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Session identifier. |
| `mode` | `"study"` \| `"mistakes"` \| `"bookmarks"` | The selection that produced the set. Exam mode will add a value here — the shape does not change (FR-023). |
| `filter` | object | What was selected: volumes, categories, shuffle flag, and the shuffle seed. |
| `startedAt` / `finishedAt` | ISO timestamp | |
| `answers` | `{ questionId, choice, correct }[]` | Per-answer outcomes, which is exactly what a scored exam needs later. |

### ActiveSession

The in-flight session, persisted on every answer so that a browser discarding the page loses
nothing (FR-031).

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Becomes the `SessionRecord` id when the session finishes. |
| `mode` | same as `SessionRecord.mode` | |
| `filter` | object | Including the shuffle seed, which is what makes the resumed order identical (research §7). |
| `questionIds` | questionId[] | The resolved set, stored rather than recomputed — the mistakes set changes as the learner answers, so recomputing it on resume would produce a different set mid-session. |
| `position` | integer | Index into `questionIds` of the next unanswered question. |
| `answers` | `{ questionId, choice, correct }[]` | Answers given so far in this session. |

On completion it is written to `sessions` as a `SessionRecord` and cleared. There is at most one
active session; starting a new one replaces it.

### Bookmark

Just a question id in `bookmarks`. Adding or removing one must not touch `progress`
(FR-013 acceptance 2).

## Ephemeral (not persisted)

### QuestionSet

The ordered list of question ids a session will ask, produced by `domain/selection.ts` from a
filter. Separating *what to ask* from *how to ask it* is the exam-mode seam: a timed, scored
session is a different policy over the same `QuestionSet`.

### Session

In-flight position and running tally over a `QuestionSet`. Persisted as `activeSession` on every
answer, and written to `sessions` as a `SessionRecord` on completion. Answers additionally land
in `progress` as they happen, so the two survive independently: progress is what the learner has
learned, the active session is where they were standing.

## Named Constants

Policy values live in one place in `domain/`, so changing a policy is a one-line edit.

| Constant | Value | Meaning |
|----------|-------|---------|
| `MASTERY_STREAK` | 2 | Consecutive correct answers that remove a question from the mistakes set (research §9). |
| `MAX_SESSION_HISTORY` | 50 | Completed sessions retained, newest first; older ones are dropped. Enough to show recent trends, bounded so storage cannot grow without limit on a device the learner does not manage. |

## State Transitions

**Answering a question** — the only write path into `progress`:

```
answer(questionId, choice)
  → attempts += 1
  → if choice == question.correct: correct += 1, streak += 1
    else:                          streak  = 0
  → lastChoice = choice, lastAnsweredAt = now
```

Mistake-set membership is recomputed from this, never stored, so it cannot drift.

**Storage version mismatch** (FR-021):

```
read stored document
  → no document            → start fresh
  → version == current     → use as is
  → version < current      → migrate if a migration exists, else discard and start fresh
  → unparseable            → discard and start fresh, report to the learner
```

A discard is always clean and always visible: silently presenting statistics derived from
unreadable state is forbidden.

**Storage unavailable** (FR-020): the app runs with an in-memory store for the session and tells
the learner progress will not be saved. Every study flow still works.
