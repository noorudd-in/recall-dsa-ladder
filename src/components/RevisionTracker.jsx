import { formatLong, plural } from '../lib/dates.js';
import { heatLevel, lastNDays } from '../lib/stats.js';

/** 90 days of revision history: one square per day, shaded by how many reviews you finished. */
export default function RevisionTracker({ activity, today, days = 90 }) {
  const list = lastNDays(activity, today, days);
  const reviews = list.reduce((sum, d) => sum + d.reviewed, 0);
  const revisedDays = list.filter((d) => d.reviewed > 0).length;
  const best = list.reduce((m, d) => (d.reviewed > m.reviewed ? d : m), list[0]);

  return (
    <div className="tracker">
      <div className="tracker-summary">
        <div><b>{reviews}</b><span>reviews done</span></div>
        <div><b>{revisedDays}</b><span>days revised</span></div>
        <div><b>{Math.round((revisedDays / days) * 100)}%</b><span>of days covered</span></div>
        <div><b>{best.reviewed}</b><span>best day{best.reviewed ? `, ${formatLong(best.date)}` : ''}</span></div>
      </div>
      <div className="tracker-grid" role="img" aria-label={`Revision history for the last ${days} days`}>
        {list.map((d) => (
          <i
            key={d.date}
            className={`heat-${heatLevel(d.reviewed)} ${d.date === today ? 'heat-today' : ''}`}
            title={`${formatLong(d.date)}: ${plural(d.reviewed, 'review')}`}
          />
        ))}
      </div>
      <div className="tracker-axis"><span>{formatLong(list[0].date)}</span><span>Today</span></div>
    </div>
  );
}
