import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { CATALOG, ROADMAPS, ROADMAP_BY_ID, ROADMAP_IDS } from '../data/roadmaps.js';
import { addDays, diffDays, todayStr } from '../lib/dates.js';
import { LADDER, applyReview, describeInterval, newRecord } from '../lib/srs.js';
import { STORAGE_KEY, exportPayload, freshState, loadState, parseImport, saveState, sanitizeState } from '../lib/storage.js';
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
    setActive: (id) => ROADMAP_BY_ID[id] && dispatch({ type: 'SET_ACTIVE', id }),
    exportData: () => exportPayload(stateRef.current),
    importData(text) {
      const result = parseImport(text, ROADMAP_IDS);
      if (!result.ok) return result;
      dispatch({ type: 'REPLACE', state: result.state });
      return { ok: true, count: Object.keys(result.state.problems).length };
    },
    reset: () => dispatch({ type: 'REPLACE', state: freshState(stateRef.current.active) }),
  }), [notify, setRecord]);

  const value = useMemo(
    () => ({ state, today, actions, toast, dismissToast, storageOk, roadmaps: ROADMAPS, catalog: CATALOG }),
    [state, today, actions, toast, dismissToast, storageOk],
  );
  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}
