# Specification Quality Checklist: Offline Driving-Ticket Trainer

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-19
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Validation pass 1 found one violation: SC-009 specified verification "in browser tooling",
  naming an implementation surface. Rewritten as observable network activity during a session.
  All other items passed on first review.
- Three decisions were resolved as documented assumptions rather than clarification markers,
  because a defensible default existed for each: mastery threshold (two consecutive correct
  answers), default question order (source order, shuffle offered), and single learner per
  device. Each is recorded in the Assumptions section and is cheap to change.
- Scope boundaries FR-023 through FR-026 state what this release deliberately excludes — exam
  mode, accounts, translation, and in-app editing — together with the architectural seam each
  requires, per Constitution Principles II and IV.
- **Independent review pass (2026-08-19)**, run against the artifacts plus the actual repository
  state. Seven defects confirmed and fixed; no finding was a false positive:
  1. The constitution named Next.js as a technology constraint while the plan selected Vite,
     making the plan's "all gates PASS" claim false. Constitution amended to v1.2.0 with the
     constraint restated as the requirement — a static build with no server runtime — rather
     than a framework name.
  2. The `review` field was overloaded: Principle IV sent source typo notes into the same field
     whose presence warns the learner of a doubted answer key. Split into `review` (warns) and
     `note` (silent), across the constitution, spec, data model, contract, and review page.
  3. Positional ids could silently change meaning on re-extraction. Identifier stability is now
     an explicit pipeline obligation with a diff gate, in the constitution and the data contract.
  4. Research §7 justified seeded shuffle by "resuming is exact" while nothing persisted an
     in-flight session. Resolved by adding FR-031 and the `activeSession` shape, which also
     exposed that the session must store its resolved question ids — re-evaluating the mistakes
     filter on resume would hand back a different set.
  5. Orphaned progress was unspecified, allowing coverage above 100%. Added as FR-032.
  6. Technical Context said TypeScript 5 while dependencies said 6; the installed version is 6.
  7. The session-history cap and the image directory path were referenced but never defined.
     Now `MAX_SESSION_HISTORY = 50` and `data/images/<VOLUME>/`.
- Two risks were accepted rather than fixed, and recorded in research §3: multi-tab last-write-
  wins, and storage eviction on iOS.
- Follow-through for `/speckit-tasks`: the identifier-stability diff gate, the `note` field in
  the validator, `activeSession` persistence, and the `build-content` step wired ahead of both
  `dev` and `build` must each appear as tasks.
