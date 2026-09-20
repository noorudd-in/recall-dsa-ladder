// Custom, user-created lists live in the same localStorage blob as everything else (see storage.js).
// A custom list's problems use the exact same shape as a static roadmap's problems (src/data/roadmaps.js),
// keyed through the same `problemKey`, so completion is shared automatically — a problem solved in a
// custom list shows solved everywhere else it appears, and vice versa.
import { cleanUrl, platformOf, problemKey } from './keys.js';

const DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard']);

export function makeListId() {
  const rand = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `custom:${rand}`;
}

/** Builds one problem entry for a custom list from raw user/API input. */
export function makeProblemEntry({ title, url, difficulty, category, subtopic }) {
  const cleaned = cleanUrl((url || '').trim()) || null;
  const key = problemKey({ url: cleaned, title });
  return {
    key,
    title: String(title || '').trim() || 'Untitled problem',
    url: cleaned,
    difficulty: DIFFICULTIES.has(difficulty) ? difficulty : 'Medium',
    category: (category || 'Other').trim() || 'Other',
    subtopic: subtopic ? String(subtopic).trim() || null : null,
    platform: platformOf(cleaned),
  };
}

/** Shapes a stored custom list into the same object roadmaps.js exposes for static roadmaps. */
export function buildCustomRoadmap(list) {
  return { id: list.id, name: list.name, blurb: list.blurb || 'Your custom list', problems: list.problems, isCustom: true };
}

/** Defensive validation for data coming out of localStorage or an imported backup file. */
export function sanitizeCustomLists(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seenIds = new Set();
  for (const l of raw) {
    if (!l || typeof l !== 'object' || typeof l.id !== 'string' || !l.id.startsWith('custom:')) continue;
    if (seenIds.has(l.id)) continue;
    const name = typeof l.name === 'string' && l.name.trim() ? l.name.trim() : null;
    if (!name) continue;
    seenIds.add(l.id);

    const seenKeys = new Set();
    const problems = [];
    for (const row of Array.isArray(l.problems) ? l.problems : []) {
      if (!row || typeof row !== 'object' || !row.title) continue;
      const entry = makeProblemEntry(row);
      if (seenKeys.has(entry.key)) continue;
      seenKeys.add(entry.key);
      problems.push(entry);
    }

    out.push({
      id: l.id,
      name,
      blurb: typeof l.blurb === 'string' ? l.blurb.trim() : '',
      createdAt: typeof l.createdAt === 'string' ? l.createdAt : '',
      problems,
    });
  }
  return out;
}
