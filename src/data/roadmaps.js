import { blind75Problems } from './raw/blind75js.js';
import { grind75Problems } from './raw/grind75.js';
import { grind169Problems } from './raw/grind169.js';
import { neetcode150Problems } from './raw/neetcode150.js';
import { neetcode250Problems } from './raw/neetcode250.js';
import { striverSDESheet } from './raw/striverSDESheet.js';
import { striverA2ZSheet } from './raw/striverA2ZSheet.js';
import { cleanUrl, platformOf, problemKey } from '../lib/keys.js';

// To add a roadmap: drop its data file into ./raw, import it above, and add an entry here.
// Rows only need { title, url, difficulty, category } (and optionally `subtopic`).
const DEFINITIONS = [
  { id: 'blind75', name: 'Blind 75', blurb: 'The original 75 interview essentials', source: blind75Problems },
  { id: 'grind75', name: 'Grind 75', blurb: '75 problems ordered for a timed plan', source: grind75Problems },
  { id: 'grind169', name: 'Grind 169', blurb: 'Grind 75, extended to 169 problems', source: grind169Problems },
  { id: 'neetcode150', name: 'NeetCode 150', blurb: 'Topic by topic, easiest to hardest', source: neetcode150Problems },
  { id: 'neetcode250', name: 'NeetCode 250', blurb: 'NeetCode 150 plus 100 more', source: neetcode250Problems },
  { id: 'striver-sde', name: 'Striver SDE Sheet', blurb: '179 problems in a 27-day plan', source: striverSDESheet },
  { id: 'striver-a2z', name: 'Striver A2Z', blurb: 'Basics to advanced, 400+ problems', source: striverA2ZSheet },
];

const normalizeDifficulty = (d) => (d === 'Easy' || d === 'Hard' ? d : 'Medium');

function buildRoadmap(def) {
  const seen = new Set();
  const problems = [];
  for (const row of def.source) {
    const url = cleanUrl(row.url);
    const key = problemKey({ url, title: row.title });
    if (seen.has(key)) continue; // some lists link the same problem twice; count it once
    seen.add(key);
    problems.push({
      key,
      title: String(row.title).trim(),
      url,
      difficulty: normalizeDifficulty(row.difficulty),
      category: row.category || 'Other',
      subtopic: row.subtopic || null,
      platform: platformOf(url),
    });
  }
  return { id: def.id, name: def.name, blurb: def.blurb, problems };
}

export const ROADMAPS = DEFINITIONS.map(buildRoadmap);
export const ROADMAP_IDS = ROADMAPS.map((r) => r.id);
export const ROADMAP_BY_ID = Object.fromEntries(ROADMAPS.map((r) => [r.id, r]));

// One entry per unique problem across every roadmap. The first list to mention a problem supplies
// its display title, difficulty and link, so LeetCode-based lists win over the Striver sheets.
export const CATALOG = new Map();
for (const roadmap of ROADMAPS) {
  for (const p of roadmap.problems) {
    const existing = CATALOG.get(p.key);
    if (existing) {
      existing.lists.push(roadmap.id);
    } else {
      CATALOG.set(p.key, { ...p, lists: [roadmap.id] });
    }
  }
}
