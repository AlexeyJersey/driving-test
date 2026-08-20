# Phase 0 Research: Offline Driving-Ticket Trainer

Every decision below is judged against the Constitution (currently v2.0.0), where Principle V
requires each runtime dependency to be justified by work it removes.

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

## 12. Cross-device synchronisation (decided, deferred to a later feature)

**Decision**: Progress will eventually synchronise between the learner's own devices through
Supabase, identified by an opaque device-pairing code rather than an account. Local storage
remains the working copy; sync is background reconciliation. Not implemented in this release.

**Rationale**: The goal is to study on a phone and at a computer with progress following along.
That requires a remote store and some notion of identity, which is why the constitution moved to
v2.0.0 — the previous flat prohibition on a server had to go.

Supabase supplies a database, row-level access rules, and a client library without us operating
a server, which keeps the application a static bundle. A pairing code — generated on the first
device, entered on the second — buys cross-device continuity without an email address, a
password, a recovery flow, or any personal data to safeguard. Real accounts remain the right
answer later, when an administrator needs to edit the question bank, because that role genuinely
needs authentication rather than a shared secret.

**Security note**: a pairing code is a bearer credential. It must be long enough that guessing is
infeasible, and access rules must key on it exclusively, since possession of the code is the only
thing that will distinguish one learner's data from another's.

**Conflict handling**: two devices studying offline in the same period will diverge. The plan is
to merge per question, letting the record with the later answer win, and to accept that attempt
counters may drift by a unit or two. The practical cost of drift is one extra repetition in the
mistakes drill, which is not worth engineering away.

**Tension with §8, stated plainly**: §8 chose per-question aggregates over an append-only answer
log, and that was right for a single device — the log would grow without bound to answer
questions nobody asked. With sync, the log becomes the technically superior choice, because
merging two logs is a set union: commutative, idempotent, lossless. Aggregates cannot be merged
losslessly, and no amount of care changes that. The decision is to keep aggregates and accept
bounded drift, because the loss is a rounding error in a counter while the log is unbounded
growth on a device the learner does not manage. This is a trade accepted with open eyes, not an
oversight — if attempt counts ever need to be exact across devices, the log is the answer and
switching to it is a data-shape change, not an architectural one.

**Alternatives considered**: manual export and import of a progress file — no infrastructure at
all, and it fails for the human reason that syncing you have to remember is syncing you skip.
Email-and-password accounts — familiar, and the right shape eventually, but it imports personal
data handling and a recovery flow to solve a problem two of your own devices do not have.
Cloudflare Workers with D1 — cheaper and colocated with static hosting, but the auth and
endpoints would be ours to write, which is the work Supabase removes.

## 13. Desktop support

**Decision**: Build mobile-first and add breakpoints for larger screens as a later adaptation.
Desktop is not a first-release target.

**Rationale**: The interface shows one question at a time, so a desktop layout is the mobile
layout with a sensible maximum width, not a different information architecture. Tailwind's
breakpoint model layers larger screens on top of a mobile base, which is the direction this
retrofit runs in. The concern that motivates designing both at once — a desktop view needing
multiple panes, tables, or a different navigation model — does not apply to a single-question
screen, so paying for it now would buy little.
