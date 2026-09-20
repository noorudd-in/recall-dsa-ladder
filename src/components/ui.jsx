export function ProgressBar({ value, max, tone = 'accent', label }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`bar bar-${tone}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export const DifficultyTag = ({ level }) => <span className={`diff diff-${level.toLowerCase()}`}>{level}</span>;

const SHORT = { lc: 'LC', gfg: 'GFG', tuf: 'TUF', cn: 'CN', ib: 'IB', cf: 'CF', yt: 'Video', link: 'Link' };
export const PlatformTag = ({ platform }) => (
  <span className="plat" title={platform.label}>{SHORT[platform.id] || 'Link'}</span>
);

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Stat({ value, label, hint }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
