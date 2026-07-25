import { useState } from 'react';
import { api } from '../../api/client.js';
import { REPORT_REASONS } from './helpers.js';

export default function ReportButton({ targetType, targetId }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (reason) => {
    setError('');
    try {
      await api.post('/community/reports', { target_type: targetType, target_id: targetId, reason });
      setDone(true);
      setOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  if (done) return <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>신고 접수됨</span>;

  return (
    <span style={{ position: 'relative' }}>
      <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '2px 8px' }} onClick={() => setOpen((v) => !v)}>
        신고
      </button>
      {open && (
        <div className="card" style={{ position: 'absolute', top: '100%', right: 0, zIndex: 5, minWidth: 160, padding: 10 }}>
          {error && <div className="error-banner" style={{ fontSize: '0.75rem' }}>{error}</div>}
          {REPORT_REASONS.map((r) => (
            <button
              key={r}
              className="btn-ghost"
              style={{ display: 'block', width: '100%', textAlign: 'left', fontSize: '0.8rem', padding: '4px 6px' }}
              onClick={() => submit(r)}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
