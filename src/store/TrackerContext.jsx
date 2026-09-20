import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { CATALOG, ROADMAPS, ROADMAP_BY_ID, ROADMAP_IDS } from '../data/roadmaps.js';
import { addDays, diffDays, plural, todayStr } from '../lib/dates.js';
import { LADDER, applyReview, describeInterval, newRecord } from '../lib/srs.js';
import { STORAGE_KEY, exportPayload, freshState, loadState, parseImport, saveState, sanitizeState } from '../lib/storage.js';
import { buildCustomRoadmap, makeListId, makeProblemEntry } from '../lib/customLists.js';
import { useToday } from '../hooks/useToday.js';

const TrackerContext = createContext(null);
export const useTracker = () => useContext(TrackerContext);

function reducer(state, action) {
  switch (action.type) {
    case 'SET_RECORD': {
      const problems = { ...state.problems };
      if (action.record) problems[action.key] = action.record;
      else delete problems[action.key];
      return { ...state, problems };
    }
    case 'TOGGLE_STAR': {
      const stars = { ...state.stars };
      if (stars[action.key]) delete stars[action.key];
      else stars[action.key] = true;
      return { ...state, stars };
    }
    case 'SET_ACTIVE':
      return { ...state, active: action.id };
    case 'CREATE_LIST': {
      const list = { id: makeListId(), name: action.name, blurb: action.blurb || '', createdAt: todayStr(), problems: [] };
      return { ...state, customLists: [...state.customLists, list], active: list.id };
    }
    case 'RENAME_LIST':
      return {
        ...state,
        customLists: state.customLists.map((l) => (l.id === action.id ? { ...l, name: action.name, blurb: action.blurb } : l)),
      };
    case 'DELETE_LIST': {
      const customLists = state.customLists.filter((l) => l.id !== action.id);
      const active = state.active === action.id ? ROADMAP_IDS[0] : state.active;
      return { ...state, customLists, active };
    }
    case 'ADD_PROBLEMS': {
      const customLists = state.customLists.map((l) => {
        if (l.id !== action.listId) return l;
        const seen = new Set(l.problems.map((p) => p.key));
        const added = action.problems.filter((p) => !seen.has(p.key));
        return added.length ? { ...l, problems: [...l.problems, ...added] } : l;
      });
      return { ...state, customLists };
    }
    case 'REMOVE_PROBLEM': {
      const customLists = state.customLists.map((l) =>
        l.id === action.listId ? { ...l, problems: l.problems.filter((p) => p.key !== action.key) } : l,
      );
      return { ...state, customLists };
    }
    case 'MOVE_PROBLEM': {
      const customLists = state.customLists.map((l) => {
        if (l.id !== action.listId || action.key === action.targetKey) return l;
        const problems = [...l.problems];
        const from = problems.findIndex((p) => p.key === action.key);
        const to = problems.findIndex((p) => p.key === action.targetKey);
        if (from < 0 || to < 0 || problems[from].category !== problems[to].category) return l;
        const [moved] = problems.splice(from, 1);
        problems.splice(problems.findIndex((p) => p.key === action.targetKey), 0, moved);
        return { ...l, problems };
      });
      return { ...state, customLists };
    }
    case 'MOVE_CATEGORY': {
      const customLists = state.customLists.map((l) => {
        if (l.id !== action.listId || action.category === action.targetCategory) return l;
        const categories = [...new Set(l.problems.map((p) => p.category))];
        const from = categories.indexOf(action.category);
        const to = categories.indexOf(action.targetCategory);
        if (from < 0 || to < 0) return l;
        categories.splice(from, 1);
        categories.splice(categories.indexOf(action.targetCategory), 0, action.category);
        const byCategory = new Map(categories.map((category) => [category, []]));
        l.problems.forEach((p) => byCategory.get(p.category).push(p));
        return { ...l, problems: categories.flatMap((category) => byCategory.get(category)) };
      });
      return { ...state, customLists };
    }
    case 'REPLACE':
      return action.state;
    default:
      return state;
  }
}

const titleOf = (key) => (CATALOG.get(key) ? CATALOG.get(key).title : 'problem');

