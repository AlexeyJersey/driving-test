# Quickstart: Offline Driving-Ticket Trainer

How to run the app, regenerate the question bank, and verify that the feature actually works.

## Prerequisites

- Node.js 24 and npm (for the web application)
- Python 3.13 with a local virtualenv (for the extraction pipeline only — not needed to run
  or build the app)
- Poppler (`pdftoppm`, `pdftotext`, `pdfimages`), available via `brew install poppler`, for the
  extraction pipeline only

## Run the app

```bash
cd web
npm install
npm run dev          # regenerates and validates content, then serves on :5173
```

`npm run dev` and `npm run build` both run `scripts/build-content.mjs` first, which validates
every file in `data/` and writes `web/src/generated/`. A malformed question aborts the run and
names the offending id — that is FR-028 working, not a bug.

```bash
npm run build        # static build into web/dist
npm run preview      # serve that build locally, which is how to test the service worker
npm test             # domain and migration unit tests
```

The service worker is only active in a production build, so offline behaviour must be verified
against `npm run preview`, never against the dev server.

## Regenerate question data from the PDFs

Only needed when transcribing a new volume or re-rendering slides. The app builds fine without
ever running this.

```bash
python3 -m venv .venv && .venv/bin/pip install pypdf Pillow
.venv/bin/python tools/01_render.py         # all volumes; pass e.g. "IV" for one
.venv/bin/python tools/02_review.py IV      # side-by-side verification page
open build/review.html
```

Renders land in `build/pages/<VOLUME>-<page>.png` and are the reference for verifying any answer
key.

## Correct a wrong answer

1. Find the question in `data/questions-<VOLUME>.json` by its `id`.
2. Open `build/pages/<VOLUME>-<page>.png` and read the marked answer off the slide.
3. Fix `correct`; if the question carried a `review` note and the doubt is now resolved, remove
   that field so the in-app warning stops showing.
4. Rebuild. No application code changes (FR-027).

Never rename an `id` — it is the join key to every learner's recorded progress.

## Add a newly transcribed volume

Drop `data/questions-<VOLUME>.json` in place and rebuild. Its questions, categories, and totals
appear with no code change (SC-008). If its questions carry illustrations, their files go in the
volume's image directory and are copied into the build by `build-content`.

## Verification scenarios

Automated — `npm test` covers these, since they are pure domain rules:

| What | Expected |
|------|----------|
| Answer a question wrong | It enters the mistakes set |
| Answer it right once | Still in the set (threshold is two) |
| Answer it right twice in a row | Leaves the set |
| Then answer it wrong | Back in the set, streak reset |
| Coverage after 3 questions attempted, one of them 5 times | 3 attempted, 7 answers given |
| Per-category accuracy | Matches the answers given in each category |
| Load a stored document with an older version | Migrated, or discarded cleanly — never partially read |
| Load an unparseable stored document | Discarded, learner informed |

Manual — properties of the device rather than of the code:

| What | How | Expected |
|------|-----|----------|
| Offline study (FR-018, SC-002) | Load once, switch the device to airplane mode, reload | Every question, illustration, and stored progress still available |
| No outbound requests (SC-009) | Watch network activity through a full session | No requests for content or learner data after first load |
| Home-screen install (FR-019) | Add to home screen, launch from the icon | Opens standalone, without browser chrome in the way |
| Narrow screen (SC-007) | View at 360 px width | No horizontal scrolling, no truncated question text |
| Storage unavailable (FR-020) | Open in a private window with site data blocked | App runs, states plainly that progress will not be saved |
| Disputed key warning (FR-004) | Study until a question carrying `review` appears — `IV-4-5`, `IV-7-2`, and `IV-9-5` currently do | A visible warning that the answer is disputed |

## Current state of the data

One volume of four is transcribed: `data/questions-IV.json`, 45 questions, 27 `vehicle` and 18
`firstaid`.

Three questions carry an unresolved `review` flag — `IV-4-5`, `IV-7-2`, `IV-9-5` — meaning their
answer key is doubted and the app will warn on them. Two carry a `note` — `IV-1-5`, `IV-7-4` —
recording that the source slide had a typo; these do not warn, and their keys are not in doubt.

Volumes I, II, and III are rendered to `build/pages/` but not yet transcribed. II and III will
bring per-question illustrations into `data/images/<VOLUME>/`.
