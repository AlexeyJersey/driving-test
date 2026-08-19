# Phase 0 Research: Offline Driving-Ticket Trainer

Every decision below is judged against Constitution v1.1.0, where Principle V requires each
runtime dependency to be justified by work it removes.

## 1. State management

**Decision**: No state library. Learner state lives in one document owned by `LearnerStore`,
exposed to React through `useSyncExternalStore`; ephemeral session state is ordinary component
state.

**Rationale**: There is one writer, one device, and no server to reconcile with. The hard part
of this app is not state propagation, it is deriving progress correctly — and that derivation
lives in `domain/` as pure functions regardless of which library holds the state.
`useSyncExternalStore` is built into React and is precisely the primitive for subscribing to an
external store, which `LearnerStore` already is.

**Alternatives considered**: Zustand — would add a dependency to replace roughly twenty lines of
subscribe/getSnapshot. Redux Toolkit — brings actions, reducers, and devtools for a state
document that changes on a tap and is read by three screens. Both fail the Principle V test.

## 2. Question data validation

**Decision**: A hand-written validator inside `web/scripts/build-content.mjs`, run before `dev`
and `build`, that fails on malformed data.

**Rationale**: FR-028 requires a hand-edited correction with a broken shape to fail loudly.
The shape is one object with seven fields and a handful of invariants (unique ids, non-empty
options, `correct` within range, provenance present). That is under a hundred lines of plain
Node with no dependency, and it runs before the app ever sees the data. Validation must live on
the build path rather than in the app, because an app-side check would surface the failure to a
learner mid-study instead of to the maintainer at the moment they broke it.

**Alternatives considered**: Zod — excellent, but it would be a build-time dependency whose only
job is one schema; and it encourages putting parsing in the app, which is the wrong place for
this failure to appear. JSON Schema with a validator package — same objection, plus a second
notation to keep in sync with the TypeScript types.

## 3. Persistence mechanism

**Decision**: `localStorage`, one versioned key holding a single JSON document, behind
`LearnerStore`.

**Rationale**: The entire learner state is per-question counters plus a bookmark list plus a
bounded session history — tens of kilobytes at the full 400-question bank, far inside the
~5 MB budget. Synchronous access means the app can render the first screen with real progress
without an async loading state. Storage sits behind the `LearnerStore` boundary, so moving to
IndexedDB later, or to a server when accounts arrive, changes one file.

**Alternatives considered**: IndexedDB — justified when storing blobs or exceeding the quota,
neither of which applies; its asynchrony would force loading states onto every screen for no
benefit. Cookies — wrong tool, sent on requests, tiny quota.

**Risks accepted, and why each is survivable**:

- *Manual clearing and private browsing*: `localStorage` is cleared when the learner clears site
  data, and is partitioned or restricted in some private-browsing modes. FR-020 already requires
  the app to keep working and say so, so the failure mode is handled rather than prevented.
- *Eviction on iOS*: Safari may evict local storage and service-worker caches for sites that
  have not been used for an extended period. Installing to the home screen substantially reduces
  this, and the app requests `navigator.storage.persist()` on first use, which the browser may
  honour. Neither is a guarantee, so a learner returning after a long absence may find progress
  gone. Given that the alternative is a server and accounts, which Principle II rules out for
  this release, the loss is accepted — and it is exactly the pressure that would later justify
  accounts.
- *Multiple tabs*: two open tabs each hold the document in memory and write it whole, so the
  last write wins and the other tab's changes are lost. Accepted: one learner on one device, and
  the realistic case is an accidental duplicate tab rather than deliberate parallel study. The
  fix, if it ever matters, is listening for the storage event inside `LocalLearnerStore`.

## 4. Offline delivery and installation

**Decision**: `vite-plugin-pwa`, generating the web manifest and a precaching service worker
from the build output.

**Rationale**: Vite emits content-hashed filenames, so the precache list can only be known after
the bundle exists. A hand-written service worker would therefore need a generated manifest of
hashed assets anyway — which is exactly the work this plugin does, plus cache versioning and
cleanup of superseded caches. Since "works offline" is a success criterion (SC-002) and the
classic failure mode is a stale cache serving an old bundle forever, this is real work removed
rather than convenience bought.

**Note — this reverses an earlier decision.** While the plan targeted Next.js with a static
export, a hand-written worker was the right call: the output filenames were predictable enough
to precache by hand, and the available plugins carried framework coupling. Moving to Vite
changed the premise, not the reasoning.

**Alternatives considered**: hand-written worker plus a custom manifest-generation script —
reimplements the plugin with more code and no benefit. Workbox directly — the plugin is a thin
wrapper over it, and using it raw means wiring the build integration by hand.

