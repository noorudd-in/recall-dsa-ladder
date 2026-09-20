import { useEffect, useMemo, useRef } from 'react';
import { formatLong, formatMonth, plural } from '../lib/dates.js';
import { heatmapWeeks } from '../lib/stats.js';

const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 30;
const TOP = 20;

export default function Heatmap({ activity, today }) {
  const cols = useMemo(() => heatmapWeeks(activity, today), [activity, today]);
  const scroller = useRef(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [today]);

  const months = [];
  let last = '';
  cols.forEach((col, i) => {
    const first = col.find(Boolean);
    if (!first) return;
    const m = formatMonth(first.date);
    if (m !== last && (months.length === 0 || i - months[months.length - 1].i >= 3)) months.push({ i, m });
    last = m;
  });

  const width = LEFT + cols.length * STEP;
  const height = TOP + 7 * STEP;

  return (
    <div className="heatmap" ref={scroller}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily activity over the past year">
        {months.map(({ i, m }) => (
          <text key={i} x={LEFT + i * STEP} y={11} className="hm-label">{m}</text>
        ))}
        {[1, 3, 5].map((row) => (
          <text key={row} x={0} y={TOP + row * STEP + CELL - 2} className="hm-label">{['Mon', 'Wed', 'Fri'][(row - 1) / 2]}</text>
        ))}
        {cols.map((col, x) =>
          col.map((cell, y) =>
            cell ? (
              <rect
                key={cell.date}
                x={LEFT + x * STEP}
                y={TOP + y * STEP}
                width={CELL}
                height={CELL}
                rx={3}
                className={`heat heat-${cell.level} ${cell.date === today ? 'heat-today' : ''}`}
              >
                <title>
                  {cell.solved + cell.reviewed === 0
                    ? `No activity on ${formatLong(cell.date)}`
                    : `${formatLong(cell.date)}: ${plural(cell.solved, 'problem')} solved, ${plural(cell.reviewed, 'review')}`}
                </title>
              </rect>
            ) : null,
          ),
        )}
      </svg>
    </div>
  );
}

export function HeatLegend() {
  return (
    <div className="heat-legend" aria-hidden="true">
      <span>Less</span>
      {[0, 1, 2, 3, 4].map((l) => <i key={l} className={`heat-${l}`} />)}
      <span>More</span>
    </div>
  );
}
