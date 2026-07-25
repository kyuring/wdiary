import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useGuideContent } from '../../context/GuideContentContext.jsx';
import { recommendMidpoint } from '../../lib/sangyeonrye.js';

export default function SangyeonryeSummaryWidget() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const regionGroups = useGuideContent('sangyeonrye.region_groups');
  const midpointPairs = useGuideContent('sangyeonrye.midpoint_pairs');

  useEffect(() => {
    api.get('/sangyeonrye').then((res) => setData(res.sangyeonrye)).catch((err) => setError(err.message));
  }, []);

  if (data === null && !error) return null;
  // 상견례 장소가 확정됐다면(=상견례를 이미 진행/예약했다면) 더 볼 필요가 없으니 카드 자체를 숨김
  if (data?.decided_place) return null;

  const recommendation = data && recommendMidpoint(regionGroups, midpointPairs, data.groom_region, data.bride_region);

  return (
    <div className="card">
      <h2>상견례</h2>
      {error && <div className="error-banner">{error}</div>}
      {!data || (!data.groom_region && !data.bride_region) ? (
        <p style={{ color: 'var(--text-muted)' }}>지역을 선택하면 추천 장소를 알려드려요.</p>
      ) : (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {data.groom_region || '?'} · {data.bride_region || '?'}
          </p>
          {recommendation && <p style={{ fontSize: '0.85rem', marginTop: 4 }}>{recommendation}</p>}
        </>
      )}
      <p style={{ marginTop: 12 }}>
        <Link to="/sangyeonrye" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block' }}>
          상견례로 이동
        </Link>
      </p>
    </div>
  );
}
