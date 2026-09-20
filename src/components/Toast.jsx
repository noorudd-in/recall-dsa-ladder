import { X } from 'lucide-react';
import { useTracker } from '../store/TrackerContext.jsx';

export default function Toast() {
  const { toast, dismissToast, storageOk } = useTracker();
  return (
    <div className="toasts" aria-live="polite">
      {!storageOk && (
        <div className="toast toast-warn" role="alert">
          Your browser blocked local storage, so progress won't survive a refresh. Export a backup from Settings.
        </div>
      )}
      {toast && (
        <div className="toast" key={toast.id}>
          <span>{toast.message}</span>
          {toast.undo && (
            <button type="button" className="toast-undo" onClick={() => { toast.undo(); dismissToast(); }}>
              Undo
            </button>
          )}
          <button type="button" className="icon-btn" aria-label="Dismiss" onClick={dismissToast}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
