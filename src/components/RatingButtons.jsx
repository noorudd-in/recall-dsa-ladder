import { GRADES, describeInterval, intervalFor } from '../lib/srs.js';

export default function RatingButtons({ rec, onRate }) {
  return (
    <div className="rate" role="group" aria-label="How well did you recall it?">
      {GRADES.map((g) => (
        <button key={g.id} type="button" className={`rate-btn rate-${g.id}`} onClick={() => onRate(g.id)} title={g.hint}>
          <span className="rate-label">{g.label}</span>
          <span className="rate-next">{describeInterval(intervalFor(rec, g.id))}</span>
        </button>
      ))}
    </div>
  );
}
