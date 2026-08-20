/**
 * Turns the question bank in `data/` into a typed bundle the app can import.
 *
 * This runs before `dev` and before `build`, and it is the only gate between a
 * hand-edited data file and the application. A malformed correction must fail
 * here — in the maintainer's terminal, at the moment they broke it — rather than
 * reaching a learner mid-study. See specs/001-offline-ticket-trainer/contracts/
 * question-data.md for the rules this enforces and why each one exists.
 */
import { readdir, readFile, mkdir, rm, cp, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = path.resolve(WEB, '..')
const DATA = path.join(ROOT, 'data')
const IMAGES_SRC = path.join(DATA, 'images')
const GENERATED = path.join(WEB, 'src', 'generated')
const IMAGES_OUT = path.join(WEB, 'public', 'images')
/**
 * Same variable vite.config.ts reads for its `base`. Image URLs are baked into
 * the generated bundle at this build, so they need the deploy's base path too —
 * a GitHub Pages project site serves from /driving-test/, not the domain root,
 * and a hardcoded "/images/..." resolved against the root instead and 404'd.
 */
const APP_BASE = (process.env.APP_BASE ?? '/').replace(/\/+$/, '') || ''
const IMAGE_URL_BASE = `${APP_BASE}/images`

/** Volume order for display: the decks are numbered with Roman numerals. */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

const errors = []
const fail = (where, message) => errors.push(`${where}: ${message}`)

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0

function validateQuestion(q, volume, index, seenIds, imageFiles) {
  const where = `${volume}[${index}]${isNonEmptyString(q?.id) ? ` id=${q.id}` : ''}`

  if (!q || typeof q !== 'object') {
    fail(where, 'not an object')
    return null
  }
  if (!isNonEmptyString(q.id)) {
    fail(where, 'missing id — ids are the join key to learner progress and cannot be absent')
    return null
  }
  if (seenIds.has(q.id)) {
    fail(where, `duplicate id, already used by ${seenIds.get(q.id)} — two questions would share one learner history`)
    return null
  }
  seenIds.set(q.id, where)

  if (!isNonEmptyString(q.text)) fail(where, 'text is empty')
  if (!Number.isInteger(q.page) || q.page < 1) {
    fail(where, `page must be a positive integer, got ${JSON.stringify(q.page)} — provenance is how an answer key gets verified`)
  }
  if (!isNonEmptyString(q.category)) fail(where, 'category is empty')

  const kind = q.kind === undefined ? 'choice' : q.kind
  if (kind !== 'choice' && kind !== 'order') {
    fail(where, `kind must be "choice" or "order", got ${JSON.stringify(q.kind)}`)
    return null
  }

  if (kind === 'order') {
    // A sequence answer has no index to point at, so options and correct must be
    // absent rather than empty — an empty options array would read as a choice
    // question someone forgot to fill in.
    if (!isNonEmptyString(q.answer) || !/^[1-9](?: [1-9])*$/.test(q.answer)) {
      fail(where, `order question needs answer as digits separated by single spaces, got ${JSON.stringify(q.answer)}`)
    } else if (new Set(q.answer.split(' ')).size !== q.answer.split(' ').length) {
      fail(where, `order answer ${JSON.stringify(q.answer)} repeats a vehicle number`)
    }
    if ('options' in q) fail(where, 'order question must not carry options')
    if ('correct' in q) fail(where, 'order question must not carry correct')
  } else {
    if ('answer' in q) fail(where, 'choice question must not carry answer')
    if (!Array.isArray(q.options) || q.options.length < 2) {
      fail(where, `needs at least two options, got ${Array.isArray(q.options) ? q.options.length : 'none'}`)
    } else {
      q.options.forEach((opt, i) => {
        if (!isNonEmptyString(opt)) fail(where, `option ${i} is empty`)
      })
      if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.options.length) {
        fail(where, `correct must be an integer in [0, ${q.options.length}), got ${JSON.stringify(q.correct)}`)
      }
    }
  }

  for (const field of ['review', 'note']) {
    if (field in q && q[field] !== undefined && !isNonEmptyString(q[field])) {
      fail(where, `${field} is present but empty — a flag that explains nothing is worse than no flag`)
    }
  }

  let imageUrl = null
  if (isNonEmptyString(q.image)) {
    if (!imageFiles.has(q.image)) {
      fail(where, `image "${q.image}" not found in data/images/${volume}/ — a picture question without its picture is unanswerable`)
    }
    imageUrl = `${IMAGE_URL_BASE}/${volume}/${q.image}`
  }

  return {
    id: q.id,
    kind,
    volume,
    page: q.page,
    category: q.category,
    text: q.text,
    ...(kind === 'order' ? { answer: q.answer } : { options: q.options, correct: q.correct }),
    ...(imageUrl ? { imageUrl } : {}),
    ...(isNonEmptyString(q.review) ? { review: q.review } : {}),
    ...(isNonEmptyString(q.note) ? { note: q.note } : {}),
  }
}

