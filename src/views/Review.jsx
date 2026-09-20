import { useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import ReviewRow from '../components/ReviewRow.jsx';
import { EmptyState, Stat } from '../components/ui.jsx';
import { formatLong, plural, relativeDay } from '../lib/dates.js';
import { buildActivity, reviewQueue } from '../lib/stats.js';
import { useTracker } from '../store/TrackerContext.jsx';

const UPCOMING_PAGE = 10;

export default function Review({ go }) {
  const { state, today, catalog, actions } = useTracker();
  const queue = useMemo(() => reviewQueue(state.problems, catalog, today), [state.problems, catalog, today]);
  const reviewedToday = useMemo(() => (buildActivity(state.problems)[today] || { reviewed: 0 }).reviewed, [state.problems, today]);
  const [showAll, setShowAll] = useState(false);

  const solved = Object.keys(state.problems).length;
  const due = queue.overdue.length + queue.today.length;
  const upcoming = showAll ? queue.upcoming : queue.upcoming.slice(0, UPCOMING_PAGE);

  // Group upcoming reviews by day.
  const byDay = [];
  for (const item of upcoming) {
    const last = byDay[byDay.length - 1];
    if (last && last.date === item.due) last.items.push(item);
    else byDay.push({ date: item.due, items: [item] });
  }

  return (
    <>
      <PageHeader
        title="Review"
        subtitle="Rate how well you recalled each approach. The next review is scheduled for you."
      />

      <div className="stat-strip">
        <Stat value={queue.overdue.length} label="Need a refresh" hint="Past their review date" />
        <Stat value={queue.today.length} label="Due today" />
        <Stat value={reviewedToday} label="Reviewed today" />
        <Stat value={queue.upcoming.length} label="Scheduled later" />
      </div>

      <p className="hint">
        <b>Forgot</b> starts the ladder again. <b>Hard</b> moves down a rung. <b>Good</b> moves up one. <b>Easy</b> skips a rung. The time under each button is when you will see the problem next.
      </p>

      {solved === 0 && (
        <EmptyState title="Nothing to review yet" action={<button type="button" className="btn btn-primary" onClick={() => go('problems')}>Choose problems</button>}>
          Mark a problem as solved and its first review appears here the next day.
        </EmptyState>
      )}

      {solved > 0 && due === 0 && (
        <EmptyState title="You are all caught up" action={<button type="button" className="btn" onClick={() => go('problems')}>Solve something new</button>}>
          {queue.upcoming[0]
            ? `Next review: ${queue.upcoming[0].meta.title}, ${relativeDay(queue.upcoming[0].due, today).toLowerCase()}.`
            : 'Every review is paused, so nothing is scheduled.'}
        </EmptyState>
      )}

      {queue.overdue.length > 0 && (
        <section className="block flush" aria-labelledby="ov-title">
          <div className="section-head">
            <h2 id="ov-title">Needs a refresh</h2>
            <span className="count-pill count-overdue">{queue.overdue.length}</span>
          </div>
          <p className="block-sub">These slipped past their review date, so they are the ones you are most likely to have forgotten. Most overdue first.</p>
          <ul className="rlist">
            {queue.overdue.map((item) => <ReviewRow key={item.key} item={item} today={today} actions={actions} />)}
          </ul>
        </section>
      )}

      {queue.today.length > 0 && (
        <section className="block flush" aria-labelledby="td-title">
          <div className="section-head">
            <h2 id="td-title">Due today</h2>
            <span className="count-pill count-today">{queue.today.length}</span>
          </div>
          <ul className="rlist">
            {queue.today.map((item) => <ReviewRow key={item.key} item={item} today={today} actions={actions} />)}
          </ul>
        </section>
      )}

      {queue.upcoming.length > 0 && (
        <section className="block flush" aria-labelledby="up-title">
          <div className="section-head">
            <h2 id="up-title">Coming up</h2>
            <span className="count-pill">{queue.upcoming.length}</span>
          </div>
          {byDay.map((day) => (
            <div key={day.date} className="day-group">
              <h3 className="day-head">{relativeDay(day.date, today)}<span>{formatLong(day.date)}, {plural(day.items.length, 'problem')}</span></h3>
              <ul className="rlist">
                {day.items.map((item) => <ReviewRow key={item.key} item={item} today={today} actions={actions} early />)}
              </ul>
            </div>
          ))}
          {queue.upcoming.length > UPCOMING_PAGE && (
            <button type="button" className="btn btn-quiet" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show fewer' : `Show all ${queue.upcoming.length}`}
            </button>
          )}
        </section>
      )}
    </>
  );
}
