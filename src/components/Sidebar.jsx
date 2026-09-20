import { CalendarCheck, Flame, ListChecks, Repeat, Settings } from 'lucide-react';
import { useMemo } from 'react';
import { buildActivity, computeStreaks, reviewQueue } from '../lib/stats.js';
import { useTracker } from '../store/TrackerContext.jsx';

const NAV = [
  { id: 'today', label: 'Today', Icon: CalendarCheck },
  { id: 'problems', label: 'Problems', Icon: ListChecks },
  { id: 'review', label: 'Review', Icon: Repeat },
  { id: 'activity', label: 'Activity', Icon: Flame },
  { id: 'settings', label: 'Settings', Icon: Settings },
];

export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--hero)" />
      <path d="M7 24h5v-4h5v-4h5v-4h3" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Sidebar({ route, go }) {
  const { state, catalog, today } = useTracker();
  const queue = useMemo(() => reviewQueue(state.problems, catalog, today), [state.problems, catalog, today]);
  const due = queue.overdue.length + queue.today.length;
  const streak = useMemo(() => computeStreaks(buildActivity(state.problems), today), [state.problems, today]);

  return (
    <nav className="sidebar" aria-label="Main">
      <a className="brand" href="#/" onClick={(e) => { e.preventDefault(); go('today'); }}>
        <Logo />
        <span>Recall</span>
      </a>
      <ul className="nav">
        {NAV.map(({ id, label, Icon }) => (
          <li key={id}>
            <a
              href={`#/${id}`}
              className={route === id ? 'active' : ''}
              aria-current={route === id ? 'page' : undefined}
              onClick={(e) => { e.preventDefault(); go(id); }}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
              {id === 'review' && due > 0 && <b className="badge" aria-label={`${due} reviews due`}>{due}</b>}
            </a>
          </li>
        ))}
      </ul>
      <div className="side-foot">
        <Flame size={16} aria-hidden="true" />
        <span>{streak.current > 0 ? `${streak.current}-day streak` : 'No streak yet'}</span>
      </div>
    </nav>
  );
}
