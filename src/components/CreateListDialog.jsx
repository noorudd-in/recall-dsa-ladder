import { useEffect, useState } from 'react';

export default function CreateListDialog({ open, initial, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [blurb, setBlurb] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(initial?.name || '');
    setBlurb(initial?.blurb || '');
  }, [open, initial]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), blurb.trim());
  };

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="list-dlg-title" onSubmit={submit}>
        <h2 id="list-dlg-title">{initial ? 'Rename list' : 'New list'}</h2>
        <div className="dialog-body stack" style={{ gap: 14 }}>
          <label className="field">
            <span>Name</span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekend grind" maxLength={60} required />
          </label>
          <label className="field">
            <span>Description (optional)</span>
            <input value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="What this list is for" maxLength={120} />
          </label>
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>{initial ? 'Save' : 'Create list'}</button>
        </div>
      </form>
    </div>
  );
}
