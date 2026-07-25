import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const CATEGORY_LABELS = { general: '일반문의', ad: '광고문의' };

function formatDate(iso) {
  if (!iso) return '-';
  return String(iso).slice(0, 16).replace('T', ' ');
}

export default function Inquiries() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', body: '', category: 'general' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.get('/inquiries').then((res) => setItems(res.inquiries)).catch((err) => setError(err.message));

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim() || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post('/inquiries', { title: form.title.trim(), body: form.body.trim(), category: form.category });
      setForm({ title: '', body: '', category: 'general' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>문의하기</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h2>새 문의 작성</h2>
        <form onSubmit={submit}>
          <div className="field">
            <label>문의 유형</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="general">일반문의</option>
              <option value="ad">광고문의</option>
            </select>
          </div>
          <div className="field">
            <label>제목</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="field">
            <label>내용</label>
            <textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} style={{ width: '100%', resize: 'vertical' }} />
          </div>
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? '등록 중...' : '문의 등록'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>내 문의 내역</h2>
        {!items ? (
          <p>불러오는 중...</p>
        ) : items.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>아직 등록한 문의가 없어요.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
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
              <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{item.body}</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDate(item.created_at)}</p>
              {item.admin_reply && (
                <div style={{ marginTop: 10, padding: 10, background: 'var(--accent-bg)', borderRadius: 8 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>관리자 답변</p>
                  <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{item.admin_reply}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(item.replied_at)}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
