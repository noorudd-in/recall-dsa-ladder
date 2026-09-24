import { addDays } from './dates.js';
import { LADDER, LAST_STAGE } from './srs.js';
import { sanitizeCustomLists } from './customLists.js';

export const STORAGE_KEY = 'recall.v1';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const freshState = (active = 'neetcode150') => ({ v: 1, active, problems: {}, stars: {}, customLists: [] });

/** Accepts anything (old data, hand-edited backups) and returns a valid state. */
export function sanitizeState(raw, validRoadmapIds = []) {
  const out = freshState();
  if (!raw || typeof raw !== 'object') return out;
  out.customLists = sanitizeCustomLists(raw.customLists);
  const validIds = [...validRoadmapIds, ...out.customLists.map((l) => l.id)];
  if (typeof raw.active === 'string' && (validIds.length === 0 || validIds.includes(raw.active))) {
    out.active = raw.active;
  }
  for (const [key, r] of Object.entries(raw.problems || {})) {
    if (!r || typeof r !== 'object' || !DATE_RE.test(r.solvedAt)) continue;
    const stage = Number.isInteger(r.stage) ? Math.min(Math.max(r.stage, 0), LAST_STAGE) : 0;
    const reviews = Array.isArray(r.reviews)
      ? r.reviews.filter((x) => x && DATE_RE.test(x.d) && [0, 1, 2, 3].includes(x.g)).map((x) => ({ d: x.d, g: x.g }))
      : [];
    out.problems[key] = {
      solvedAt: r.solvedAt,
      stage,
      due: DATE_RE.test(r.due) ? r.due : addDays(r.solvedAt, LADDER[stage]),
      lapses: Number.isInteger(r.lapses) && r.lapses >= 0 ? r.lapses : 0,
      reviews,
      paused: r.paused === true,
    };
  }
  for (const [key, v] of Object.entries(raw.stars || {})) if (v) out.stars[key] = true;
  return out;
}

export function loadState(validRoadmapIds) {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return freshState();
    return sanitizeState(JSON.parse(text), validRoadmapIds);
  } catch {
    return freshState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false; // storage full or blocked (private mode). The app keeps working in memory.
  }
}

export function exportPayload(state) {
  return JSON.stringify({ app: 'recall', version: 1, exportedAt: new Date().toISOString(), data: state }, null, 2);
}

/** Returns { ok, state?, error? }. Accepts a full backup file or a bare state object. */
export function parseImport(text, validRoadmapIds) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }

  if (json && json.app === 'recall-custom-list') {
    const list = json.list && typeof json.list === 'object' ? json.list : null;
    const customLists = list ? sanitizeCustomLists([list]) : [];
    if (!customLists.length) {
      return { ok: false, error: 'That file does not contain a valid custom list snapshot.' };
    }
    const state = {
      v: 1,
      active: customLists[0].id,
      problems: typeof json.problems === 'object' ? json.problems : {},
      stars: typeof json.stars === 'object' ? json.stars : {},
      customLists,
    };
    return { ok: true, state: sanitizeState(state, validRoadmapIds) };
  }

  const data = json && json.data && json.app === 'recall' ? json.data : json;
  if (!data || typeof data !== 'object' || typeof data.problems !== 'object') {
    return { ok: false, error: 'That file does not look like a Recall backup.' };
  }
  return { ok: true, state: sanitizeState(data, validRoadmapIds) };
}
