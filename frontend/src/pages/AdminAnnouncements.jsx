import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const TYPE_LABELS = { banner: '배너', popup: '팝업' };

function formatDate(iso) {
  if (!iso) return '-';
  return String(iso).slice(0, 10);
}

export default function AdminAnnouncements() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', body: '', type: 'banner', starts_at: '', ends_at: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.get('/announcements').then((res) => setItems(res.announcements)).catch((err) => setError(err.message));

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.post('/announcements', {
        title: form.title.trim(),
        body: form.body.trim() || null,
        type: form.type,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      });
      setForm({ title: '', body: '', type: 'banner', starts_at: '', ends_at: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (item) => {
    await api.patch(`/announcements/${item.id}`, { is_active: !item.is_active });
    load();
  };

  const remove = async (item) => {
    await api.delete(`/announcements/${item.id}`);
    load();
  };

  if (error) return <div className="card"><div className="error-banner">{error}</div></div>;

  return (
    <div>
      <h1>공지사항</h1>
      <div className="card">
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
          "배너"는 대시보드 상단에 카드로, "팝업"은 대시보드 진입 시 모달로 떠요. 적용기간을 넣으면 그 기간에만 자동으로 노출되고,
          비워두면 아래 "비활성화" 전까지 계속 보여요.
        </p>
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="field">
              <label>유형</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="banner">배너</option>
                <option value="popup">팝업</option>
              </select>
            </div>
            <div className="field">
              <label>시작일(선택)</label>
              <input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </div>
            <div className="field">
              <label>종료일(선택)</label>
              <input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label>제목</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="field">
            <label>내용</label>
            <textarea rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} style={{ width: '100%', resize: 'vertical' }} />
          </div>
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? '등록 중...' : '공지 등록'}
          </button>
        </form>
      </div>

      <div className="card">
        {!items ? (
          <p>불러오는 중...</p>
        ) : items.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>등록된 공지사항이 없어요.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} style={{ borderTop: '1px solid var(--border)', padding: '10px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontWeight: 600 }}>
                  {item.title}{' '}
                  <span className="badge badge-neutral">{TYPE_LABELS[item.type]}</span>{' '}
                  {item.is_active ? <span className="badge badge-success">활성</span> : <span className="badge badge-neutral">비활성</span>}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {(item.starts_at || item.ends_at)
                    ? `${formatDate(item.starts_at)} ~ ${formatDate(item.ends_at)}`
                    : `등록일 ${formatDate(item.created_at)}`}
                </span>
              </div>
              {item.body && <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.body}</p>}
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button className="btn-ghost" onClick={() => toggleActive(item)}>{item.is_active ? '비활성화' : '활성화'}</button>
                <button className="btn-ghost" onClick={() => remove(item)}>삭제</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
