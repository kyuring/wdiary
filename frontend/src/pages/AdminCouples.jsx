import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

function formatDate(iso) {
  if (!iso) return '-';
  return String(iso).slice(0, 10);
}

export default function AdminCouples() {
  const [couples, setCouples] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/couples').then((res) => setCouples(res.couples)).catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1>이용 커플 현황</h1>
      <div className="card">
        {error && <div className="error-banner">{error}</div>}
        {!couples ? (
          <p>불러오는 중...</p>
        ) : couples.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>아직 등록된 커플이 없어요.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: 8 }}>신랑</th>
                  <th style={{ padding: 8 }}>신부</th>
                  <th style={{ padding: 8 }}>결혼예정일</th>
                  <th style={{ padding: 8 }}>웨딩홀 예약</th>
                  <th style={{ padding: 8 }}>가입일</th>
                </tr>
              </thead>
              <tbody>
                {couples.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>{c.groom_nickname || c.groom_name || '-'}</td>
                    <td style={{ padding: 8 }}>{c.bride_nickname || c.bride_name || (c.bride_username ? '' : '미가입')}</td>
                    <td style={{ padding: 8 }}>{formatDate(c.wedding_date)}</td>
                    <td style={{ padding: 8 }}>
                      {c.venue_booked_date ? <span className="badge badge-success">완료</span> : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                    </td>
                    <td style={{ padding: 8 }}>{formatDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
