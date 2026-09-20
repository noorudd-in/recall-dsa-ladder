// Client for the /api/leetcode Vercel serverless proxy (see api/leetcode.js for why a proxy is needed).
// Locally this only works under `vercel dev`; plain `vite dev` has no /api routes.

export async function searchLeetCode(query, { limit = 20 } = {}) {
  const url = `/api/leetcode?action=search&q=${encodeURIComponent(query)}&limit=${limit}`;
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new Error('Could not reach the LeetCode search endpoint. If you are running locally, use `vercel dev` instead of `vite dev`.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.error) throw new Error(data?.error || 'LeetCode search failed');

  return data.questions.map((q) => ({
    title: q.title,
    url: `https://leetcode.com/problems/${q.titleSlug}/`,
    difficulty: q.difficulty,
    category: q.tags[0] || 'Other',
    subtopic: null,
    tags: q.tags,
  }));
}

export function leetCodeSlugFromUrl(url) {
  const m = /leetcode\.com\/problems\/([a-z0-9-]+)/i.exec(url || '');
  return m ? m[1].toLowerCase() : null;
}

export async function fetchLeetCodeBySlug(slug) {
  const res = await fetch(`/api/leetcode?action=detail&slug=${encodeURIComponent(slug)}`);
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.error) throw new Error(data?.error || 'Problem not found');
  return {
    title: data.title,
    url: `https://leetcode.com/problems/${data.titleSlug}/`,
    difficulty: data.difficulty,
    category: data.tags[0] || 'Other',
    subtopic: null,
  };
}
