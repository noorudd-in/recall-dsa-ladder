import { addDays, dayOfWeek, diffDays } from './dates.js';
import { LADDER, reviewStatus } from './srs.js';

const DIFFS = ['Easy', 'Medium', 'Hard'];
const emptyDiff = () => ({ Easy: { solved: 0, total: 0 }, Medium: { solved: 0, total: 0 }, Hard: { solved: 0, total: 0 } });

/** Progress for one roadmap (rows use the roadmap's own difficulty labels). */
export function roadmapProgress(roadmap, problems) {
  const byDiff = emptyDiff();
  let solved = 0;
  for (const p of roadmap.problems) {
    const done = Boolean(problems[p.key]);
    byDiff[p.difficulty].total++;
    if (done) {
      solved++;
      byDiff[p.difficulty].solved++;
    }
  }
  const total = roadmap.problems.length;
  return { total, solved, pct: total ? Math.round((solved / total) * 100) : 0, byDiff };
}

/** Progress across every unique problem in every roadmap. */
export function overallProgress(catalog, problems) {
  const byDiff = emptyDiff();
  let solved = 0;
  for (const meta of catalog.values()) {
    const done = Boolean(problems[meta.key]);
    byDiff[meta.difficulty].total++;
    if (done) {
      solved++;
      byDiff[meta.difficulty].solved++;
    }
  }
  const total = catalog.size;
  return { total, solved, pct: total ? Math.round((solved / total) * 100) : 0, byDiff };
}

export function categoryProgress(roadmap, problems) {
  const map = new Map();
  for (const p of roadmap.problems) {
    if (!map.has(p.category)) map.set(p.category, { name: p.category, total: 0, solved: 0 });
    const c = map.get(p.category);
    c.total++;
    if (problems[p.key]) c.solved++;
  }
  return [...map.values()];
}

/** { 'YYYY-MM-DD': { solved, reviewed } } derived from the records themselves. */
export function buildActivity(problems) {
  const map = {};
  const bump = (d, field) => {
    if (!map[d]) map[d] = { solved: 0, reviewed: 0 };
    map[d][field]++;
  };
  for (const rec of Object.values(problems)) {
    bump(rec.solvedAt, 'solved');
    for (const r of rec.reviews) bump(r.d, 'reviewed');
  }
  return map;
}

export const dayTotal = (activity, d) => (activity[d] ? activity[d].solved + activity[d].reviewed : 0);

export function computeStreaks(activity, today) {
  const active = (d) => dayTotal(activity, d) > 0;
  // A streak stays alive through today even if you haven't practised yet.
  let cursor = active(today) ? today : addDays(today, -1);
  let current = 0;
  while (active(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  const days = Object.keys(activity).filter(active).sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const d of days) {
    run = prev && diffDays(d, prev) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = d;
  }
  return { current, longest, activeDays: days.length, activeToday: active(today) };
}

export function heatLevel(total) {
  if (total <= 0) return 0;
  if (total === 1) return 1;
  if (total <= 3) return 2;
  if (total <= 6) return 3;
  return 4;
}

/** The last `n` days ending today, oldest first. */
export function lastNDays(activity, today, n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const a = activity[date] || { solved: 0, reviewed: 0 };
    out.push({ date, solved: a.solved, reviewed: a.reviewed, total: a.solved + a.reviewed });
  }
  return out;
}

/** Weeks (Sunday-first columns) covering the past year, for the heatmap. */
export function heatmapWeeks(activity, today, weeks = 53) {
  const start = addDays(today, -dayOfWeek(today) - (weeks - 1) * 7);
  const cols = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      if (diffDays(date, today) > 0) {
        col.push(null);
        continue;
      }
      const a = activity[date] || { solved: 0, reviewed: 0 };
      col.push({ date, solved: a.solved, reviewed: a.reviewed, level: heatLevel(a.solved + a.reviewed) });
    }
    cols.push(col);
  }
  return cols;
}

/** Every solved, un-paused problem with its schedule status, most urgent first. */
export function reviewQueue(problems, catalog, today) {
  const items = [];
  for (const [key, rec] of Object.entries(problems)) {
    const meta = catalog.get(key);
    const status = reviewStatus(rec, today);
    if (!meta || !status) continue;
    items.push({ key, meta, rec, status, due: rec.due });
  }
  items.sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.meta.title.localeCompare(b.meta.title)));
  return {
    overdue: items.filter((i) => i.status.kind === 'overdue'),
    today: items.filter((i) => i.status.kind === 'today'),
    upcoming: items.filter((i) => i.status.kind === 'upcoming'),
  };
}

/** How many problems sit on each rung of the ladder. */
export function ladderCounts(problems) {
  const counts = LADDER.map(() => 0);
  for (const rec of Object.values(problems)) if (!rec.paused) counts[rec.stage]++;
  return counts;
}

/** Reviews due on each of the next `n` days. Anything overdue is folded into today. */
export function forecast(problems, today, n = 14) {
  const days = Array.from({ length: n }, (_, i) => ({ date: addDays(today, i), count: 0 }));
  for (const rec of Object.values(problems)) {
    if (rec.paused) continue;
    const offset = Math.max(0, diffDays(rec.due, today));
    if (offset < n) days[offset].count++;
  }
  return days;
}

export const DIFFICULTIES = DIFFS;
