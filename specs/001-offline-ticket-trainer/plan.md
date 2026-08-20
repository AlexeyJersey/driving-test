# Implementation Plan: Offline Driving-Ticket Trainer

**Branch**: `001-offline-ticket-trainer` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-offline-ticket-trainer/spec.md`

## Summary

Build a static, offline-first web application that lets one learner study the Montenegrin
driving-school question bank: answer questions with immediate feedback, drill their own past
mistakes, bookmark items, and see coverage and per-topic accuracy — all persisted on the device
with no server.

The technical approach is a Vite-built React single-page application shipped as static files,
whose entire domain logic (question selection, session progression, progress derivation, statistics)
lives in framework-free TypeScript modules so it is directly testable and reusable. Two
boundaries carry the deferred features: a `ContentProvider` that is the only path to question
content, and a `LearnerStore` that is the only path to persisted learner state. Question data is
generated outside the app, validated by a build step that fails loudly on malformed input, and
consumed read-only.

## Technical Context

**Language/Version**: TypeScript 6 targeting ES2022; Node.js 24 for build tooling. The
extraction pipeline is Python 3.13 in a local virtualenv and is *not* a build dependency of the
web application.

**Primary Dependencies**: Vite 8, React 19.2.8, React Router 8.3, Tailwind CSS 4.3,
`vite-plugin-pwa` 1.3. Dev-only: TypeScript 6, Vitest 4, oxlint. No state-management library and
no schema-validation library — see research.md for why each was rejected, and why the router and
the PWA plugin earn their place.

**Storage**: Browser `localStorage`, reached only through the `LearnerStore` boundary, under a
single versioned key.

**Testing**: Vitest 4 for the framework-free domain modules, which is where every rule worth
testing lives (mistake set membership, mastery streaks, statistics aggregation, session
progression, storage migration). Offline behaviour and home-screen installation are verified
manually via `quickstart.md`, because they are properties of the device and browser rather than
of application code.

**Target Platform**: Modern mobile browsers (iOS Safari, Android Chrome), installable to the
home screen. Built mobile-first; desktop browsers run it, and a proper desktop adaptation is a
planned follow-up (research §13).

**Project Type**: Static single-page application, no backend, no server rendering.

**Performance Goals**: Answer feedback rendered within one frame of the tap (no perceptible
wait, SC-004). First load under 2 s on a mid-range phone; subsequent loads served from cache.

**Constraints**: Fully functional offline after first load (FR-018). Zero outbound requests for
content or learner data after first load (SC-009). Usable at 360 px width without horizontal
scrolling (SC-007). No analytics, tracking, or third-party beacons (FR-022).

**Scale/Scope**: Question bank of roughly 400 questions across 4 volumes when fully
transcribed; 45 questions in 1 volume today. Two volumes will additionally carry per-question
illustrations (situational photographs and sign diagrams), approximately 200 images total.
Single learner, single device, no concurrency.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

Gates derive from Constitution v2.0.0.

| # | Gate (from principle) | Pre-Phase 0 | Post-Phase 1 |
|---|----------------------|-------------|--------------|
| I | Every question keeps `id`, volume and slide provenance; disputed keys surface to the learner; a published id always denotes the same question; the app never mutates an answer key | PASS | PASS — provenance required in data-model.md; `review` reserved for doubted keys with editorial remarks split into `note`; identifier stability made a pipeline obligation with a diff gate; `ContentProvider` exposes no mutation |
| II | Works fully offline with local storage as the working copy; no screen blocks on sync; no component touches storage directly; content reached only via a provider; learner state shaped as ownable by an identity; no remote store or accounts implemented in this release | PASS | PASS — `LearnerStore` and `ContentProvider` contracts defined; all reads synchronous from local storage, so no screen has a sync-dependent state to block on; `LearnerState` carries an `owner` slot held at `"local"` |
| III | App is a read-only consumer of `data/`; corrections happen in data, not code; schema validated before a build consumes it | PASS | PASS — `build-content` validates and generates; no write path exists in the app |
| IV | Question content stored and shown in source language; UI strings separate from content; no translated text in question data | PASS | PASS — UI strings isolated in `src/i18n`; question records have no translation fields |
| V | Minimal dependencies, each justified; static build, no server runtime; nothing built speculatively | PASS | PASS — two runtime dependencies added, each justified against work it removes (router: correct mobile back-navigation; PWA plugin: precache manifest over Vite's hashed filenames); two rejections recorded in research.md |

**Deferred-feature seams** (Constitution → Development Workflow) — each is a boundary and a data
shape, with no stub implementations, dead code, or hidden UI:

- *Exam mode*: `QuestionSet` selection and `Session` progression are separate from feedback
  policy, and `Session` already records per-answer outcomes. A timed, scored session becomes a
  different session policy over the same stored shapes.
- *Cross-device sync and accounts*: `LearnerStore` is the only persistence path; `LearnerState`
  is a single document that a remote implementation can store per identity. The direction is
  decided — Supabase behind an opaque pairing code, local storage remaining the working copy
  (research §12) — and is a later feature, so nothing here implements or stubs it.
- *Administrator editing*: `ContentProvider` is the only content path; questions carry stable
  ids and provenance so an edit can be attributed and traced.
- *Translation*: question records contain no translated text; a future translation artifact is
  keyed by question id and word, and its absence must leave the app fully working.

**Violations requiring justification**: none. Complexity Tracking below is empty.

**Amendment note**: the constitution moved to v2.0.0 after this plan was written, redefining
Principle II to permit a remote store for cross-device synchronisation. Gate II above is
restated against the new principle. Nothing in this release changes: it still ships local-only,
and the boundary that makes sync additive was already required.

**Review history**: an independent review of these artifacts found that the constitution's
technology constraint named Next.js while this plan selects Vite, which made the gate table's
"all PASS" claim false rather than merely stale. Resolved by amending the constitution to
v1.2.0, restating the constraint as "a statically built single-page application with no server
runtime" — the requirement — instead of a framework name. The same review surfaced the
overloaded `review` field and the identifier-stability gap, both also folded into v1.2.0.

## Project Structure

### Documentation (this feature)

```text
specs/001-offline-ticket-trainer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── question-data.md      # the JSON contract between pipeline and app
│   ├── content-provider.md   # the only path to question content
│   └── learner-store.md      # the only path to persisted learner state
├── checklists/
│   └── requirements.md  # spec quality checklist (already passing)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
source/                          # original PDF decks (input to the pipeline, never read by the app)
tools/                           # Python extraction pipeline (not a web build dependency)
├── 01_render.py                 # slides → full-bleed PNG renders
└── 02_review.py                 # human verification page

