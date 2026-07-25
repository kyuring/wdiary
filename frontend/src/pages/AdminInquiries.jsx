import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const CATEGORY_LABELS = { general: '일반문의', ad: '광고문의' };

function formatDate(iso) {
  if (!iso) return '-';
  return String(iso).slice(0, 16).replace('T', ' ');
}

function ReplyForm({ item, onReply }) {
  const [reply, setReply] = useState(item.admin_reply || '');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!reply.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onReply(item, reply.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ marginTop: 10 }}>
      <div className="field">
        <label>답변</label>
        <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} style={{ width: '100%', resize: 'vertical' }} />
      </div>
      <button className="btn-secondary" type="submit" disabled={submitting}>
        {submitting ? '등록 중...' : item.admin_reply ? '답변 수정' : '답변 등록'}
      </button>
    </form>
  );
}

export default function AdminInquiries() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/inquiries').then((res) => setItems(res.inquiries)).catch((err) => setError(err.message));

  useEffect(() => { load(); }, []);

  const reply = async (item, replyText) => {
    await api.patch(`/inquiries/${item.id}`, { admin_reply: replyText });
    load();
  };

  return (
    <div>
      <h1>문의 관리</h1>
      <div className="card">
        {error && <div className="error-banner">{error}</div>}
        {!items ? (
          <p>불러오는 중...</p>
        ) : items.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>등록된 문의가 없어요.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} style={{ borderTop: '1px solid var(--border)', padding: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                <span>
                  <span className="badge badge-neutral">{CATEGORY_LABELS[item.category] || item.category}</span>{' '}
                  <strong>{item.title}</strong>
                </span>
                {item.status === 'answered' ? (
                  <span className="badge badge-success">답변완료</span>
                ) : (
                  <span className="badge badge-warn">답변대기</span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {item.nickname}({item.username}) · {formatDate(item.created_at)}
              </p>
              <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{item.body}</p>
              <ReplyForm item={item} onReply={reply} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
