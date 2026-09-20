import { addDays, diffDays } from './dates.js';

// Spaced repetition, Leitner-style. Every solved problem sits on a rung of a ladder. Each time you
// recall it correctly it climbs to a rung with a longer wait; if you forget, it drops back to the
// bottom. Rung k means "next review is LADDER[k] days after the last one".
//
// Change these numbers to make the schedule more or less aggressive.
export const LADDER = [1, 3, 7, 14, 30, 60, 120, 240];
export const LAST_STAGE = LADDER.length - 1;

export const GRADES = [
  { id: 0, label: 'Forgot', hint: 'Back to the bottom rung' },
  { id: 1, label: 'Hard', hint: 'Down one rung' },
  { id: 2, label: 'Good', hint: 'Up one rung' },
  { id: 3, label: 'Easy', hint: 'Up two rungs' },
];

export function newRecord(solvedAt) {
  return { solvedAt, stage: 0, due: addDays(solvedAt, LADDER[0]), lapses: 0, reviews: [], paused: false };
}

export function stageAfter(stage, grade) {
  if (grade === 0) return 0;
  if (grade === 1) return Math.max(0, stage - 1);
  if (grade === 2) return Math.min(LAST_STAGE, stage + 1);
  return Math.min(LAST_STAGE, stage + 2);
}

/** Days until the next review if this record were graded `grade` right now. */
export const intervalFor = (rec, grade) => LADDER[stageAfter(rec.stage, grade)];

export function applyReview(rec, grade, today) {
  const stage = stageAfter(rec.stage, grade);
  return {
    ...rec,
    stage,
    due: addDays(today, LADDER[stage]),
    lapses: rec.lapses + (grade === 0 ? 1 : 0),
    reviews: [...rec.reviews, { d: today, g: grade }],
  };
}

/** kind: 'overdue' (needs a refresh) | 'today' | 'upcoming' | null when paused. */
export function reviewStatus(rec, today) {
  if (!rec || rec.paused) return null;
  const d = diffDays(rec.due, today);
  if (d < 0) return { kind: 'overdue', days: -d };
  if (d === 0) return { kind: 'today', days: 0 };
  return { kind: 'upcoming', days: d };
}

export function describeInterval(days) {
  if (days < 60) return `${days}d`;
  return `${Math.round(days / 30)}mo`;
}