data/                            # generated question data — the single source of truth
└── questions-IV.json            # one file per volume; more appear as volumes are transcribed

web/
├── vite.config.ts               # React, Tailwind, PWA plugins; content validation on prebuild
├── scripts/
│   └── build-content.mjs        # validates data/*.json, generates src/generated/, copies data/images/ (pre-build gate)
├── public/
│   └── icons/                   # manifest and service worker are generated, not hand-written
└── src/
    ├── main.tsx                 # mount + router
    ├── routes/                  # screens only: composition, no domain logic
    │   ├── Root.tsx             # application shell around the router outlet
    │   ├── Home.tsx             # what to study, and progress at a glance
    │   ├── Study.tsx            # the session runner for every mode
    │   ├── Stats.tsx
    │   └── Settings.tsx         # progress reset (FR-016)
    ├── domain/                  # framework-free, directly unit-tested
    │   ├── question.ts          # Question shape and invariants
    │   ├── selection.ts         # filters → an ordered QuestionSet
    │   ├── session.ts           # session progression and tally
    │   ├── progress.ts          # answer history → per-question progress, mistake membership
    │   └── stats.ts             # aggregation for the statistics screen
    ├── content/
    │   ├── provider.ts          # ContentProvider contract (FR-029)
    │   └── bundled.ts           # v1 implementation over generated data
    ├── storage/
    │   ├── store.ts             # LearnerStore contract (FR-024)
    │   ├── local.ts             # localStorage implementation, versioned
    │   └── migrate.ts           # version handling: migrate or reset cleanly
    ├── generated/               # build output, git-ignored, never hand-edited
    ├── i18n/                    # interface strings, kept apart from question content
    └── ui/                      # presentational components
```

**Structure Decision**: A single repository holding four distinct concerns that do not share a
runtime: the PDF sources, the Python extraction pipeline, the generated data, and the web
application. The web application is confined to `web/` so its dev server watches only its own
files and never the 40 MB of slide renders. `data/` sits outside `web/` because it is the pipeline's
output and the app's input — owned by neither — and crosses into the app only through the
validating `build-content` step, which is what makes FR-028 enforceable rather than aspirational.

Inside `web/src`, the load-bearing split is `domain/` versus everything else. Every rule the
spec states — when a question leaves the mistakes set, what counts as coverage, how a session
advances — lives in plain TypeScript functions with no React, no storage, and no framework
imports. That is what makes those rules testable without a browser, and what keeps the exam-mode
seam honest: adding a scored session means adding a policy in `domain/`, not touching screens.

This split is also what made the framework choice cheap to revisit: `domain/`, `content/`, and
`storage/` contain no framework imports at all, so moving from Next.js to Vite changed the
screen layer and the build configuration and nothing else.

## Complexity Tracking

> No constitutional violations. This table is intentionally empty.
