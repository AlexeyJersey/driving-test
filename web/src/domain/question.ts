/** The shape of one exam question, as produced by the extraction pipeline. */

export type QuestionId = string
export type VolumeKey = string
export type CategoryKey = string

export interface Question {
  readonly id: QuestionId
  /** Source deck, e.g. "IV". With `page`, locates the slide for verification. */
  readonly volume: VolumeKey
  /** Slide number within the volume. Provenance is not optional. */
  readonly page: number
  readonly category: CategoryKey
  /** Montenegrin, verbatim from the source. Never translated or paraphrased. */
  readonly text: string
  /** Ordered; `correct` indexes into this, so the order is meaningful. */
  readonly options: readonly string[]
  readonly correct: number
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

/** Reads an option by index without pretending the index is always in range. */
export function optionAt(question: Question, index: number): string | undefined {
  return question.options[index]
}
