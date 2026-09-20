import { Download, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PageHeader from '../components/PageHeader.jsx';
import ThemeSwitch from '../components/ThemeSwitch.jsx';
import { ROADMAP_IDS } from '../data/roadmaps.js';
import { LADDER, describeInterval } from '../lib/srs.js';
import { parseImport } from '../lib/storage.js';
import { useTracker } from '../store/TrackerContext.jsx';

export default function Settings() {
  const { state, today, actions } = useTracker();
  const fileInput = useRef(null);
  const [message, setMessage] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const solved = Object.keys(state.problems).length;

  const download = () => {
    const blob = new Blob([actions.exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recall-backup-${today}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage({ ok: true, text: `Saved a backup of ${solved} solved problems.` });
  };

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    const parsed = parseImport(text, ROADMAP_IDS);
    if (!parsed.ok) return setMessage({ ok: false, text: parsed.error });
    setPendingImport({ text, count: Object.keys(parsed.state.problems).length });
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Everything is stored in this browser. Nothing is sent anywhere." />

      <section className="block flush">
        <h2>Theme</h2>
        <p className="block-sub">System follows your device and switches with it.</p>
        <ThemeSwitch withLabels />
      </section>

      <section className="block flush">
        <h2>Backup and restore</h2>
        <p className="block-sub">
          Your progress lives in this browser's local storage, so clearing site data or switching browsers starts you from zero. Export a backup to keep it safe or move it to another device.
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={download}><Download size={16} aria-hidden="true" />Export backup</button>
          <button type="button" className="btn" onClick={() => fileInput.current && fileInput.current.click()}><Upload size={16} aria-hidden="true" />Import backup</button>
          <button type="button" className="btn btn-danger-quiet" onClick={() => setConfirmReset(true)}><Trash2 size={16} aria-hidden="true" />Reset all progress</button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={onFile} />
        </div>
        {message && <p className={`form-msg ${message.ok ? 'ok' : 'err'}`} role="status">{message.text}</p>}
      </section>

      <section className="block flush">
        <h2>How reviews are scheduled</h2>
        <p className="block-sub">
          Each solved problem climbs a ladder of waiting times. After you solve it, the first review is one day away. Each successful recall moves it to the next rung, and a lapse sends it back to the start.
        </p>
        <ol className="rungs">
          {LADDER.map((d, i) => (
            <li key={d}><b>{describeInterval(d)}</b><span>Rung {i + 1}</span></li>
          ))}
        </ol>
        <p className="block-sub">
          To change the schedule, edit <code>LADDER</code> in <code>src/lib/srs.js</code>.
        </p>
      </section>

      <ConfirmDialog
        open={Boolean(pendingImport)}
        title="Replace your progress with this backup?"
        confirmLabel="Replace progress"
        onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          const result = actions.importData(pendingImport.text);
          setMessage(result.ok ? { ok: true, text: `Imported ${result.count} solved problems.` } : { ok: false, text: result.error });
          setPendingImport(null);
        }}
      >
        The backup contains {pendingImport ? pendingImport.count : 0} solved problems. Your current progress ({solved} solved) will be replaced.
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmReset}
        danger
        title="Reset all progress?"
        confirmLabel="Reset everything"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          actions.reset();
          setConfirmReset(false);
          setMessage({ ok: true, text: 'All progress has been cleared.' });
        }}
      >
        This removes {solved} solved problems, their review schedules and your activity history from this browser. Export a backup first if you might want them back.
      </ConfirmDialog>
    </>
  );
}
