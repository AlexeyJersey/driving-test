<!--
Sync Impact Report
Version change: 1.1.0 → 1.2.0
Rationale: Three corrections found by review of the planning artifacts. (a) The technology
constraint named a specific web framework, which the implementation plan then contradicted;
restated framework-agnostically so the constraint expresses the requirement (no server runtime)
rather than a product choice. (b) The `review` field was overloaded: Principle IV directed
source typo corrections into the same field whose mere presence Principle I uses to warn the
learner that an answer key is disputed, which would have raised false warnings on questions
whose keys are not in doubt. Editorial notes now have their own field. (c) Added an explicit
identifier-stability obligation on the pipeline, since re-extraction could otherwise silently
reassign a positional id to different content and reattach a learner's history to the wrong
question.
Modified principles:
  - I. Answer Correctness Is Non-Negotiable (identifier stability added)
  - III. Generated Data, Read-Only Consumption (regeneration must preserve identifiers)
  - IV. Source-Language Content, Translation as an Additive Layer (typo notes move to `note`)
Added sections: none
Removed sections: none
Templates requiring review: none (templates read this file at runtime)
Deferred TODOs: none
-->

# Montenegro Driving Test Trainer Constitution

## Core Principles

### I. Answer Correctness Is Non-Negotiable

A wrong answer key is worse than a missing feature: it actively teaches the user the wrong
rule before a real exam. Therefore every question's correct-answer index MUST be traceable to
the source slide it was extracted from, and MUST NOT be changed on the basis of reasoning,
outside knowledge, or medical/legal plausibility alone.

Rules:
- Every question record MUST carry the `id`, `page`, and volume identifying its source slide.
- A question identifier, once published, MUST always denote the same question. Learner history
  is keyed by it, so an identifier that quietly moves to different content silently corrupts
  that history — a failure no schema validation can detect, because the data stays well-formed.
- A disputed or suspicious key MUST be marked with a `review` field rather than silently
  "corrected"; the field states what looks wrong and stays until a human resolves it.
- The `review` field is reserved exclusively for a doubted answer key, because its presence is
  what warns the learner. Any other editorial remark MUST use the separate `note` field, which
  carries no warning.
- Changing a `correct` value REQUIRES visual confirmation against the rendered source slide.
- Shipping a question whose key contradicts its source slide is a defect of the highest
  severity, ahead of any crash or UI bug.

Rationale: the entire value of the app collapses if the user memorises wrong answers.

### II. Offline-First and Local by Default, Extensible to Accounts

The application MUST function fully with no network connection after first load. The first
release MUST ship with no server, no authentication, and no remote data store. Accounts are a
known future direction and MUST remain addable without reshaping the application.

Rules:
- All question data MUST be bundled into the build, never fetched at runtime.
- All user state (progress, mistakes, bookmarks, statistics) MUST live in browser storage on
  the device, and MUST survive reload.
- Loss of device storage is acceptable data loss; no sync or backup obligation exists in v1.
- No telemetry, analytics, tracking, ads, or third-party beacons of any kind.
- Persistence MUST be reached only through a single storage abstraction. No component may call
  browser storage APIs directly, so that a remote-backed implementation can replace it.
- Question content MUST be reached only through a single content-provider abstraction whose v1
  implementation reads the bundled JSON, so that an admin-managed remote source can replace it.
- User state MUST be shaped as data ownable by an identity, even while no identity exists, so
  that attaching a user id later is additive rather than a migration of meaning.
- Two future roles are anticipated and MUST NOT be designed against: a learner who owns their
  own progress, and an administrator who uploads and edits question sets. Neither role, nor any
  authentication, MUST be implemented in the first release.

Rationale: the user studies on a phone, often without connectivity, and the data is personal;
but a shared, maintainable question bank eventually needs someone able to edit it.

### III. Generated Data, Read-Only Consumption

Question data has exactly one source of truth: the JSON files under `data/`, produced from the
source PDFs by the reproducible pipeline in `tools/`.

Rules:
- The application MUST treat `data/*.json` as read-only input; it MUST NOT contain hand-patched
  copies of question content.
- Corrections MUST be made in the pipeline or in the `data/` JSON, never in UI code.
- The pipeline MUST be re-runnable from the PDFs in `source/` to regenerate `data/` and the
  human review page, without manual intervening steps.
- Regeneration MUST preserve existing identifiers. Because identifiers are positional, a
  re-extraction that adds or drops a question would otherwise shift every later index on that
  slide. The pipeline MUST therefore compare its output against the current `data/` and refuse
  to write when an existing identifier would come to denote different content; newly discovered
  questions receive new identifiers rather than displacing existing ones.
- The JSON schema MUST be validated (unique ids, option count, in-range `correct`) before the
  data is consumed by a build.

