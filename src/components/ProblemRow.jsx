import { Check, ExternalLink, FileText, Layers, MoreHorizontal, Star, X } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { formatDay, plural } from '../lib/dates.js';
import { LADDER, describeInterval, reviewStatus } from '../lib/srs.js';
import { DifficultyTag, PlatformTag } from './ui.jsx';

export function ReviewChip({ rec, today }) {
  const s = reviewStatus(rec, today);
  if (!rec) return null;
  if (!s) return <span className="chip chip-paused">Paused</span>;
  if (s.kind === 'overdue') return <span className="chip chip-overdue">Refresh, {s.days}d late</span>;
  if (s.kind === 'today') return <span className="chip chip-today">Due today</span>;
  return <span className="chip chip-later">In {s.days}d</span>;
}

function RowMenu({ rec, today, onDate, onPause, title }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="menu-wrap" ref={wrap}>
      <button type="button" className="icon-btn" aria-label={`Schedule for ${title}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal size={17} />
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Review schedule">
          <p className="pop-line">
            Rung {rec.stage + 1} of {LADDER.length}. {rec.paused ? 'Reviews are paused.' : `Next review ${formatDay(rec.due)}.`}
          </p>
          <p className="pop-sub">
            Reviewed {plural(rec.reviews.length, 'time')}
            {rec.lapses > 0 ? `, forgotten ${plural(rec.lapses, 'time')}` : ''}. Steps: {LADDER.map(describeInterval).join(', ')}.
          </p>
          <label className="field">
            <span>Solved on</span>
            <input type="date" value={rec.solvedAt} max={today} onChange={(e) => e.target.value && onDate(e.target.value)} />
          </label>
          <label className="check-line">
            <input type="checkbox" checked={rec.paused} onChange={onPause} />
            <span>Pause reviews for this problem</span>
          </label>
        </div>
      )}
    </div>
  );
}

function ProblemRow({ problem, rec, starred, lists, today, actions, listNameOf, onRemove, onNoteChange, onDragStart, onDragOver, onDrop }) {
  const solved = Boolean(rec);
  const hasNote = Boolean(problem.note && problem.note.trim());
  const [noteOpen, setNoteOpen] = useState(Boolean(problem.note));
  const [noteText, setNoteText] = useState(problem.note || '');

  useEffect(() => {
    setNoteText(problem.note || '');
    setNoteOpen(Boolean(problem.note));
  }, [problem.note]);

  return (
    <li
      className={`prow ${onRemove ? 'is-custom' : ''} ${solved ? 'is-solved' : ''}`}
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <button
        type="button"
        className="check"
        aria-pressed={solved}
        aria-label={`${solved ? 'Mark not solved' : 'Mark solved'}: ${problem.title}`}
        onClick={() => actions.toggleSolved(problem.key)}
      >
        <Check size={14} strokeWidth={3.5} aria-hidden="true" />
      </button>

      <div className="prow-main">
        <a className="prow-title" href={problem.url} target="_blank" rel="noopener noreferrer" title={problem.title}>
          <span>{problem.title}</span>
          <ExternalLink size={13} aria-hidden="true" />
        </a>
        {lists.length > 1 && (
          <span className="prow-lists" title={`Also in: ${lists.map(listNameOf).join(', ')}`}>
            <Layers size={13} aria-hidden="true" />
            {lists.length}
          </span>
        )}
      </div>

      <PlatformTag platform={problem.platform} />
      <DifficultyTag level={problem.difficulty} />
      <div className="prow-status">{solved && <ReviewChip rec={rec} today={today} />}</div>

      <button
        type="button"
        className={`icon-btn star ${starred ? 'on' : ''}`}
        aria-pressed={starred}
        aria-label={`${starred ? 'Remove bookmark from' : 'Bookmark'} ${problem.title}`}
        onClick={() => actions.toggleStar(problem.key)}
      >
        <Star size={16} fill={starred ? 'currentColor' : 'none'} />
      </button>

      {solved ? (
        <RowMenu
          rec={rec}
          today={today}
          title={problem.title}
          onDate={(d) => actions.setSolvedDate(problem.key, d)}
          onPause={() => actions.togglePaused(problem.key)}
        />
      ) : (
        <span className="menu-spacer" />
      )}

      {onNoteChange && (
        <button
          type="button"
          className={`icon-btn note-btn ${hasNote ? 'has-note' : ''} ${noteOpen ? 'on' : ''}`}
          aria-label={noteOpen ? `Hide notes for ${problem.title}` : hasNote ? `Show note for ${problem.title}` : `Add notes for ${problem.title}`}
          onClick={() => setNoteOpen((v) => !v)}
        >
          <FileText size={16} />
        </button>
      )}

      {onRemove && (
        <button type="button" className="icon-btn" aria-label={`Remove ${problem.title} from this list`} onClick={() => onRemove(problem.key)}>
          <X size={16} />
        </button>
      )}

      {noteOpen && onNoteChange && (
        <div className="prow-note">
          <textarea
            value={noteText}
            rows={3}
            placeholder="Add a quick note for this problem…"
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={() => onNoteChange(problem.key, noteText)}
          />
        </div>
      )}
    </li>
  );
}

export default memo(ProblemRow);