**Image precaching — resolved**: all question illustrations are precached, by maintainer
decision. Offline study must not depend on which questions the learner happened to visit
(FR-018, SC-002), and the pipeline pre-sizes images before they enter `data/images/`, which is
the right place to control install weight. If a transcribed volume ever pushes the install past
roughly 30 MB, the sizing belongs in the pipeline, not in a caching policy change. The app-side
support (bundle copying, rendering, precache) ships now, exercised by zero questions until an
illustrated volume is transcribed.

## 5. Static output

**Decision**: A plain Vite production build into `web/dist`, deployable to any static host.

**Rationale**: Principle II forbids a server runtime, and the Constitution's technology
constraints require deployability to any static host — which is Vite's default output, with no
configuration needed to disable server features that would otherwise have to be switched off.
Question illustrations are pre-sized by the extraction pipeline, which is where image processing
belongs, so no build-time image optimisation is required.

## 6. Testing approach

**Decision**: Vitest over `web/src/domain/**` and `web/src/storage/migrate.ts`. Offline
behaviour, installation, and layout at 360 px are verified by hand through `quickstart.md`.

**Rationale**: The rules worth protecting are all pure functions — when a question enters and
leaves the mistakes set, how a streak resets, what coverage counts, how a session advances, how
an old stored document is migrated. Those deserve fast, precise tests. The remaining success
criteria are properties of a device and a browser; automating them would mean a browser-driver
dependency and a lot of harness for a single-person project, and the manual check is a
two-minute routine documented once.

**Alternatives considered**: Playwright end-to-end — real value for the offline criterion, but a
heavy dependency and a CI story this project does not have. Revisit if the app grows past one
maintainer.

## 7. Deterministic shuffling

**Decision**: When shuffling is enabled, order is produced by a seeded shuffle, with the seed
stored as part of the session.

**Rationale**: The spec allows shuffling and requires that leaving mid-session lose neither the
answers nor the learner's place (FR-031). Since the in-flight session is persisted and resumed,
order must be reproducible: if it were re-randomised on load, the stored position would point at
a different question than the one the learner left off at.

Seeding is necessary but not sufficient, which is why the active session also stores its
resolved `questionIds` rather than its filter. The mistakes set shrinks as the learner answers
it, so re-evaluating the filter on resume would produce a genuinely different set — a shorter
one, missing exactly the questions they just got right — and no amount of seeding fixes that.

## 8. Answer history shape

**Decision**: Store a per-question aggregate — attempts, correct count, current consecutive
correct streak, last choice, last answered timestamp — rather than an unbounded event log.
Completed sessions are stored separately and capped.

**Rationale**: Every statistic the spec asks for is derivable from these aggregates: coverage is
the count of questions with at least one attempt, total answers is the sum of attempts, accuracy
is correct over attempts, per-topic figures are the same aggregates grouped by topic, and
mistake membership is a streak below the mastery threshold after at least one wrong answer. An
event log would grow without bound on a device whose storage the learner cannot manage, to
support historical queries nobody asked for.

**Consequence accepted**: "accuracy over the last N days" style questions cannot be answered
later without adding a log. If that is ever wanted, it is an additive field, not a reshaping.

## 9. Mastery threshold

**Decision**: Two consecutive correct answers remove a question from the mistakes set; a wrong
answer resets the streak to zero. The threshold is a single named constant in `domain/`.

**Rationale**: With three options, one correct answer carries a one-in-three chance of being a
guess; two consecutive cuts that to one in nine while keeping the drill short. Naming it in one
place means changing the policy is a one-line edit rather than a search.

## 10. Framework: Vite over Next.js

**Decision**: Vite with React and React Router, replacing an initial Next.js scaffold.

**Rationale**: Every feature that distinguishes Next.js is either disabled or irrelevant here.
Server rendering and server components have nothing to render — the entire question bank ships
in the bundle. Image optimisation requires a server and would be switched off. API routes are
forbidden by Principle II. There is no SEO surface, because the app lives behind a home-screen
icon. What remained in use was a bundler and file-based routing, which is not enough work
removed to justify the framework under Principle V.

Vite matches the actual shape of the problem — a static, offline single-page app — and its dev
loop is materially faster, which matters over the number of iterations this UI will take.

**Alternatives considered**: staying on Next.js — defensible on familiarity and on being already
scaffolded, and it would have worked; rejected because it solves problems this app does not
have. The switch was made while the screen layer was still unwritten, when it cost a scaffold
rather than a rewrite.

## 11. Routing

**Decision**: React Router, with each screen at its own URL.

**Rationale**: On a phone, the back gesture is the primary navigation control, and an installed
PWA is judged by whether it behaves like an app. If screens were switched by React state, the
system back gesture would leave the app instead of returning to the previous screen — from the
middle of a study session. A router makes browser history the navigation model, so back means
back. Deep links to a specific mode or screen come along for free.

**Alternatives considered**: state-driven screen switching with no router — simpler, and wrong
on the exact interaction the app is used with most. Hand-rolled History API handling — the same
job, done less completely, for the size of one small dependency.
