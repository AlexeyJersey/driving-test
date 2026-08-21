<!--
Sync Impact Report
Version change: 2.0.0 → 3.0.0
Rationale: MAJOR. Principle IV previously made it a MUST that question text and options are
always displayed in Montenegrin, with translation confined to an on-demand, word-at-a-time
lookup layered over unchanged source text. Direct use of the app showed that shape was more
machinery than the study habit called for: a full-question translation, switchable independently
of the interface language, covers the actual need — understand an unfamiliar question quickly,
then switch back to Montenegrin to drill the real exam wording — without word-tap UI, popover
positioning, or a glossary. The on-demand lookup design is superseded, not merely extended, so
this is a redefinition of the MUST, not a clarification of it.

What survives unchanged: Montenegrin remains the stored source of truth and the default shown
language; translation remains a separate, build-time-generated artifact keyed to question ids,
never a live network call, never an edit of the source text, removable without breaking the app.
What changes: translation now covers the whole question and its options rather than individual
words, and it is switchable through its own setting — independent of the interface-chrome
language a learner reads buttons and labels in — rather than surfaced as an inline lookup.

The previous text of this principle is preserved below as a record, per the maintainer's
request, rather than only in git history.-->

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

### II. Offline-First, Local Working Copy, Synchronised in the Background

The application MUST function fully with no network connection after first load, and local
device storage MUST always be the working copy that the interface reads and writes. Progress
MAY additionally be synchronised to a remote store so that the same learner can study on more
than one device, but synchronisation MUST NEVER be a precondition for using the application.

Rules:
- All question data MUST be bundled into the build, never fetched at runtime.
- All learner state (progress, mistakes, bookmarks, statistics) MUST be written to device
  storage first and MUST survive reload without any network access.
- No screen may block, spin, or degrade while waiting for synchronisation. A sync failure is a
  background condition to report, never an interruption to studying.
- No telemetry, analytics, tracking, ads, or third-party beacons of any kind.
- Persistence MUST be reached only through a single storage abstraction. No component may call
  browser storage APIs or a remote client directly.
- Question content MUST be reached only through a single content-provider abstraction whose
  current implementation reads the bundled JSON, so that an admin-managed remote source can
  replace it.
- Learner state MUST be shaped as data ownable by an identity, so that attaching an identity is
  additive rather than a migration of meaning.
- Identification for synchronisation MUST NOT require personal data. A learner pairing their own
  devices is entitled to do so without an email address, a password, or a recovery flow.
- The first release MUST ship local-only. Synchronisation is a separate, later feature, and
  until it exists loss of device storage remains acceptable data loss.
- An administrator role — someone who edits the question bank through an interface — remains
  anticipated and MUST NOT be implemented before it is specified.

Rationale: studying happens in dead time and dead zones, so an app that needs a connection to
show a question it already has is a worse PDF. But studying also happens on whichever device is
to hand, and progress that does not follow the learner between them is progress they stop
trusting. Offline-first with background reconciliation is the only shape that serves both;
server-first would trade the first for the second.

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

### IV. Source-Language Content, Translation as an Independent, Additive Layer

Question text and options are stored once, in Montenegrin, as written in the source material,
because that is the language of the real exam. Montenegrin MUST remain the default shown
language and MUST remain fully usable with every translation artifact removed.

Rules:
- Question content MUST NOT be machine-translated in place or paraphrased. The Montenegrin
  field is the only source of truth; a translation is always a separate, additional value keyed
  to the same question id, never a rewrite of it.
- Obvious typographic defects in the source MAY be corrected, and such corrections MUST be
  recorded in the question's `note` field. They MUST NOT be recorded in `review`, which is
  reserved for doubted answer keys and raises a warning to the learner. Maintainer remarks in
  `note` and `review` are working notes, not exam content, and are never translated.
- Interface chrome (navigation, buttons, statistics labels) MUST be kept separate from question
  data, and the language a learner reads chrome in MUST be an independent setting from the
  language a question's text and options are shown in. Switching one MUST NOT switch the other.
- Translation MUST be produced at build time by the pipeline and bundled, never requested from a
  network service at runtime, so switching a question's language stays instant and available
  offline. A question with no translation for the selected language MUST fall back to
  Montenegrin, never to a blank or broken display.
- The correct-answer index is never translated and never changes with the content language;
  only the displayed text and options do.

Rationale: training on the exact exam wording is the point, which is why Montenegrin stays the
default and stays one tap away regardless of how the interface is set. But an unfamiliar
language makes unfamiliar questions a bottleneck to studying at all, and switching a question's
whole text to a language the learner already reads comfortably removes that bottleneck directly,
without requiring a separate lookup mechanism to get there.

<details>
<summary>Superseded text (v2.0.0, on-demand word lookup) — kept for reference, not in force</summary>

Question text and options are stored once, in Montenegrin, as written in the source material,
because that is the language of the real exam.

Rules:
- Question content MUST NOT be machine-translated in place or paraphrased. The Montenegrin text
  is always what the learner reads by default.
- Translation, when added, MUST be a separate artifact keyed to question ids and to source
  words, never an edit of the source text, and removing it MUST leave the app fully working.
- Translation MUST be produced at build time by the pipeline and bundled, never requested from
  a network service at runtime, so that on-demand lookup stays available offline and costs
  nothing per use.
- On-demand lookup (selecting a word or phrase to see its meaning) is a reading aid layered on
  top of unchanged source text; it MUST NOT alter, replace, or pre-empt what is displayed.

Rationale (v2.0.0): training on the exact exam wording is the point, but an unfamiliar language
makes unknown words the bottleneck; a lookup aid removes that without diluting the training.

</details>

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
- Web application: a statically built single-page application in TypeScript, deployable to any
  static host. The specific framework and build tooling are an implementation decision recorded
  in the feature plan, not a constitutional constraint; what is constitutional is that the
  application ships as static files and that we operate no server runtime of our own. A managed
  remote data store used for synchronisation is not a server runtime in this sense.
- Persistence: browser local storage as the working copy, behind the storage abstraction
  required by Principle II, with an optional remote store behind that same abstraction.
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
  - Cross-device synchronisation: carrying one learner's progress between their own devices,
    identified without personal data. See Principle II for the required abstractions.
  - Administrator accounts and remote question management: content editing and upload.
  - Inline translation: word- and phrase-level lookup over unchanged source text.
  - Desktop adaptation: the interface is built mobile-first; larger screens are served by
    adding breakpoints over that layout, not by a separate design.
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

**Version**: 3.0.0 | **Ratified**: 2026-08-19 | **Last Amended**: 2026-08-21
