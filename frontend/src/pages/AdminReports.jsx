import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function AdminReports() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/admin/reports').then((res) => setItems(res.items)).catch((err) => setError(err.message));

  useEffect(() => { load(); }, []);

  const unblind = async (item) => {
    await api.post(`/admin/reports/${item.target_type}/${item.target_id}/unblind`, {});
    load();
  };

  const remove = async (item) => {
    try {
      await api.delete(`/admin/${item.target_type === 'post' ? 'posts' : 'comments'}/${item.target_id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1>신고 관리</h1>
      <div className="card">
        {error && <div className="error-banner">{error}</div>}
        {!items ? (
          <p>불러오는 중...</p>
        ) : items.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>신고된 글·댓글이 없어요.</p>
        ) : (
          items.map((item) => (
            <div key={`${item.target_type}-${item.target_id}`} style={{ borderTop: '1px solid var(--border)', padding: '12px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <span className="badge badge-warn">{item.target_type === 'post' ? '게시글' : '댓글'}</span>{' '}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    신고 {item.report_count}건 · {item.reasons.join(', ')}
                  </span>
                  {item.target?.blinded && <span className="badge badge-danger" style={{ marginLeft: 6 }}>블라인드됨</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {item.target?.blinded && (
                    <button className="btn-secondary" onClick={() => unblind(item)}>블라인드 해제</button>
                  )}
                  <button className="btn-ghost" onClick={() => remove(item)}>영구 삭제</button>
                </div>
              </div>
              {item.target ? (
                <div style={{ marginTop: 8, fontSize: '0.9rem' }}>
                  {item.target_type === 'post' && <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{item.target.title}</p>}
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>{item.target.body}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>작성자: {item.target.nickname}</p>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>이미 삭제된 대상이에요.</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
