import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import Forecast from '../components/Forecast.jsx';
import Ladder from '../components/Ladder.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { ProgressBar } from '../components/ui.jsx';
import { formatLong, plural, relativeDay } from '../lib/dates.js';
import { buildActivity, computeStreaks, forecast, ladderCounts, overallProgress, reviewQueue, roadmapProgress } from '../lib/stats.js';
import { useTracker } from '../store/TrackerContext.jsx';

const DIFFS = [['Easy', 'easy'], ['Medium', 'medium'], ['Hard', 'hard']];

export default function Today({ go }) {
  const { state, today, catalog, roadmaps, actions } = useTracker();
  const { problems } = state;

  const queue = useMemo(() => reviewQueue(problems, catalog, today), [problems, catalog, today]);
  const counts = useMemo(() => ladderCounts(problems), [problems]);
  const activity = useMemo(() => buildActivity(problems), [problems]);
  const streak = useMemo(() => computeStreaks(activity, today), [activity, today]);
  const overall = useMemo(() => overallProgress(catalog, problems), [catalog, problems]);
  const upcoming = useMemo(() => forecast(problems, today, 14), [problems, today]);

  const solvedCount = Object.keys(problems).length;
  const due = queue.overdue.length + queue.today.length;
  const nextUp = queue.upcoming[0];
  const todayActivity = activity[today] || { solved: 0, reviewed: 0 };

  let hero;
  if (solvedCount === 0) {
    hero = {
      big: 'Start your ladder',
      small: 'Tick off a problem you have solved and Recall schedules when to revisit it, so it sticks.',
      cta: 'Choose problems',
      to: 'problems',
      isNumber: false,
    };
  } else if (due > 0) {
    hero = {
      big: String(due),
      label: `${due === 1 ? 'problem' : 'problems'} to revise today`,
      small: queue.overdue.length > 0
        ? `${queue.overdue.length} ${queue.overdue.length === 1 ? 'needs' : 'need'} a refresh, since the review date has passed.`
        : 'Nothing is overdue. Keep it that way.',
      cta: 'Start reviewing',
      to: 'review',
      isNumber: true,
    };
  } else {
    hero = {
      big: 'All caught up',
      small: nextUp
        ? `Next review: ${nextUp.meta.title}, ${relativeDay(nextUp.due, today).toLowerCase()} (${formatLong(nextUp.due)}).`
        : 'Every review is paused. Nothing is scheduled.',
      cta: 'Solve something new',
      to: 'problems',
      isNumber: false,
    };
  }

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={`${formatLong(today)}. ${todayActivity.solved + todayActivity.reviewed > 0 ? `You have solved ${todayActivity.solved} and reviewed ${todayActivity.reviewed} so far.` : 'Nothing logged yet today.'}`}
      />

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h2 id="hero-title" className={hero.isNumber ? 'hero-number' : 'hero-words'}>
            {hero.big}
            {hero.isNumber && <span className="hero-label">{hero.label}</span>}
          </h2>
          <p>{hero.small}</p>
          <button type="button" className="btn btn-light" onClick={() => go(hero.to)}>
            {hero.cta}
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        </div>
        <div className="hero-ladder">
          <Ladder counts={counts} />
          <p className="hero-caption">
            Every recall moves a problem up a rung and pushes its next review further out. Forget it and it drops back to the start.
          </p>
        </div>
      </section>

      <div className="split">
        <section className="block" aria-labelledby="rm-title">
          <h2 id="rm-title">Roadmaps</h2>
          <p className="block-sub">Progress is shared. A problem you solve once counts in every list that includes it.</p>
          <ul className="rm-list">
            {roadmaps.map((r) => {
              const p = roadmapProgress(r, problems);
              const current = r.id === state.active;
              return (
                <li key={r.id}>
                  <button type="button" className={`rm-row ${current ? 'is-current' : ''}`} onClick={() => { actions.setActive(r.id); go('problems'); }}>
                    <div className="rm-main">
                      <div className="rm-name">{r.name}{current && <span className="rm-current">Current</span>}</div>
                      <div className="rm-blurb">{r.blurb}</div>
                      <ProgressBar value={p.solved} max={p.total} label={`${r.name} progress`} />
                      <div className="rm-mix">
                        {DIFFS.map(([label, cls]) => (
                          <span key={label} className={`mix mix-${cls}`}>{label} {p.byDiff[label].solved}/{p.byDiff[label].total}</span>
                        ))}
                      </div>
                    </div>
                    <div className="rm-pct">
                      <b>{p.pct}%</b>
                      <span>{p.solved} of {p.total}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="stack">
          <section className="block" aria-labelledby="diff-title">
            <h2 id="diff-title">Solved by difficulty</h2>
            <p className="block-sub">Across all {overall.total} unique problems in your roadmaps. {overall.solved} solved, {overall.pct}% done.</p>
            <ul className="diff-rows">
              {DIFFS.map(([label, cls]) => {
                const d = overall.byDiff[label];
                return (
                  <li key={label}>
                    <div className="diff-row-head"><span className={`diff diff-${cls}`}>{label}</span><span><b>{d.solved}</b> of {d.total}</span></div>
                    <ProgressBar value={d.solved} max={d.total} tone={cls} label={`${label} solved`} />
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="block" aria-labelledby="fc-title">
            <h2 id="fc-title">Coming up</h2>
            <p className="block-sub">
              Reviews due over the next two weeks{queue.overdue.length ? `. Your ${queue.overdue.length} overdue are counted under today` : ''}.
              {streak.current > 0 && ` You are on a ${streak.current}-day streak.`}
            </p>
            <Forecast days={upcoming} overdue={queue.overdue.length} />
          </section>
        </div>
      </div>
    </>
  );
}
