import { useMemo } from 'react';
import Heatmap, { HeatLegend } from '../components/Heatmap.jsx';
import PageHeader from '../components/PageHeader.jsx';
import RevisionTracker from '../components/RevisionTracker.jsx';
import { Stat } from '../components/ui.jsx';
import { plural } from '../lib/dates.js';
import { buildActivity, computeStreaks, lastNDays } from '../lib/stats.js';
import { useTracker } from '../store/TrackerContext.jsx';

export default function Activity() {
  const { state, today } = useTracker();
  const activity = useMemo(() => buildActivity(state.problems), [state.problems]);
  const streak = useMemo(() => computeStreaks(activity, today), [activity, today]);

  const year = useMemo(() => lastNDays(activity, today, 365), [activity, today]);
  const yearTotal = year.reduce((n, d) => n + d.total, 0);
  const solvedTotal = Object.keys(state.problems).length;
  const reviewsTotal = Object.values(state.problems).reduce((n, r) => n + r.reviews.length, 0);

  const message = streak.current === 0
    ? 'Solve or review one problem today to start a streak.'
    : streak.activeToday
      ? `You have practised ${plural(streak.current, 'day')} in a row, including today.`
      : `Practise today to keep your ${plural(streak.current, 'day')} streak alive.`;

  return (
    <>
      <PageHeader title="Activity" subtitle={message} />

      <div className="stat-strip">
        <Stat value={streak.current} label="Current streak" hint={streak.current === 1 ? 'day' : 'days'} />
        <Stat value={streak.longest} label="Longest streak" hint={streak.longest === 1 ? 'day' : 'days'} />
        <Stat value={streak.activeDays} label="Active days" hint="since you started" />
        <Stat value={solvedTotal} label="Problems solved" />
        <Stat value={reviewsTotal} label="Reviews done" />
      </div>

      <section className="block flush" aria-labelledby="hm-title">
        <div className="section-head">
          <h2 id="hm-title">The past year</h2>
          <HeatLegend />
        </div>
        <p className="block-sub">{plural(yearTotal, 'action')} in the last 365 days. Solving a problem and finishing a review both count.</p>
        <Heatmap activity={activity} today={today} />
      </section>

      <section className="block flush" aria-labelledby="rv-title">
        <div className="section-head">
          <h2 id="rv-title">Revision history, last 90 days</h2>
          <HeatLegend />
        </div>
        <p className="block-sub">One square per day, darker when you finished more reviews. Gaps show where your memory had time to fade.</p>
        <RevisionTracker activity={activity} today={today} />
      </section>
    </>
  );
}
