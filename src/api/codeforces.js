// Codeforces' public API sends CORS headers for third-party origins, so it can be called directly
// from the browser (no serverless proxy needed, unlike LeetCode — see src/api/leetcode.js).
// The problem set is fetched once (~1-2MB) and cached in memory + sessionStorage, then filtered
// client-side for search.

const CACHE_KEY = 'recall.cf-problems.v1';
let cache = null;

function bucketDifficulty(rating) {
  if (!rating) return 'Medium';
  if (rating <= 1200) return 'Easy';
  if (rating <= 1900) return 'Medium';
  return 'Hard';
}

async function loadAll() {
  if (cache) return cache;

  try {
    const stored = sessionStorage.getItem(CACHE_KEY);
    if (stored) {
      cache = JSON.parse(stored);
      return cache;
    }
  } catch {
    /* ignore corrupt cache */
  }

  let res;
  try {
    res = await fetch('https://codeforces.com/api/problemset.problems');
  } catch {
    throw new Error('Could not reach the Codeforces API.');
  }
  const json = await res.json().catch(() => null);
  if (!json || json.status !== 'OK') throw new Error('Codeforces search failed');

  cache = json.result.problems.map((p) => ({
    title: p.name,
    url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
    difficulty: bucketDifficulty(p.rating),
    category: p.tags[0] || 'Other',
    subtopic: null,
    tags: p.tags,
    rating: p.rating || null,
  }));

  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage full or blocked, fine to skip caching */
  }
  return cache;
}

export function codeforcesIdFromUrl(url) {
  const m = /codeforces\.com\/(?:contest|problemset\/problem|gym)\/(\d+)\/(?:problem\/)?([a-zA-Z0-9]+)/i.exec(url || '');
  return m ? { contestId: Number(m[1]), index: m[2].toUpperCase() } : null;
}

export async function fetchCodeforcesByUrl(url) {
  const ref = codeforcesIdFromUrl(url);
  if (!ref) throw new Error('Not a recognizable Codeforces problem URL');
  const all = await loadAll();
  const found = all.find((p) => p.url.endsWith(`/${ref.contestId}/${ref.index}`));
  if (!found) throw new Error('Problem not found');
  return found;
}

export async function searchCodeforces(query, { tag, limit = 50 } = {}) {
  const all = await loadAll();
  const q = query.trim().toLowerCase();
  const t = tag?.trim().toLowerCase();
  const filtered = all.filter((p) => {
    if (q && !p.title.toLowerCase().includes(q)) return false;
    if (t && !p.tags.some((x) => x.toLowerCase() === t)) return false;
    return true;
  });
  return filtered.slice(0, limit);
}
