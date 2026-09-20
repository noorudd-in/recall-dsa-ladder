// All dates in the app are local calendar days stored as "YYYY-MM-DD".
// Arithmetic goes through UTC midnight so daylight-saving shifts never move a date by a day.

const pad = (n) => String(n).padStart(2, '0');
const parse = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromMs = (ms) => {
  const t = new Date(ms);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};

export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => toDateStr(new Date());

export const addDays = (s, n) => fromMs(parse(s) + n * 86400000);
/** Whole days from b to a (a - b). */
export const diffDays = (a, b) => Math.round((parse(a) - parse(b)) / 86400000);
/** 0 = Sunday. */
export const dayOfWeek = (s) => new Date(parse(s)).getUTCDay();

const fmt = (s, opts) => new Date(parse(s)).toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' });
export const formatLong = (s) => fmt(s, { weekday: 'short', month: 'short', day: 'numeric' });
export const formatMonth = (s) => fmt(s, { month: 'short' });
export const formatDay = (s) => fmt(s, { month: 'short', day: 'numeric' });
export const weekdayLetter = (s) => fmt(s, { weekday: 'narrow' });

export function relativeDay(s, today) {
  const d = diffDays(s, today);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return 'Yesterday';
  if (d > 1) return `In ${d} days`;
  return `${-d} days ago`;
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
