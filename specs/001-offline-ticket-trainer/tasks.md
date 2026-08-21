---

description: "Task list for the offline driving-ticket trainer"
---

# Tasks: Offline Driving-Ticket Trainer

**Input**: Design documents from `/specs/001-offline-ticket-trainer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. research.md §6 selected Vitest over the framework-free `domain/` modules and
`storage/migrate.ts`, on the grounds that every rule worth protecting is a pure function there.
Screens are not unit-tested; their acceptance is the manual pass in quickstart.md.

**Organization**: Grouped by user story so each can be implemented, tested, and shipped on its
own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete work)
- **[Story]**: The user story the task serves (US1…US5)
- Every task names the exact file it touches

## Path Conventions

Repository root holds four concerns: `source/` (PDFs), `tools/` (Python pipeline), `data/`
(generated question bank), `web/` (the application). All application paths below are under
`web/`, per plan.md.

**Starting point**: `web/` is an untouched Vite React-TypeScript scaffold. No feature code
exists yet.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Turn the bare scaffold into the project described in plan.md

- [X] T001 Configure React, Tailwind, and the `@/` path alias in web/vite.config.ts and web/tsconfig.app.json
- [X] T002 Wire `dev`, `build`, `preview`, and `test` scripts in web/package.json so that content generation runs before both `dev` and `build`
- [X] T003 [P] Replace the starter stylesheet with the Tailwind entry and base styles in web/src/index.css
- [X] T004 [P] Add Vitest configuration in web/vitest.config.ts
- [X] T005 [P] Delete Vite starter boilerplate (demo component, logos, unused assets) from web/src and web/public

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The data path and the two boundaries every story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Implement the question-data validator in web/scripts/build-content.mjs enforcing every rule in contracts/question-data.md: ids unique across all files, `correct` within `options` range, at least two non-empty options, non-empty `text`, positive integer `page`, non-empty `review` and `note` when present, and `image` resolving to data/images/<VOLUME>/
- [X] T007 Extend web/scripts/build-content.mjs to emit a typed content bundle to web/src/generated/content.ts, failing the run and naming the offending question id when validation fails
- [X] T008 Extend web/scripts/build-content.mjs to copy data/images/<VOLUME>/ into the build output, treating a volume with no image directory as normal rather than an error — every volume transcribed so far is text-only, so failing on an absent directory would break the build on day one (FR-007)
- [X] T009 [P] Add the identifier-stability diff gate in tools/03_check_ids.py: compare freshly extracted output against the current data/ and refuse to write when an existing id would come to denote different content (Constitution Principle III)
- [X] T010 [P] Add web/src/generated/ to web/.gitignore, since it is build output that must never be hand-edited
- [X] T011 [P] Define the Question type and its invariants in web/src/domain/question.ts
- [X] T012 [P] Define policy constants MASTERY_STREAK = 2 and MAX_SESSION_HISTORY = 50 in web/src/domain/constants.ts
- [X] T013 [P] Define LearnerState, QuestionProgress, ActiveSession, and SessionRecord types in web/src/storage/types.ts per data-model.md
- [X] T014 Define the ContentProvider interface in web/src/content/provider.ts exactly as specified in contracts/content-provider.md, with no mutation methods
- [X] T015 Implement BundledContentProvider over the generated bundle in web/src/content/bundled.ts, returning undefined for unknown ids and preserving caller order in getQuestions
- [X] T016 Define the LearnerStore interface in web/src/storage/store.ts per contracts/learner-store.md, including saveActiveSession and clearActiveSession
- [X] T017 Implement version handling in web/src/storage/migrate.ts: matching version used as is, older migrated, unparseable or unmigratable discarded cleanly
- [X] T018 [P] Unit tests for migration and clean-discard behaviour in web/src/storage/migrate.test.ts
- [X] T019 Implement LocalLearnerStore in web/src/storage/local.ts writing one versioned key, trimming sessions to MAX_SESSION_HISTORY, and falling back to an in-memory store with isPersistent false when storage throws
- [X] T020 [P] Expose the store to React through useSyncExternalStore in web/src/storage/useLearnerStore.ts
- [X] T021 [P] Create the interface string table in web/src/i18n/strings.ts, kept apart from question content
- [X] T022 Set up the router and application shell in web/src/main.tsx and web/src/routes/Root.tsx so browser history is the navigation model

**Checkpoint**: Content loads through one boundary, state persists through another, and both are
typed. User stories can begin.

---

## Phase 3: User Story 1 - Practise questions with immediate feedback (Priority: P1) 🎯 MVP

**Goal**: A learner picks a topic, answers questions one at a time, and learns immediately
whether they were right — with the answer hidden until they commit.

**Independent Test**: With only volume IV present, answer several questions correctly and
incorrectly and confirm feedback matches the source slide; confirm nothing reveals the answer
before submission.

### Tests for User Story 1

- [X] T023 [P] [US1] Unit tests for question selection, including seeded-shuffle determinism, in web/src/domain/selection.test.ts
- [X] T024 [P] [US1] Unit tests for answer recording and streak behaviour in web/src/domain/progress.test.ts
- [X] T025 [P] [US1] Unit tests for session progression and tally in web/src/domain/session.test.ts

### Implementation for User Story 1

- [X] T026 [P] [US1] Implement selection from filters to an ordered QuestionSet in web/src/domain/selection.ts, defaulting to source order with seeded shuffle as an option
- [X] T027 [P] [US1] Implement answer recording and per-question derivation in web/src/domain/progress.ts
- [X] T028 [US1] Implement session progression, position, and tally in web/src/domain/session.ts (depends on T026)
- [X] T029 [P] [US1] Build the question card in web/src/ui/QuestionCard.tsx: options unmarked until submission, then both the learner's choice and the correct option marked
- [X] T030 [US1] Render the question's illustration above its options in web/src/ui/QuestionCard.tsx when `image` is present, and nothing when it is absent (FR-007) — currently exercised by zero questions, so verify with a temporary local data edit and revert
- [X] T031 [US1] Surface the disputed-key warning in web/src/ui/QuestionCard.tsx for questions carrying `review`, and deliberately not for those carrying only `note` (FR-004)
- [X] T032 [US1] Build the home screen with topic selection and the start action in web/src/routes/Home.tsx, including an explanatory state when the chosen volume and topic filters intersect to zero questions
- [X] T033 [US1] Build the study screen wiring selection, session, content provider, and store in web/src/routes/Study.tsx
- [X] T034 [US1] Persist the active session on every answer, storing its resolved questionIds rather than its filter, in web/src/routes/Study.tsx (FR-031)
- [X] T035 [US1] Offer to resume an unfinished session on launch in web/src/routes/Home.tsx
- [X] T036 [US1] Build the end-of-set summary with right and wrong tallies in web/src/ui/SetSummary.tsx

**Checkpoint**: The app is usable for study on its own. This is the MVP.

---

## Phase 4: User Story 2 - Drill the questions I got wrong (Priority: P2)

**Goal**: A session made only of the learner's past mistakes, shrinking as they improve.

**Independent Test**: Answer several questions wrong, open the drill, confirm exactly those
appear, answer one correctly twice, and confirm it leaves while the others remain.

### Tests for User Story 2

- [X] T037 [P] [US2] Unit tests for mistake-set membership in web/src/domain/progress.test.ts, covering entry on a wrong answer, staying after one correct, leaving on the second consecutive correct, and re-entering when a later wrong answer resets the streak

### Implementation for User Story 2

- [X] T038 [US2] Implement mistake-set derivation in web/src/domain/progress.ts as attempts > correct AND streak < MASTERY_STREAK, computed rather than stored
- [X] T039 [US2] Add the mistakes mode to selection in web/src/domain/selection.ts
- [X] T040 [US2] Add the mistakes entry point to web/src/routes/Home.tsx, with an explanatory state when nothing is due rather than an empty screen

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 - Study without a network and from the home screen (Priority: P3)

**Goal**: The app installs to the home screen and works identically with no connection.

**Independent Test**: Load once against a production build, disable networking, relaunch from
the home-screen icon, and confirm every question and all stored progress is available.

- [X] T041 [US3] Configure vite-plugin-pwa in web/vite.config.ts with the web manifest and a precache covering the app shell, the generated content bundle, and the copied question illustrations (FR-018, SC-002)
- [X] T042 [P] [US3] Add application icons in web/public/icons/ and reference them from the manifest
- [X] T043 [US3] Request navigator.storage.persist() on first use in web/src/storage/local.ts to reduce eviction risk (research §3)
- [X] T044 [P] [US3] Add offline-ready and update-available notices in web/src/ui/ServiceWorkerNotices.tsx
- [X] T045 [US3] Verify offline behaviour and installation against `npm run preview`, never the dev server, per quickstart.md

- [X] T086 Make the base path a deploy-time variable in web/vite.config.ts, so the same build serves a GitHub Pages subpath or a root-served host without a code change
- [X] T087 Write the app to dist/404.html as well, so a direct hit on /study on a static host reaches the router instead of a 404

**Checkpoint**: The app is a real installable offline trainer. Verified by killing
the server and reloading: the shell, the questions and the photographs all came
from cache.

## Phase 13: Ship It

**Requested to get the app in front of a phone rather than only localhost.**
Public deploy on GitHub Pages, with a build-time passcode as a stopgap facade —
tracked to be replaced by a private repo behind Cloudflare Access.

- [X] T088 Add PasscodeGate: a build-time passcode baked in from a repo secret, skipped entirely when unset (local dev), with the unlocked flag traveling LearnerStore like any other preference
- [X] T089 Write .github/workflows/deploy.yml: build with APP_BASE and the passcode secret, deploy via actions/deploy-pages
- [X] T090 Make the repository public and enable Pages (build_type=workflow) — required by the current GitHub plan; tracked as a stopgap, not the final access-control plan
- [X] T091 Fix createBrowserRouter to pass basename: import.meta.env.BASE_URL — without it every route 404'd on the Pages subpath, found by loading the live deploy rather than by inspecting the build
- [X] T092 Fix build-content.mjs to prefix image URLs with the same APP_BASE the Vite build uses — hardcoded "/images/..." 404'd off the domain root on a subpath deploy, found the same way, on a deep link the router fix had just made reachable

**Checkpoint**: live at https://alexeyjersey.github.io/driving-test/ — passcode
gate, deep links, and illustrations all verified against the deployed site, not
just the local build.

---

## Phase 6: User Story 4 - See how ready I am (Priority: P4)

**Goal**: Coverage, overall accuracy, and per-topic accuracy.

**Independent Test**: Answer a known mix across two topics and confirm the reported figures
match that mix exactly.

### Tests for User Story 4

- [ ] T046 [P] [US4] Unit tests for statistics in web/src/domain/stats.test.ts, covering attempted-versus-answers-given and orphaned progress being ignored

### Implementation for User Story 4

- [ ] T047 [US4] Implement aggregation in web/src/domain/stats.ts over the intersection of stored progress and the current bank, so coverage can never exceed the questions available (FR-032)
- [ ] T048 [US4] Build the statistics screen in web/src/routes/Stats.tsx
- [ ] T049 [US4] Add an explanatory empty state for a learner who has answered nothing in web/src/routes/Stats.tsx

**Checkpoint**: Progress is legible.

---

## Phase 7: User Story 5 - Bookmark questions to come back to (Priority: P5)

**Goal**: Mark questions worth revisiting and study only those.

**Independent Test**: Bookmark two questions from different topics, open the bookmarks session,
confirm exactly those appear, and confirm removing one does not touch answer history.

- [ ] T050 [P] [US5] Add the bookmark toggle to web/src/ui/QuestionCard.tsx
- [ ] T051 [US5] Add the bookmarks mode to selection in web/src/domain/selection.ts
- [ ] T052 [US5] Add the bookmarks entry point and empty state to web/src/routes/Home.tsx

**Checkpoint**: All five stories work independently.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T053 [P] Add deliberate progress reset with a confirmation step in web/src/routes/Settings.tsx (FR-016)
- [ ] T054 [P] Show a persistent notice when device storage is unavailable, stating that progress will not be saved, in web/src/ui/StorageNotice.tsx (FR-020)
- [ ] T055 [P] Verify the layout at 360 px width with no horizontal scrolling and no truncated question text, against the manual table in specs/001-offline-ticket-trainer/quickstart.md (SC-007)
- [ ] T056 [P] Confirm the disputed-key warning appears on the three questions carrying `review` and not on the two carrying only `note`, per the flags in data/questions-IV.json (FR-004)
- [ ] T057 Confirm no outbound requests for content or learner data occur after first load, against the manual table in specs/001-offline-ticket-trainer/quickstart.md (SC-009)
- [ ] T058 Run the full quickstart.md validation pass and record any deviation
- [ ] T059 [P] Write web/README.md covering how to run, how to correct a question, and how to add a transcribed volume

---

## Phase 9: Interface Language

**Added after planning, at the maintainer's request.** Cross-cutting rather than a user story:
it touches the string table, the storage boundary, and the shell, and changes no study rule.

**Goal**: The interface reads in Montenegrin by default, and can be switched to English or
Russian without touching a single word of question content.

**Independent Test**: Switch language on the home screen and confirm every label changes while
question text, options, and answer keys stay identical; reload and confirm the choice held.

- [X] T060 Restructure web/src/i18n/strings.ts into one shape with three dictionaries — Montenegrin, English, Russian — including per-language plural rules, since Montenegrin and Russian both need three forms and English needs two
- [X] T061 Add the language preference to learner state in web/src/storage/types.ts and web/src/storage/local.ts, defaulting to Montenegrin when absent so an existing stored document keeps working without a version bump (FR-035)
- [X] T062 [P] Add a language switcher to the shell in web/src/ui/LanguageSwitcher.tsx and wire it into web/src/routes/Root.tsx
- [X] T063 Read strings through the active language everywhere in web/src/routes and web/src/ui, replacing the direct `ui` import (FR-033, FR-034)

**Checkpoint**: The app reads in the exam's language, and the chrome is translatable without
touching content.

---

## Phase 10: Illustrated Volumes — Proof on One Slide

**Done ahead of the rest of volume II, to find out what transcribing an
illustrated volume actually costs before committing to forty slides.** It found
one thing worth finding: the source has a question kind volume IV did not.

- [X] T064 Establish that illustrations cannot be extracted as files: each slide is a single flattened raster containing text, options and pictures together, so illustrations must be cropped by pixel coordinates from the render
- [X] T065 Crop the two photographs of slide II-5 into data/images/II/ by detecting dense ink columns in the left region of the render
- [X] T066 Extend the question contract with a `kind` of `choice` or `order`, and the validator in web/scripts/build-content.mjs to enforce each kind's fields (FR-036)
- [X] T067 Model the sequence answer through the domain and storage layers in web/src/domain/question.ts and web/src/storage/types.ts, widening an answer from an option index to an index or a sequence
- [X] T068 Build the sequence input in web/src/ui/QuestionCard.tsx: tap the vehicle numbers in order, submit disabled until every vehicle is placed
- [X] T069 Transcribe slide II-5 into data/questions-II.json — four questions, two photographs, one photograph serving two questions

- [X] T076 Turn the cropping step into tools/05_crop_images.py and run it over all 40 slides of volume II — 80 crops, two per slide, written as WebP
- [X] T077 Transcribe the remaining 39 slides of volume II into data/questions-II.json — 160 questions, every slide's choice-question count cross-checked against its mark count

**Checkpoint**: volume II is complete. 294 questions across three volumes; only
volume III remains untranscribed.

---

## Phase 11: Volume I — Traffic Rules

**Transcribed after the volume II proof, because it needs no new machinery.** It
did, however, expose a defect in the render step that had been silently losing
data since the beginning.

- [X] T070 Diagnose why every slide loses its last text row: the question raster is truncated where PowerPoint places it, and neither expanding the page box nor stripping clipping paths recovers it — while the answer marks, being text objects over that raster, are not truncated at all
- [X] T071 Establish that the same truncation was hiding answer marks from the text layer: reading marks from the un-expanded PDF dropped every mark positioned past the page edge, which is what made the text layer look unreliable
- [X] T072 Build tools/04_marked_slides.py: render as the base for sharpness and marks, with the raster's missing rows appended beneath and an overlap so a row can be paired with its mark
- [X] T073 Point tools/02_review.py at the composited slides, since verifying a parse against a truncated slide is worse than not verifying it
- [X] T074 Transcribe volume I into data/questions-I.json — 89 questions across 17 slides, each slide's count cross-checked against its mark count from the text layer
- [X] T075 Reconcile the flag convention: a lone red mark is an instructor's correction, not an ambiguity, so it belongs in `note`; IV-7-2 moved from `review` to match

**Checkpoint**: 138 questions across three volumes, and the render step no longer
loses the bottom of every slide.

---

## Phase 12: Navigating a Long Set

**Requested after using the app on a 160-question volume, where the run-forward-
only design broke down.** Also fixes a crop defect found the same way.

- [X] T078 Fix tools/05_crop_images.py to bound a photograph by where the background is rather than by where the ink is — the density rule cropped the top off any photograph opening on bright sky, which on slide 1 removed the give-way sign the question asks about (FR-007)
- [X] T079 Cut crops from the slide's own raster instead of from a 150 dpi page render, since the render is a 2x interpolation of it and cropping there baked poppler's smoothing into the file
- [X] T080 Read every content raster on a page, not just the largest: some slides split their content into one raster per half, and taking the largest silently returned half a slide
- [X] T081 Add jumpTo and one-answer-per-question to web/src/domain/session.ts so jumping back and re-answering replaces the earlier answer (FR-038, FR-041)
- [X] T082 Derive lastOutcome from stored progress in web/src/domain/progress.ts — a streak above zero can only mean the last answer was right (FR-039)
- [X] T083 Build the jump panel in web/src/ui/JumpPanel.tsx: number entry plus a map of the whole set coloured by last outcome (FR-038, FR-039)
- [X] T084 Resume the run on reload in web/src/routes/Study.tsx by matching the stored session against the URL including its seed (FR-037)
- [X] T085 Show the answer already given when returning to an answered question in web/src/routes/Study.tsx (FR-040)

**Checkpoint**: a 160-question volume is navigable, and the photographs are whole.

---

## Phase 14: Volume III — Signs, Signals, Gestures

**The last untranscribed volume.** 121 questions across 27 slides, cross-checked
against the X-mark count per slide the same way as volumes I and II — every
slide agrees except slide 6, where a stray duplicate mark (the same class of
defect as volume I's stray "Џ" glyph) is documented rather than invented into a
5th question.

- [X] T093 Extend tools/06_crop_signs.py's cross-check to report band count against mark count per slide, surfacing two known shapes rather than a detector bug: several slides (21-27) share one illustration across two questions, the same pattern as volume II's photographs; slide 16 has two icons sitting close enough to merge into one crop
- [X] T094 Transcribe all 27 slides into data/questions-III.json — 121 questions, reading every slide directly against its mark count
- [X] T095 Independently cross-check the transcription against a second pass produced by another model over the same slides — 7 of 121 questions differed, all cosmetic (a truncated word repeated three times, one misspelling, one punctuation placement), zero disagreements on any correct-answer index; resolved by reading the disputed source lines directly rather than trusting either transcription by default
- [X] T096 Split the merged crop on slide 16 into its two real illustrations and fix the image references for its last two questions, which a first attempt at the split briefly mis-assigned by overwriting a neighbouring question's file — caught by validating every image reference against the files on disk before moving on
- [X] T097 Add the missing "signs" category label to web/src/i18n/strings.ts in all three languages, caught by loading the live build rather than trusting the data alone

**Checkpoint**: 415 questions across all four volumes. The full bank is
transcribed.

---

## Phase 15: Content Language

**MVP shape decided after using the app**: whole-question translation, switchable
independently of the interface language, superseding the earlier on-demand
word-lookup design (Constitution v2.0.0 → v3.0.0, Principle IV). The actual
translated strings are produced outside this session; everything else ships now
and works correctly with zero translations present.

- [X] T098 Add `contentLanguage` to LearnerSettings, independent of `uiLanguage`, defaulting to Montenegrin and tolerated as absent on older stored documents (Constitution Principle IV, FR-033a/d)
- [X] T099 Extend web/scripts/build-content.mjs to load, validate, and bundle data/translations-{en,ru}.json: unknown ids, option-count mismatches, and options on an order-question translation all fail the build by id; a missing file or a missing per-question entry is not an error (FR-025)
- [X] T100 Add web/src/content/localize.ts: `localizeQuestion` returns the source question unchanged for Montenegrin or when no translation exists, otherwise swaps `text`/`options` — never `correct` — kept outside ContentProvider so its no-mutation guarantee stays literally true (FR-033b)
- [X] T101 Generalise the language switcher into a value/onChange `LanguagePicker` in web/src/ui/LanguageSwitcher.tsx, replace CG/EN/RU text codes with flag emoji, and mount a second instance — with no caption, per the maintainer's call that the control is self-explanatory once one instance exists — above the question card in web/src/routes/Study.tsx, bound to `contentLanguage` (FR-033a/c)
- [X] T102 Fix a `this`-binding bug the above surfaced: passing a class method as a bare callback prop dropped its receiver. Bound every mutating LearnerStore method once in the constructor rather than relying on every call site remembering to wrap it
- [X] T103 Prepare the exact prompt and JSON schema for producing data/translations-en.json and data/translations-ru.json via another model, mirroring the volume III transcription handoff

**Checkpoint**: switching a question's language works end to end against a real
translation entry, verified in a production build; falls back to Montenegrin
cleanly with none present, which is the state this ships in.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — **blocks every user story**
- **User stories (Phases 3–7)**: all depend on Foundational; independent of each other
- **Polish (Phase 8)**: depends on the stories being delivered

### User Story Dependencies

- **US1 (P1)**: after Foundational. Depends on nothing else.
- **US2 (P2)**: after Foundational. Shares `progress.ts` and `selection.ts` with US1, so if both
  are in flight those two files are contention points; the story is independently testable.
- **US3 (P3)**: after Foundational. Touches build configuration and storage only — genuinely
  parallel to the others.
- **US4 (P4)**: after Foundational. Reads progress written by US1, but its own logic and screen
  are independent.
- **US5 (P5)**: after Foundational. Shares `selection.ts` and `QuestionCard.tsx` with US1.

### Within Each User Story

Tests are written before the implementation they cover. Domain modules come before screens,
because screens compose them. Nothing in `routes/` may contain a study rule.

### Parallel Opportunities

- T003, T004, T005 in Setup
- T009 through T013 in Foundational — the pipeline gate, the ignore rule, and the type
  definitions touch entirely separate files
- T023, T024, T025 — all three US1 test files
- T026 and T027 — selection and progress are independent modules
- US3 can run alongside any other story; it shares no source file with them

---

## Parallel Example: User Story 1

```bash
# All three test files first, in parallel:
Task: "Unit tests for question selection in web/src/domain/selection.test.ts"
Task: "Unit tests for answer recording in web/src/domain/progress.test.ts"
Task: "Unit tests for session progression in web/src/domain/session.test.ts"