Rationale: the questions will be re-extracted as more volumes are processed and as errors are
found; divergence between pipeline output and shipped content must be impossible.

### IV. Source-Language Content, Translation as an Additive Layer

Question text, options, and any explanation MUST be stored and displayed in Montenegrin exactly
as written in the source material, because that is the language of the real exam.

Rules:
- Question content MUST NOT be machine-translated in place or paraphrased. The Montenegrin text
  is always what the learner reads by default.
- Obvious typographic defects in the source MAY be corrected, and such corrections MUST be
  recorded in the question's `note` field. They MUST NOT be recorded in `review`, which is
  reserved for doubted answer keys and raises a warning to the learner.
- Interface chrome (navigation, buttons, statistics labels) MUST be kept separate from question
  data so that a second interface language can be added without touching content.
- Translation, when added, MUST be a separate artifact keyed to question ids and to source
  words, never an edit of the source text, and removing it MUST leave the app fully working.
- Translation MUST be produced at build time by the pipeline and bundled, never requested from
  a network service at runtime, so that on-demand lookup stays available offline and costs
  nothing per use.
- On-demand lookup (selecting a word or phrase to see its meaning) is a reading aid layered on
  top of unchanged source text; it MUST NOT alter, replace, or pre-empt what is displayed.

Rationale: training on the exact exam wording is the point, but an unfamiliar language makes
unknown words the bottleneck; a lookup aid removes that without diluting the training.

### V. Simplicity and Minimal Dependencies

The project MUST stay small enough that one person can understand all of it.

Rules:
- Prefer platform capabilities over libraries; each added runtime dependency MUST be justified
  by work it removes.
- The web build MUST be a static export deployable to any static host, with no server runtime.
- No state-management, ORM, or component framework beyond what the app demonstrably needs.
- Features not yet requested MUST NOT be built speculatively; extension points MAY be left
  where a deferred feature is already known (see Development Workflow).

Rationale: this is a personal-scale tool with a short build window and a single maintainer.

## Data Pipeline & Technology Constraints

- Source material: PowerPoint-derived PDFs in `source/`. Question text and options exist only
  as raster images; there is no reliable text layer. Extraction is therefore vision-based and
  MUST be treated as fallible.
- The answer marks present in the PDF text layer are incomplete and MUST NOT be used as the
  authoritative key. They MAY be used as a cross-check signal only.
- `tools/` holds the pipeline: slide rendering (`01_render.py`) and the human review page
  (`02_review.py`). Pipeline scripts run under a local Python virtualenv and MUST NOT be a
  build-time dependency of the web application.
- Web application: a statically built single-page application in TypeScript with no server
  runtime, deployable to any static host. The specific framework and build tooling are an
  implementation decision recorded in the feature plan, not a constitutional constraint; what is
  constitutional is the absence of a server and the ability to ship as static files.
- Persistence: browser local storage, behind the storage abstraction required by Principle II.
  Storage keys MUST be versioned so a schema change can migrate or reset cleanly rather than
  corrupt existing progress.
- Translation artifacts, when generated, live in `data/` alongside the question JSON as
  separate files (per-question translations and a word glossary) and follow the same
  validation and review obligations as question data.
- The app MUST be installable to a phone home screen and usable offline.

## Development Workflow

- Deferred features are out of scope for the first release but MUST have their seams preserved:
  - Exam mode: question selection, scoring, and session state MUST be modelled so that a timed,
    scored session can be added without reshaping the data layer.
  - Accounts (learner and administrator): see Principle II for the required abstractions.
  - Remote question management: content editing and upload by an administrator.
  - Inline translation: word- and phrase-level lookup over unchanged source text.
- A deferred feature MUST NOT be partially implemented to "prepare" for it. Preserving a seam
  means an abstraction boundary and a data shape, not unused code paths or dead UI.
- Volume coverage is incremental. The app MUST work correctly with a subset of volumes present
  and MUST NOT hardcode assumptions about which volumes exist.
- Any question flagged with `review` MUST be visible to the maintainer through the review page
  before that volume is considered done.
- Changes to the question JSON schema REQUIRE updating the validation step and the review page
  in the same change.

## Governance

This constitution supersedes ad-hoc preferences for this project. All planning and
implementation artifacts produced by Spec Kit MUST be checked against it.

- Amendments MUST be recorded in this file with a Sync Impact Report and a version bump.
- Versioning follows semantic versioning: MAJOR for removing or redefining a principle, MINOR
  for adding a principle or materially expanding guidance, PATCH for clarifications.
- Any deviation from a principle MUST be justified in writing in the plan that introduces it,
  or the plan MUST be revised.
- Complexity that cannot be justified MUST be removed rather than documented.

**Version**: 1.2.0 | **Ratified**: 2026-08-19 | **Last Amended**: 2026-08-19