async function imageFilesFor(volume) {
  const dir = path.join(IMAGES_SRC, volume)
  // Every volume transcribed so far is text-only. An absent directory is normal.
  if (!existsSync(dir)) return new Set()
  const entries = await readdir(dir, { withFileTypes: true })
  return new Set(entries.filter((e) => e.isFile()).map((e) => e.name))
}

async function main() {
  if (!existsSync(DATA)) {
    console.error(`build-content: no data directory at ${DATA}`)
    process.exit(1)
  }

  const files = (await readdir(DATA))
    .filter((f) => /^questions-.+\.json$/.test(f))
    .sort()

  if (files.length === 0) {
    console.error(`build-content: no questions-*.json in ${DATA}`)
    process.exit(1)
  }

  const seenIds = new Map()
  const volumes = []
  const questions = []

  for (const file of files) {
    const where = `data/${file}`
    let deck
    try {
      deck = JSON.parse(await readFile(path.join(DATA, file), 'utf8'))
    } catch (err) {
      fail(where, `not valid JSON — ${err.message}`)
      continue
    }
    if (!isNonEmptyString(deck.volume)) {
      fail(where, 'missing "volume"')
      continue
    }
    if (!Array.isArray(deck.questions) || deck.questions.length === 0) {
      fail(where, 'missing or empty "questions"')
      continue
    }

    const volume = deck.volume
    const imageFiles = await imageFilesFor(volume)
    let withImages = 0

    for (const [i, raw] of deck.questions.entries()) {
      const q = validateQuestion(raw, volume, i, seenIds, imageFiles)
      if (q) {
        questions.push(q)
        if (q.imageUrl) withImages += 1
      }
    }

    volumes.push({
      volume,
      title: isNonEmptyString(deck.title) ? deck.title : volume,
      order: ROMAN.indexOf(volume) === -1 ? ROMAN.length : ROMAN.indexOf(volume),
      questionCount: deck.questions.length,
      imageCount: imageFiles.size,
      withImages,
    })
  }

  if (errors.length > 0) {
    console.error(`\nbuild-content: ${errors.length} problem(s) in the question data:\n`)
    for (const e of errors) console.error(`  • ${e}`)
    console.error('\nFix the data in data/ and run again. Nothing was generated.\n')
    process.exit(1)
  }

  volumes.sort((a, b) => a.order - b.order)

  // Copy illustrations. Rebuilt from scratch so a removed image cannot linger.
  await rm(IMAGES_OUT, { recursive: true, force: true })
  let copied = 0
  for (const { volume } of volumes) {
    const src = path.join(IMAGES_SRC, volume)
    if (!existsSync(src)) continue
    await cp(src, path.join(IMAGES_OUT, volume), { recursive: true })
    copied += (await readdir(src)).length
  }

  await mkdir(GENERATED, { recursive: true })
  const banner = [
    '// GENERATED FILE — do not edit.',
    '// Produced by scripts/build-content.mjs from data/questions-*.json.',
    '// Edit the data, not this file, then re-run `npm run content`.',
    '',
  ].join('\n')
  await writeFile(
    path.join(GENERATED, 'content.ts'),
    banner +
      "import type { Question, VolumeMeta } from '@/domain/question'\n\n" +
      `export const volumes: readonly VolumeMeta[] = ${JSON.stringify(volumes.map(({ order: _order, ...v }) => v), null, 2)}\n\n` +
      `export const questions: readonly Question[] = ${JSON.stringify(questions, null, 2)}\n`,
    'utf8',
  )

  const flagged = questions.filter((q) => q.review).length
  const noted = questions.filter((q) => q.note).length
  console.log(
    `build-content: ${questions.length} questions from ${volumes.length} volume(s) ` +
      `(${volumes.map((v) => v.volume).join(', ')}); ` +
      `${flagged} with a disputed key, ${noted} with an editorial note; ` +
      `${copied} illustration(s) copied`,
  )
}

await main()
