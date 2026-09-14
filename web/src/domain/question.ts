/** The shape of one exam question, as produced by the extraction pipeline. */

export type QuestionId = string
export type VolumeKey = string
export type CategoryKey = string

export type QuestionKind = 'choice' | 'order'

interface QuestionBase {
  readonly id: QuestionId
  /** Source deck, e.g. "IV". With `page`, locates the slide for verification. */
  readonly volume: VolumeKey
  /** Slide number within the volume. Provenance is not optional. */
  readonly page: number
  readonly category: CategoryKey
  /** Montenegrin, verbatim from the source. Never translated or paraphrased. */
  readonly text: string
  /**
   * Runtime URL of the illustration, when the question has one. The data file
   * holds a bare filename; build-content resolves it to a URL so nothing in the
   * app has to know where images live.
   */
  readonly imageUrl?: string
  /**
   * Present only when the answer key itself is doubted. Its presence is what
   * warns the learner — never use it for anything else.
   */
  readonly review?: string
  /** Editorial remark, most often a corrected source typo. Never warns. */
  readonly note?: string
}

/** Pick one of the printed options. Everything in volume IV. */
export interface ChoiceQuestion extends QuestionBase {
  readonly kind: 'choice'
  /** Ordered; `correct` indexes into this, so the order is meaningful. */
  readonly options: readonly string[]
  readonly correct: number
}

/**
 * "In the situation shown, the order of passing is ___". The source prints no
 * options at all — the answer is the sequence of vehicle numbers marked on the
 * photograph. Modelling this as a choice question would mean inventing
 * distractors the examiner never wrote.
 */
export interface OrderQuestion extends QuestionBase {
  readonly kind: 'order'
  /** Digits separated by single spaces, e.g. "1 3 2". */
  readonly answer: string
}

export type Question = ChoiceQuestion | OrderQuestion

/** An index for a choice question, a sequence string for an order question. */
export type AnswerValue = number | string

export interface VolumeMeta {
  readonly volume: VolumeKey
  readonly title: string
  readonly questionCount: number
  readonly imageCount: number
  readonly withImages: number
}

/** True when this question's answer key is doubted and the learner must be told. */
export function isDisputed(question: Question): boolean {
  return question.review !== undefined
}

/** Spacing in a sequence is presentation, not meaning: "1 3 2" equals "132". */
export function normaliseOrder(value: string): string {
  return value.replace(/\s+/g, '')
}

/**
 * The vehicle numbers a learner has to choose from — every vehicle marked on
 * the photograph, i.e. 1..N for the highest number the answer names. Usually
 * that is exactly the answer's own digits, but a few questions ask only which
 * of several pictured vehicles gets to pass ("1 4" out of four vehicles
 * shown): offering just "1" and "4" would hand over the half of the answer
 * that is actually being tested — which vehicles may pass at all — leaving
 * only their order to guess.
 */
export function orderTokens(question: OrderQuestion): readonly string[] {
  const digits = normaliseOrder(question.answer).split('').map(Number)
  const highest = Math.max(...digits)
  return Array.from({ length: highest }, (_, i) => String(i + 1))
}

/**
 * How many vehicles the answer places, i.e. how many slots to fill. Fewer than
 * the tokens on offer whenever the question asks only about the vehicles
 * allowed to pass.
 */
export function orderSlots(question: OrderQuestion): number {
  return normaliseOrder(question.answer).length
}
