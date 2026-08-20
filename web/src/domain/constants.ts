/** Policy values, named once so changing a policy is a one-line edit. */

/**
 * Consecutive correct answers that retire a question from the mistakes set.
 * Two: with three options a single correct answer carries a one-in-three chance
 * of being a guess, and two consecutive cuts that to one in nine without making
 * the drill tedious.
 */
export const MASTERY_STREAK = 2

/**
 * Completed sessions kept, newest first. Enough to show recent trends, bounded
 * so stored state cannot grow without limit on a device nobody prunes.
 */
export const MAX_SESSION_HISTORY = 50