export function TrackerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState(ROADMAP_IDS));
  const today = useToday();
  const stateRef = useRef(state);
  stateRef.current = state;

  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [storageOk, setStorageOk] = useState(true);

  useEffect(() => {
    setStorageOk(saveState(state));
  }, [state]);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      if (e.newValue === JSON.stringify(stateRef.current)) return;
      try {
        dispatch({ type: 'REPLACE', state: sanitizeState(JSON.parse(e.newValue), ROADMAP_IDS) });
      } catch {
        /* ignore malformed writes */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const notify = useCallback((message, undo) => {
    clearTimeout(toastTimer.current);
    const id = Date.now() + Math.random();
    setToast({ id, message, undo });
    toastTimer.current = setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), 6000);
  }, []);
  const dismissToast = useCallback(() => {
    clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const setRecord = useCallback((key, record) => dispatch({ type: 'SET_RECORD', key, record }), []);

  const actions = useMemo(() => ({
    toggleSolved(key) {
      const prev = stateRef.current.problems[key] || null;
      if (prev) {
        setRecord(key, null);
        notify(`Marked “${titleOf(key)}” as not solved`, () => setRecord(key, prev));
      } else {
        setRecord(key, newRecord(todayStr()));
        notify(`Solved “${titleOf(key)}”. First review tomorrow.`, () => setRecord(key, null));
      }
    },
    review(key, grade) {
      const prev = stateRef.current.problems[key];
      if (!prev) return;
      const next = applyReview(prev, grade, todayStr());
      setRecord(key, next);
      notify(`Next review of “${titleOf(key)}” in ${describeInterval(LADDER[next.stage])}`, () => setRecord(key, prev));
    },
    setSolvedDate(key, date) {
      const prev = stateRef.current.problems[key];
      if (!prev || !/^\d{4}-\d{2}-\d{2}$/.test(date) || diffDays(date, todayStr()) > 0) return;
      const due = prev.reviews.length ? prev.due : addDays(date, LADDER[0]);
      setRecord(key, { ...prev, solvedAt: date, due });
    },
    togglePaused(key) {
      const prev = stateRef.current.problems[key];
      if (prev) setRecord(key, { ...prev, paused: !prev.paused });
    },
    toggleStar: (key) => dispatch({ type: 'TOGGLE_STAR', key }),
    setActive(id) {
      const known = ROADMAP_BY_ID[id] || stateRef.current.customLists.some((l) => l.id === id);
      if (known) dispatch({ type: 'SET_ACTIVE', id });
    },
    createList(name, blurb) {
      const trimmed = (name || '').trim();
      if (!trimmed) return;
      dispatch({ type: 'CREATE_LIST', name: trimmed, blurb: (blurb || '').trim() });
    },
    renameList(id, name, blurb) {
      const trimmed = (name || '').trim();
      if (!trimmed) return;
      dispatch({ type: 'RENAME_LIST', id, name: trimmed, blurb: (blurb || '').trim() });
    },
    deleteList(id) {
      const list = stateRef.current.customLists.find((l) => l.id === id);
      dispatch({ type: 'DELETE_LIST', id });
      if (list) notify(`Deleted “${list.name}”. Your progress on those problems is unaffected.`);
    },
    addProblems(listId, rows) {
      const problems = rows.map(makeProblemEntry);
      const before = new Set((stateRef.current.customLists.find((l) => l.id === listId)?.problems || []).map((p) => p.key));
      const added = problems.filter((p) => !before.has(p.key)).length;
      dispatch({ type: 'ADD_PROBLEMS', listId, problems });
      notify(added ? `Added ${plural(added, 'problem')} to your list` : 'Those problems are already in your list');
    },
    removeProblem: (listId, key) => dispatch({ type: 'REMOVE_PROBLEM', listId, key }),
    moveProblem: (listId, key, targetKey) => dispatch({ type: 'MOVE_PROBLEM', listId, key, targetKey }),
    moveCategory: (listId, category, targetCategory) => dispatch({ type: 'MOVE_CATEGORY', listId, category, targetCategory }),
    exportData: () => exportPayload(stateRef.current),
    importData(text) {
      const result = parseImport(text, ROADMAP_IDS);
      if (!result.ok) return result;
      dispatch({ type: 'REPLACE', state: result.state });
      return { ok: true, count: Object.keys(result.state.problems).length };
    },
    reset: () => dispatch({ type: 'REPLACE', state: freshState(stateRef.current.active) }),
  }), [notify, setRecord]);

  const allRoadmaps = useMemo(() => [...state.customLists.map(buildCustomRoadmap), ...ROADMAPS], [state.customLists]);

  const catalog = useMemo(() => {
    if (state.customLists.length === 0) return CATALOG;
    const map = new Map(CATALOG);
    for (const list of state.customLists) {
      for (const p of list.problems) {
        const existing = map.get(p.key);
        if (existing) {
          if (!existing.lists.includes(list.id)) map.set(p.key, { ...existing, lists: [...existing.lists, list.id] });
        } else {
          map.set(p.key, { ...p, lists: [list.id] });
        }
      }
    }
    return map;
  }, [state.customLists]);

  const listNameOf = useCallback(
    (id) => (ROADMAP_BY_ID[id] ? ROADMAP_BY_ID[id].name : state.customLists.find((l) => l.id === id)?.name || 'a list'),
    [state.customLists],
  );

  const value = useMemo(
    () => ({ state, today, actions, toast, dismissToast, storageOk, roadmaps: allRoadmaps, catalog, listNameOf }),
    [state, today, actions, toast, dismissToast, storageOk, allRoadmaps, catalog, listNameOf],
  );
  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}
