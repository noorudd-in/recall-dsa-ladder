import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { plural, relativeDay } from '../lib/dates.js';
import { LADDER } from '../lib/srs.js';
import { DifficultyTag, PlatformTag } from './ui.jsx';
import RatingButtons from './RatingButtons.jsx';

export default function ReviewRow({ item, today, actions, early = false }) {
  const { meta, rec, status } = item;
  const [showRate, setShowRate] = useState(!early);
  const last = rec.reviews.length ? rec.reviews[rec.reviews.length - 1].d : rec.solvedAt;
  const lastText = `${rec.reviews.length ? 'Last review' : 'Solved'} ${relativeDay(last, today).toLowerCase()}`;

  return (
    <li className={`rrow rrow-${status.kind}`}>
      <div className="rrow-info">
        <div className="rrow-top">
          {status.kind === 'overdue' && <span className="chip chip-overdue">Needs refresh, {plural(status.days, 'day')} late</span>}
          {status.kind === 'today' && <span className="chip chip-today">Due today</span>}
          {status.kind === 'upcoming' && <span className="chip chip-later">In {plural(status.days, 'day')}</span>}
          <DifficultyTag level={meta.difficulty} />
          <PlatformTag platform={meta.platform} />
        </div>
        <a className="rrow-title" href={meta.url} target="_blank" rel="noopener noreferrer">
          {meta.title}
          <ExternalLink size={14} aria-hidden="true" />
        </a>
        <p className="rrow-meta">
          {lastText}. Rung {rec.stage + 1} of {LADDER.length}
          {rec.lapses > 0 ? `, forgotten ${plural(rec.lapses, 'time')}` : ''}.
        </p>
      </div>
      <div className="rrow-actions">
        {showRate ? (
          <RatingButtons rec={rec} onRate={(g) => actions.review(item.key, g)} />
        ) : (
          <button type="button" className="btn btn-quiet" onClick={() => setShowRate(true)}>Review early</button>
        )}
      </div>
    </li>
  );
}
