import { formatLong, weekdayLetter } from '../lib/dates.js';

export default function Forecast({ days, overdue }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="forecast" role="img" aria-label="Reviews due over the next 14 days">
      {days.map((d, i) => (
        <div key={d.date} className={`fc-col ${i === 0 ? 'is-today' : ''}`} title={`${formatLong(d.date)}: ${d.count} due${i === 0 && overdue ? ` (${overdue} overdue)` : ''}`}>
          <span className="fc-num">{d.count || ''}</span>
          <span className="fc-bar"><i style={{ height: `${(d.count / max) * 100}%` }} /></span>
          <span className="fc-day">{weekdayLetter(d.date)}</span>
        </div>
      ))}
    </div>
  );
}
