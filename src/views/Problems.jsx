import { ChevronRight, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import ProblemRow from '../components/ProblemRow.jsx';
import { EmptyState, ProgressBar } from '../components/ui.jsx';
import CreateListDialog from '../components/CreateListDialog.jsx';
import AddProblemsDialog from '../components/AddProblemsDialog.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { roadmapProgress } from '../lib/stats.js';
import { reviewStatus } from '../lib/srs.js';
import { useTracker } from '../store/TrackerContext.jsx';

const STATUS = [
  { id: 'all', label: 'All' },
  { id: 'todo', label: 'To do' },
  { id: 'solved', label: 'Solved' },
  { id: 'due', label: 'Due for review' },
  { id: 'starred', label: 'Bookmarked' },
];
const LEVELS = ['all', 'Easy', 'Medium', 'Hard'];

export default function Problems() {
  const { state, today, actions, roadmaps, visibleRoadmaps, catalog, listNameOf } = useTracker();
  const roadmap = visibleRoadmaps.find((r) => r.id === state.active) || visibleRoadmaps[0] || roadmaps.find((r) => r.id === state.active) || roadmaps[0];
  const { problems, stars } = state;

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [level, setLevel] = useState('all');
  const [open, setOpen] = useState({});
  useEffect(() => setOpen({}), [roadmap.id]);

  const [listDialog, setListDialog] = useState(null); // null | 'create' | { id, name, blurb }
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(null); // { key, title }
  const [sheetManagerOpen, setSheetManagerOpen] = useState(false);

  const progress = useMemo(() => roadmapProgress(roadmap, problems), [roadmap, problems]);
  const filtering = query.trim() !== '' || status !== 'all' || level !== 'all';

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map();
    for (const p of roadmap.problems) {
      if (!map.has(p.category)) map.set(p.category, { name: p.category, total: 0, solved: 0, rows: [] });
      const g = map.get(p.category);
      const rec = problems[p.key];
      g.total++;
      if (rec) g.solved++;

      if (q && !(p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || (p.subtopic || '').toLowerCase().includes(q))) continue;
      if (level !== 'all' && p.difficulty !== level) continue;
      if (status === 'todo' && rec) continue;
      if (status === 'solved' && !rec) continue;
      if (status === 'starred' && !stars[p.key]) continue;
      if (status === 'due') {
        const s = reviewStatus(rec, today);
        if (!s || s.kind === 'upcoming') continue;
      }
      g.rows.push(p);
    }
    const all = [...map.values()];
    return filtering ? all.filter((g) => g.rows.length > 0) : all;
  }, [roadmap, problems, stars, query, status, level, today, filtering]);

  const shown = groups.reduce((n, g) => n + g.rows.length, 0);
  const setAll = (value) => setOpen(Object.fromEntries(groups.map((g) => [g.name, value])));
  const clear = () => { setQuery(''); setStatus('all'); setLevel('all'); };
  const confirmRemoveProblem = (key) => {
    const problem = roadmap.problems.find((p) => p.key === key);
    if (!problem) return;
    setPendingRemove({ key, title: problem.title });
  };
  const exportCurrentList = (includeNotes) => {
    const payload = actions.exportCustomList(roadmap.id, includeNotes);
    if (!payload) return;
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${roadmap.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'custom-list'}-${includeNotes ? 'with-notes' : 'without-notes'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const reorderable = roadmap.isCustom && !filtering;
  const startDrag = (event, payload) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify(payload));
  };
  const readDrag = (event) => {
    try { return JSON.parse(event.dataTransfer.getData('application/json')); } catch { return null; }
  };
  const allowDrop = (event) => event.preventDefault();
  const dropProblem = (event, targetKey, category) => {
    event.preventDefault();
    const drag = readDrag(event);
    if (drag?.type === 'problem' && drag.category === category) actions.moveProblem(roadmap.id, drag.key, targetKey, category, drag.subtopic || null);
  };
  const dropProblemIntoSubheading = (event, targetKey, category, subtopic) => {
    event.preventDefault();
    const drag = readDrag(event);
    if (drag?.type === 'problem' && drag.category === category) actions.moveProblem(roadmap.id, drag.key, targetKey, category, subtopic);
  };
  const dropCategory = (event, targetCategory) => {
    event.preventDefault();
    const drag = readDrag(event);
    if (drag?.type === 'category') actions.moveCategory(roadmap.id, drag.category, targetCategory);
  };
  const promptForSubheading = (category) => {
    const name = window.prompt(`New subheading inside ${category}`);
    if (name) actions.createSubheading(roadmap.id, category, name);
  };
  const renameSubheading = (subheading) => {
    const name = window.prompt('Rename subheading', subheading.name);
    if (name && name.trim() !== subheading.name) actions.renameSubheading(roadmap.id, subheading.id, subheading.category, subheading.name, name);
  };
  const removeSubheading = (subheading) => {
    if (window.confirm(`Delete “${subheading.name}”? Problems inside it will move to Uncategorized.`)) {
      actions.deleteSubheading(roadmap.id, subheading.id, subheading.category, subheading.name);
    }
  };
  const dropSubheading = (event, targetId, category) => {
    event.preventDefault();
    const drag = readDrag(event);
    if (drag?.type === 'subheading' && drag.category === category) actions.moveSubheading(roadmap.id, drag.id, targetId);
    if (drag?.type === 'problem' && drag.category === category) {
      const subtopic = roadmap.subheadings.find((subheading) => subheading.id === targetId)?.name || null;
      actions.moveProblem(roadmap.id, drag.key, null, category, subtopic);
    }
  };

  return (
    <>
      <PageHeader title="Problems" subtitle="Tick a problem when you solve it. It joins your review queue automatically." />

      <div className="rm-tabs-wrap">
        <div className="rm-tabs" role="group" aria-label="Roadmaps">
          {visibleRoadmaps.map((r) => {
            const p = roadmapProgress(r, problems);
            return (
              <button key={r.id} type="button" aria-pressed={r.id === roadmap.id} className={r.id === roadmap.id ? 'on' : ''} onClick={() => actions.setActive(r.id)}>
                <span>{r.name}</span>
                <small>{p.pct}%</small>
              </button>
            );
          })}
          <button type="button" onClick={() => setListDialog('create')}>
            <Plus size={15} aria-hidden="true" />
            <span>New list</span>
          </button>
        </div>
        <button type="button" className="btn btn-quiet rm-tabs-manage" onClick={() => setSheetManagerOpen(true)}>
          Manage sheets
        </button>
      </div>

      {sheetManagerOpen && (
        <div className="scrim" role="dialog" aria-modal="true" aria-label="Manage visible sheets">
          <div className="dialog dialog-md">
            <h2>Visible sheets</h2>
            <div className="dialog-body">
              <p className="block-sub">Keep only the sheets you want on the top tabs.</p>
              <div className="sheet-list">
                {roadmaps.map((r) => {
                  const visible = !(state.hiddenRoadmaps || []).includes(r.id);
                  return (
                    <label key={r.id} className={`sheet-row ${visible ? 'is-visible' : ''}`}>
                      <input type="checkbox" checked={visible} onChange={() => actions.toggleRoadmapVisibility(r.id)} />
                      <span>{r.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="dialog-actions">
              <button type="button" className="btn btn-quiet" onClick={() => actions.showAllRoadmaps()}>Show all</button>
              <button type="button" className="btn btn-primary" onClick={() => setSheetManagerOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      <section className="summary" aria-label={`${roadmap.name} progress`}>
        <div className="summary-main">
          <div className="summary-pct">{progress.pct}<span>%</span></div>
          <div className="summary-text">
            <strong>{roadmap.name}</strong>
            <span>{progress.solved} of {progress.total} solved. {roadmap.blurb}.</span>
          </div>
          {roadmap.isCustom && (
            <div className="summary-actions">
              <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>Add problems</button>
              <button type="button" className="btn" onClick={() => exportCurrentList(false)}>Export without notes</button>
              <button type="button" className="btn" onClick={() => exportCurrentList(true)}>Export with notes</button>
              <button type="button" className="icon-btn" aria-label="Rename list" onClick={() => setListDialog({ id: roadmap.id, name: roadmap.name, blurb: roadmap.blurb })}>
                <Pencil size={16} />
              </button>
              <button type="button" className="icon-btn" aria-label="Delete list" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
        <ProgressBar value={progress.solved} max={progress.total} label={`${roadmap.name} progress`} />
        <div className="summary-mix">
          {['Easy', 'Medium', 'Hard'].map((d) => (
            <span key={d} className={`mix mix-${d.toLowerCase()}`}>{d} {progress.byDiff[d].solved}/{progress.byDiff[d].total}</span>
          ))}
        </div>
      </section>

      <div className="filters">
        <label className="search">
          <Search size={16} aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${roadmap.problems.length} problems`} aria-label="Search problems" />
          {query && <button type="button" className="icon-btn" aria-label="Clear search" onClick={() => setQuery('')}><X size={15} /></button>}
        </label>
        <div className="seg" role="radiogroup" aria-label="Status">
          {STATUS.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={status === s.id} className={status === s.id ? 'on' : ''} onClick={() => setStatus(s.id)}>{s.label}</button>
          ))}
        </div>
        <div className="seg" role="radiogroup" aria-label="Difficulty">
          {LEVELS.map((l) => (
            <button key={l} type="button" role="radio" aria-checked={level === l} className={level === l ? 'on' : ''} onClick={() => setLevel(l)}>{l === 'all' ? 'Any level' : l}</button>
          ))}
        </div>
      </div>

      <div className="list-tools">
        <span>{filtering ? `${shown} matching` : `${groups.length} topics`}</span>
        {!filtering && (
          <span className="list-tools-actions">
            <button type="button" className="link-btn" onClick={() => setAll(true)}>Expand all</button>
            <button type="button" className="link-btn" onClick={() => setAll(false)}>Collapse all</button>
          </span>
        )}
      </div>

      {groups.length === 0 && roadmap.isCustom && roadmap.problems.length === 0 ? (
        <EmptyState title="This list is empty" action={<button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>Add problems</button>}>
          Import problems from an existing sheet, search LeetCode or Codeforces, or paste a link.
        </EmptyState>
      ) : groups.length === 0 ? (
        <EmptyState title="No problems match" action={<button type="button" className="btn" onClick={clear}>Clear filters</button>}>
          Try a different search, or clear the filters to see the whole roadmap.
        </EmptyState>
      ) : (
        groups.map((g, gi) => {
          const isOpen = filtering ? true : open[g.name] !== undefined ? open[g.name] : gi === 0;
          let lastSub = null;
          const subheadings = roadmap.isCustom
            ? (roadmap.subheadings || []).filter((subheading) => subheading.category === g.name)
            : [];
          const subgroups = roadmap.isCustom
            ? [
              ...subheadings.map((subheading) => ({ ...subheading, rows: g.rows.filter((problem) => problem.subtopic === subheading.name) })),
              { id: `uncategorized:${g.name}`, name: 'Uncategorized', category: g.name, rows: g.rows.filter((problem) => !problem.subtopic || !subheadings.some((subheading) => subheading.name === problem.subtopic)) },
            ].filter((subgroup) => subgroup.rows.length > 0 || subgroup.name !== 'Uncategorized')
            : [];
          const renderProblem = (problem, subtopic) => (
            <ProblemRow
              key={problem.key}
              problem={problem}
              rec={problems[problem.key]}
              starred={Boolean(stars[problem.key])}
              lists={catalog.get(problem.key).lists}
              today={today}
              actions={actions}
              listNameOf={listNameOf}
              onRemove={roadmap.isCustom ? confirmRemoveProblem : undefined}
              onNoteChange={roadmap.isCustom ? (key, note) => actions.updateProblemNote(roadmap.id, key, note) : undefined}
              onDragStart={reorderable ? (event) => startDrag(event, { type: 'problem', key: problem.key, category: g.name, subtopic: problem.subtopic }) : undefined}
              onDragOver={reorderable ? allowDrop : undefined}
              onDrop={reorderable ? (event) => dropProblemIntoSubheading(event, problem.key, g.name, subtopic) : undefined}
            />
          );
          return (
            <section className="group" key={g.name}>
              <div className="group-head-wrap">
                <button
                  type="button"
                  className="group-head"
                  aria-expanded={isOpen}
                  disabled={filtering}
                  draggable={reorderable}
                  onDragStart={reorderable ? (event) => startDrag(event, { type: 'category', category: g.name }) : undefined}
                  onDragOver={reorderable ? allowDrop : undefined}
                  onDrop={reorderable ? (event) => dropCategory(event, g.name) : undefined}
                  onClick={() => setOpen((o) => ({ ...o, [g.name]: !isOpen }))}
                >
                  <ChevronRight size={18} className="chev" aria-hidden="true" />
                  <h3>{g.name}</h3>
                  <span className="group-count">{g.solved}/{g.total}</span>
                  <span className="group-bar"><ProgressBar value={g.solved} max={g.total} tone={g.solved === g.total ? 'easy' : 'accent'} label={`${g.name} progress`} /></span>
                </button>
                {roadmap.isCustom && !filtering && <button type="button" className="icon-btn subheading-add" aria-label={`Add subheading to ${g.name}`} onClick={() => promptForSubheading(g.name)}>+</button>}
              </div>
              {isOpen && (
                <ul className="rows">
                  {roadmap.isCustom ? subgroups.map((subgroup) => (
                    <Fragment key={subgroup.id}>
                      <li
                        className="subhead subhead-edit"
                        role="presentation"
                        draggable={reorderable && subgroup.id !== `uncategorized:${g.name}`}
                        onDragStart={reorderable && subgroup.id !== `uncategorized:${g.name}` ? (event) => startDrag(event, { type: 'subheading', id: subgroup.id, category: g.name }) : undefined}
                        onDragOver={reorderable ? allowDrop : undefined}
                        onDrop={reorderable ? (event) => dropSubheading(event, subgroup.id, g.name) : undefined}
                      >
                        <span>{subgroup.name}</span>
                        {subgroup.id !== `uncategorized:${g.name}` && <span className="subhead-actions">
                          <button type="button" className="icon-btn" aria-label={`Rename ${subgroup.name}`} onClick={() => renameSubheading(subgroup)}><Pencil size={14} /></button>
                          <button type="button" className="icon-btn" aria-label={`Delete ${subgroup.name}`} onClick={() => removeSubheading(subgroup)}><Trash2 size={14} /></button>
                        </span>}
                      </li>
                      {subgroup.rows.map((problem) => renderProblem(problem, subgroup.name))}
                    </Fragment>
                  )) : g.rows.map((problem) => {
                    const showHead = Boolean(problem.subtopic) && problem.subtopic !== lastSub;
                    lastSub = problem.subtopic;
                    return <Fragment key={problem.key}>{showHead && <li className="subhead" role="presentation">{problem.subtopic}</li>}{renderProblem(problem, problem.subtopic)}</Fragment>;
                  })}
                </ul>
              )}
            </section>
          );
        })
      )}

      <CreateListDialog
        open={listDialog !== null}
        initial={listDialog === 'create' ? null : listDialog}
        onCancel={() => setListDialog(null)}
        onSave={(name, blurb) => {
          if (listDialog === 'create') actions.createList(name, blurb);
          else actions.renameList(listDialog.id, name, blurb);
          setListDialog(null);
        }}
        onImportList={(text) => {
          const result = actions.importCustomList(text);
          if (!result.ok) {
            window.alert(result.error || 'Import failed.');
            return;
          }
          setListDialog(null);
        }}
      />

      <AddProblemsDialog open={addOpen} list={roadmap.isCustom ? roadmap : null} roadmaps={roadmaps} onAdd={(rows) => actions.addProblems(roadmap.id, rows)} onClose={() => setAddOpen(false)} />

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        title={`Remove “${pendingRemove?.title}” from “${roadmap.name}”?`}
        confirmLabel="Remove problem"
        danger
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => {
          if (pendingRemove) actions.removeProblem(roadmap.id, pendingRemove.key);
          setPendingRemove(null);
        }}
      >
        This removes it only from this custom list. Your solved/review progress stays intact wherever else it appears.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete “${roadmap.name}”?`}
        confirmLabel="Delete list"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { actions.deleteList(roadmap.id); setConfirmDelete(false); }}
      >
        This removes the list itself. Your solved/review progress on these problems is kept and still counts wherever else they appear.
      </ConfirmDialog>
    </>
  );
}
