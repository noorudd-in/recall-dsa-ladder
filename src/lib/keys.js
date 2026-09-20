// Canonical problem identity.
//
// Progress is stored per *problem*, never per roadmap. Every roadmap entry is mapped to a
// stable key, so solving "Two Sum" in one list marks it solved in every list that contains it.
//
// LeetCode problems are keyed by slug, GeeksforGeeks problems by slug, and everything else
// (takeUforward articles, Coding Ninjas, bit.ly links...) by host + path. Query strings and
// tracking parameters are ignored so the same problem always maps to the same key.

// A few LeetCode problems have been reachable under more than one slug over the years.
const LC_ALIASES = {
  'coin-change-ii': 'coin-change-2',
  'implement-strstr': 'find-the-index-of-the-first-occurrence-in-a-string',
  'add-and-search-word-data-structure-design': 'design-add-and-search-words-data-structure',
};

// Optional: map one key onto another when two different links are really the same problem.
// Left empty on purpose: merging rows would change the totals of the sheets you imported.
const KEY_ALIASES = {};

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function problemKey(p) {
  const key = rawKey(p);
  return KEY_ALIASES[key] || key;
}

function rawKey({ url, title }) {
  const raw = (url || '').trim();

  const lc = /leetcode\.com\/(?:accounts\/login\/\?next=\/)?problems\/([a-z0-9-]+)/i.exec(raw);
  if (lc) {
    const slug = lc[1].toLowerCase();
    return `lc:${LC_ALIASES[slug] || slug}`;
  }

  const gfg = /geeksforgeeks\.org\/problems\/([^/?#]+)/i.exec(raw);
  if (gfg) return `gfg:${gfg[1].toLowerCase()}`;

  const cf = /codeforces\.com\/(?:contest\/(\d+)\/problem\/([a-zA-Z0-9]+)|problemset\/problem\/(\d+)\/([a-zA-Z0-9]+)|gym\/(\d+)\/problem\/([a-zA-Z0-9]+))/i.exec(raw);
  if (cf) {
    const id = cf[1] || cf[3] || cf[5];
    const index = (cf[2] || cf[4] || cf[6]).toUpperCase();
    return `cf:${id}${index}`;
  }

  if (raw) {
    try {
      const u = new URL(raw);
      const host = u.hostname.replace(/^www\./, '').toLowerCase();
      if (host === 'youtube.com' && u.searchParams.get('v')) return `yt:${u.searchParams.get('v')}`;
      if (host === 'youtu.be') return `yt:${u.pathname.replace(/\//g, '')}`;
      const path = u.pathname.replace(/\/+$/, '').toLowerCase();
      return `url:${host}${path}`;
    } catch {
      /* fall through to title */
    }
  }
  return `t:${slugify(title || 'untitled')}`;
}

export function platformOf(url) {
  const u = (url || '').toLowerCase();
  if (u.includes('leetcode.com')) return { id: 'lc', label: 'LeetCode' };
  if (u.includes('geeksforgeeks.org')) return { id: 'gfg', label: 'GeeksforGeeks' };
  if (u.includes('codeforces.com')) return { id: 'cf', label: 'Codeforces' };
  if (u.includes('takeuforward.org')) return { id: 'tuf', label: 'takeUforward' };
  if (u.includes('codingninjas.com') || u.includes('naukri.com')) return { id: 'cn', label: 'Coding Ninjas' };
  if (u.includes('interviewbit.com')) return { id: 'ib', label: 'InterviewBit' };
  if (u.includes('youtube.com') || u.includes('youtu.be')) return { id: 'yt', label: 'YouTube' };
  if (u.includes('bit.ly')) return { id: 'link', label: 'Link' };
  return { id: 'link', label: 'Link' };
}

// The Striver sheets use old GFG hostnames and a login-wall LeetCode redirect. Clean them so the
// "open problem" button lands on the real page.
export function cleanUrl(url) {
  if (!url) return url;
  let out = url;
  const login = /leetcode\.com\/accounts\/login\/\?next=(\/problems\/[a-z0-9-]+\/?)/i.exec(out);
  if (login) out = `https://leetcode.com${login[1]}`;
  out = out.replace('://practice.geeksforgeeks.org/problems/', '://www.geeksforgeeks.org/problems/');
  if (/geeksforgeeks\.org\/problems\//.test(out)) out = out.split('?')[0];
  return out;
}
