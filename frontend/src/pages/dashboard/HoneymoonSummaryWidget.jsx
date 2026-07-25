import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { won } from './helpers.js';

export default function HoneymoonSummaryWidget() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/honeymoon').then((res) => setData(res.honeymoon)).catch((err) => setError(err.message));
  }, []);

  if (data === null && !error) return null;

  return (
    <div className="card">
      <h2>신혼여행</h2>
      {error && <div className="error-banner">{error}</div>}
      {!data?.destination ? (
        <p style={{ color: 'var(--text-muted)' }}>목적지를 정하면 여기에 표시돼요.</p>
      ) : (
        <>
          <p style={{ fontSize: '0.9rem' }}><strong>{data.destination}</strong></p>
          {data.budget != null && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>예산 {won(data.budget)}</p>
          )}
        </>
      )}
      <p style={{ marginTop: 12 }}>
        <Link to="/honeymoon" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block' }}>
          신혼여행으로 이동
        </Link>
      </p>
    </div>
  );
}
