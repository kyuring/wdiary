import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../api/client.js';

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState(() => new Set(JSON.parse(sessionStorage.getItem('dismissedAnnouncements') || '[]')));

  useEffect(() => {
    api.get('/announcements').then((res) => setAnnouncements(res.announcements)).catch(() => {});
  }, []);

  const dismiss = (id) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    sessionStorage.setItem('dismissedAnnouncements', JSON.stringify([...next]));
  };

  const visible = announcements.filter((a) => !dismissed.has(a.id));
  const banners = visible.filter((a) => a.type === 'banner');
  const popup = visible.find((a) => a.type === 'popup');

  return (
    <>
      {banners.map((a) => (
        <div key={a.id} className="card" style={{ background: 'var(--accent-bg)', borderColor: 'var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <strong>📢 {a.title}</strong>
            <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '2px 8px' }} onClick={() => dismiss(a.id)}>닫기</button>
          </div>
          {a.body && <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>{a.body}</p>}
        </div>
      ))}
      {popup && (
        <Modal title={`📢 ${popup.title}`} onClose={() => dismiss(popup.id)}>
          {popup.body && <p style={{ whiteSpace: 'pre-wrap' }}>{popup.body}</p>}
        </Modal>
      )}
    </>
  );
}