# Then the two independent domain modules, in parallel:
Task: "Implement selection in web/src/domain/selection.ts"
Task: "Implement progress derivation in web/src/domain/progress.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup
2. Phase 2 Foundational — blocks everything, do not shortcut it
3. Phase 3 US1
4. **Stop and validate**: study several questions against the source slides, confirm no answer
   leaks before submission
5. At this point the app already beats reading the PDF, because the PDF cannot hide its answers

### Incremental Delivery

Setup + Foundational → US1 (MVP) → US2 (the drill, the highest-value addition) → US3 (offline
and installable, at which point it is genuinely a phone app) → US4 → US5. Each step is
independently shippable.

### Scope Guard

Four features are deliberately absent and must stay absent: exam mode, accounts, translation,
and in-app editing of questions. Their seams exist (`ContentProvider`, `LearnerStore`, stable
question ids, session shape). Per the Constitution's Development Workflow, a seam is a boundary and a data shape —
adding stub methods, unused parameters, or hidden screens to "prepare" for them is a violation,
not preparation.

---

## Notes

- [P] marks tasks in different files with no incomplete dependency
- Question data is read-only to the application; a wrong answer is fixed in `data/`, never in code
- `web/src/generated/` is build output — never hand-edit it, never commit it
- The service worker only exists in a production build, so offline work is verified against
  `npm run preview`
- Commit after each task or coherent group
