import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function AdminUsers() {
  const [users, setUsers] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    api.get(`/admin/users${q}`).then((res) => setUsers(res.users)).catch((err) => setError(err.message));
  };

  useEffect(load, []);

  const suspend = async (user, days) => {
    const until = days == null ? null : new Date(Date.now() + days * 86400000).toISOString();
    await api.patch(`/admin/users/${user.id}/suspend`, { until });
    load();
  };

  return (
    <div>
      <h1>사용자 관리</h1>
      <div className="card">
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="form-row">
          <div className="field">
            <label>아이디/닉네임 검색</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button className="btn-secondary" type="submit">검색</button>
          </div>
        </form>

        {!users ? null : (
          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: 8 }}>아이디</th>
                  <th style={{ padding: 8 }}>닉네임</th>
                  <th style={{ padding: 8 }}>권한</th>
                  <th style={{ padding: 8 }}>정지 상태</th>
                  <th style={{ padding: 8 }}></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const suspended = u.suspended_until && new Date(u.suspended_until) > new Date();
                  return (
                    <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: 8 }}>{u.username}</td>
                      <td style={{ padding: 8 }}>{u.nickname}</td>
                      <td style={{ padding: 8 }}>{u.role}</td>
                      <td style={{ padding: 8 }}>
                        {suspended ? (
                          <span className="badge badge-danger">{new Date(u.suspended_until).toISOString().slice(0, 10)}까지 정지</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>정상</span>
                        )}
                      </td>
                      <td style={{ padding: 8 }}>
                        {suspended ? (
                          <button className="btn-ghost" onClick={() => suspend(u, null)}>정지 해제</button>
                        ) : (
                          <>
                            <button className="btn-ghost" onClick={() => suspend(u, 7)}>7일 정지</button>{' '}
                            <button className="btn-ghost" onClick={() => suspend(u, 30)}>30일 정지</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
