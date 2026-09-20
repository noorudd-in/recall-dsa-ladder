import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchLeetCodeBySlug, leetCodeSlugFromUrl, searchLeetCode } from '../api/leetcode.js';
import { codeforcesIdFromUrl, fetchCodeforcesByUrl, searchCodeforces } from '../api/codeforces.js';
import { DifficultyTag } from './ui.jsx';

const TABS = [
  { id: 'existing', label: 'From a list' },
  { id: 'leetcode', label: 'LeetCode' },
  { id: 'codeforces', label: 'Codeforces' },
  { id: 'link', label: 'Custom link' },
];

const NEW_HEADING = '__new__';

function HeadingPicker({ headings, value, onChange }) {
  const [adding, setAdding] = useState(false);
  if (adding) {
    return (
      <input
        autoFocus
        placeholder="New heading name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => !value.trim() && setAdding(false)}
      />
    );
  }
  return (
    <select
      value={headings.includes(value) ? value : ''}
      onChange={(e) => {
        if (e.target.value === NEW_HEADING) {
          setAdding(true);
          onChange('');
        } else {
          onChange(e.target.value);
        }
      }}
    >
      <option value="" disabled>Choose a heading…</option>
      {headings.map((h) => <option key={h} value={h}>{h}</option>)}
      <option value={NEW_HEADING}>+ New heading…</option>
    </select>
  );
}

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function ExistingListTab({ roadmaps, targetId, existingKeys, onImport }) {
  const sources = roadmaps.filter((r) => r.id !== targetId);
  const [sourceId, setSourceId] = useState(sources[0]?.id || '');
  const [selected, setSelected] = useState(new Set());
  const source = sources.find((r) => r.id === sourceId);

  useEffect(() => setSelected(new Set()), [sourceId]);

  const toggle = (key) => setSelected((s) => {
    const next = new Set(s);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const selectable = source?.problems.filter((p) => !existingKeys.has(p.key)) || [];
  const allSelected = selectable.length > 0 && selectable.every((p) => selected.has(p.key));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectable.map((p) => p.key)));

  if (!source) return <p className="pop-sub">No other lists to import from yet.</p>;

  return (
    <div className="tab-panel">
      <label className="field">
        <span>Source list</span>
        <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
          {sources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </label>
      <ul className="pick-list">
        {source.problems.map((p) => {
          const already = existingKeys.has(p.key);
          return (
            <li key={p.key} className="pick-row">
              <label className="check-line">
                <input type="checkbox" disabled={already} checked={already || selected.has(p.key)} onChange={() => toggle(p.key)} />
                <span>{p.title}</span>
              </label>
              <DifficultyTag level={p.difficulty} />
            </li>
          );
        })}
      </ul>
      <div className="dialog-actions" style={{ marginTop: 0 }}>
        <button type="button" className="link-btn" disabled={selectable.length === 0} onClick={toggleAll}>
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={selected.size === 0}
          onClick={() => {
            const rows = source.problems.filter((p) => selected.has(p.key)).map((p) => ({
              title: p.title, url: p.url, difficulty: p.difficulty, category: p.category, subtopic: p.subtopic,
            }));
            onImport(rows);
            setSelected(new Set());
          }}
        >
          Import {selected.size || ''} problem{selected.size === 1 ? '' : 's'}
        </button>
      </div>
    </div>
  );
}

function SearchTab({ search, placeholder, headings, existingKeys, onImport }) {
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 300);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(new Map());
  const [heading, setHeading] = useState('');
  const reqId = useRef(0);

  useEffect(() => {
    const term = debounced.trim();
    if (!term) { setResults([]); setError(null); return; }
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    search(term)
      .then((rows) => { if (id === reqId.current) setResults(rows); })
      .catch((err) => { if (id === reqId.current) setError(err.message); })
      .finally(() => { if (id === reqId.current) setLoading(false); });
  }, [debounced, search]);

  const toggle = (row) => setSelected((s) => {
    const next = new Map(s);
    next.has(row.url) ? next.delete(row.url) : next.set(row.url, row);
    return next;
  });

  const doImport = () => {
    if (!heading.trim() || selected.size === 0) return;
    const rows = [...selected.values()].map((r) => ({ ...r, category: heading.trim() }));
    onImport(rows);
    setSelected(new Map());
  };

  return (
    <div className="tab-panel">
      <label className="search">
        <Search size={16} aria-hidden="true" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
        {query && <button type="button" className="icon-btn" aria-label="Clear search" onClick={() => setQuery('')}><X size={15} /></button>}
      </label>

      {error && <p className="form-msg err">{error}</p>}
      {loading && <p className="pop-sub">Searching…</p>}

      {results.length > 0 && (
        <ul className="pick-list">
          {results.map((r) => {
            const already = existingKeys.has(r.url);
            return (
              <li key={r.url} className="pick-row">
                <label className="check-line">
                  <input type="checkbox" disabled={already} checked={already || selected.has(r.url)} onChange={() => toggle(r)} />
                  <span>{r.title}</span>
                </label>
                <DifficultyTag level={r.difficulty} />
              </li>
            );
          })}
        </ul>
      )}

      {selected.size > 0 && (
        <div className="stack" style={{ gap: 10 }}>
          <label className="field">
            <span>Add {selected.size} problem{selected.size === 1 ? '' : 's'} under</span>
            <HeadingPicker headings={headings} value={heading} onChange={setHeading} />
          </label>
          <div className="dialog-actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn btn-primary" disabled={!heading.trim()} onClick={doImport}>Add to list</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CustomLinkTab({ headings, onImport }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [heading, setHeading] = useState('');
  const [detecting, setDetecting] = useState(false);

  const detect = async () => {
    const lcSlug = leetCodeSlugFromUrl(url);
    const cfRef = codeforcesIdFromUrl(url);
    if (!lcSlug && !cfRef) return;
    setDetecting(true);
    try {
      const found = lcSlug ? await fetchLeetCodeBySlug(lcSlug) : await fetchCodeforcesByUrl(url);
      setTitle(found.title);
      setDifficulty(found.difficulty);
      if (!heading) setHeading(found.category);
    } catch {
      /* couldn't auto-detect, user can still fill the fields manually */
    } finally {
      setDetecting(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim() || !url.trim() || !heading.trim()) return;
    onImport([{ title: title.trim(), url: url.trim(), difficulty, category: heading.trim() }]);
    setTitle('');
    setUrl('');
    setHeading('');
  };

  return (
    <form className="tab-panel" onSubmit={submit}>
      <label className="field">
        <span>Problem URL</span>
        <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} onBlur={detect} placeholder="https://..." />
      </label>
      <label className="field">
        <span>Title{detecting ? ' (detecting…)' : ''}</span>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Problem title, or paste a LeetCode/Codeforces URL above to auto-fill" />
      </label>
      <label className="field">
        <span>Difficulty</span>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
        </select>
      </label>
      <label className="field">
        <span>Heading</span>
        <HeadingPicker headings={headings} value={heading} onChange={setHeading} />
      </label>
      <div className="dialog-actions" style={{ marginTop: 0 }}>
        <button type="submit" className="btn btn-primary" disabled={!title.trim() || !url.trim() || !heading.trim()}>Add problem</button>
      </div>
    </form>
  );
}

export default function AddProblemsDialog({ open, list, roadmaps, onAdd, onClose }) {
  const [tab, setTab] = useState('existing');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const existingKeys = useMemo(() => new Set(list ? list.problems.map((p) => p.key) : []), [list]);
  const existingUrls = useMemo(() => new Set(list ? list.problems.map((p) => p.url).filter(Boolean) : []), [list]);
  const headings = useMemo(() => [...new Set(list ? list.problems.map((p) => p.category) : [])], [list]);

  if (!open || !list) return null;

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog dialog-lg" role="dialog" aria-modal="true" aria-labelledby="add-dlg-title">
        <h2 id="add-dlg-title">Add problems to “{list.name}”</h2>
        <div className="seg" role="tablist" aria-label="Add problems from" style={{ marginTop: 14 }}>
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="dialog-body">
          {tab === 'existing' && (
            <ExistingListTab roadmaps={roadmaps} targetId={list.id} existingKeys={existingKeys} onImport={onAdd} />
          )}
          {tab === 'leetcode' && (
            <SearchTab search={searchLeetCode} placeholder="Search LeetCode problems" headings={headings} existingKeys={existingUrls} onImport={onAdd} />
          )}
          {tab === 'codeforces' && (
            <SearchTab search={searchCodeforces} placeholder="Search Codeforces problems" headings={headings} existingKeys={existingUrls} onImport={onAdd} />
          )}
          {tab === 'link' && <CustomLinkTab headings={headings} onImport={onAdd} />}
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
