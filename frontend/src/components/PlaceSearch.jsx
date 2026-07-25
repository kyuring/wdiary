import { useState } from 'react';
import { api } from '../api/client.js';

// 카카오 로컬 API 키워드 검색 결과 리스트. 웨딩홀/상견례 장소/스드메 업체 검색에 공용으로 사용.
export default function PlaceSearch({ defaultQuery = '' }) {
  const [query, setQuery] = useState(defaultQuery);
  const [places, setPlaces] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const search = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.get(`/places/search?query=${encodeURIComponent(query.trim())}`);
      setPlaces(result.places);
    } catch (err) {
      setError(err.message);
      setPlaces(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={search} className="form-row">
        <div className="field">
          <label>장소 검색 (카카오맵)</label>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="예: 대전 한정식" />
        </div>
        <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
          <label>&nbsp;</label>
          <button className="btn-secondary" type="submit" disabled={loading}>
            {loading ? '검색 중...' : '검색'}
          </button>
        </div>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {places && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {places.length === 0 && <li style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>검색 결과가 없어요.</li>}
          {places.map((p, idx) => (
            <li key={idx} style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600 }}>
                <a href={p.url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                  {p.name}
                </a>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{p.category}</div>
              <div style={{ fontSize: '0.85rem', marginTop: 2 }}>{p.address}</div>
              {p.phone && <div style={{ fontSize: '0.85rem' }}>{p.phone}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
