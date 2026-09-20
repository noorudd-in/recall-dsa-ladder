import { LADDER, describeInterval } from '../lib/srs.js';

/** The review ladder as a staircase. Each step is a wait time; the number is how many problems sit there. */
export default function Ladder({ counts }) {
  const total = counts.reduce((a, b) => a + b, 0);
  return (
    <ol className="ladder" aria-label={`Review ladder: ${total} problems across ${LADDER.length} rungs`}>
      {LADDER.map((days, i) => (
        <li key={days} className={counts[i] ? 'has' : ''} style={{ '--step': i }}>
          <span className="ladder-count" aria-label={`${counts[i]} problems on the ${describeInterval(days)} rung`}>{counts[i]}</span>
          <span className="ladder-block" />
          <span className="ladder-days">{describeInterval(days)}</span>
        </li>
      ))}
    </ol>
  );
}
