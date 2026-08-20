# Contract: ContentProvider

The single path from the application to question content (FR-029). No screen, hook, or domain
function reads generated data directly.

## Interface

```ts
interface ContentProvider {
  getVolumes(): Volume[];               // volumes present in this build
  getCategories(): Category[];          // distinct categories across loaded questions
  getAllQuestions(): Question[];        // the whole bank
  getQuestion(id: QuestionId): Question | undefined;
  getQuestions(ids: QuestionId[]): Question[];  // preserves the order given
}
```

Read-only by construction: there is no `save`, `update`, or `delete`, and adding one is exactly
the future change this boundary exists to absorb.

## Implementation in this release

`BundledContentProvider` over `src/generated/`, which the `build-content` step produced from
`data/`. Synchronous, since the content is part of the bundle — this is why no screen needs a
loading state for questions.

## Guarantees

- Questions are returned exactly as recorded. The provider never edits, translates, reorders
  options, or repairs anything.
- `getQuestions` preserves the caller's order, because that order is the study order chosen by
  `domain/selection.ts`.
- An unknown id yields `undefined` rather than throwing: a learner's stored progress may
  reference a question that a later data revision removed, and that must degrade quietly rather
  than break the statistics screen.

## What this boundary buys later

An administrator interface (a known future direction) needs content that can change at runtime
and come from somewhere other than the bundle. That becomes a second implementation of this
interface plus write methods on it. Every consumer — home screen, session runner, statistics —
is written against the interface and does not change.

Per the Constitution's Development Workflow, this release ships **no** write methods, no remote implementation, and
no unused parameters anticipating one. The seam is the interface and the stable question
identity, not scaffolding.
