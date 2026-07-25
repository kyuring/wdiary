import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';

export default function VendorSummaryWidget() {
  const [vendors, setVendors] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/vendors').then((res) => setVendors(res.vendors)).catch((err) => setError(err.message));
  }, []);

  if (!vendors) return null;

  const counts = vendors.reduce((acc, v) => {
    acc[v.contract_status] = (acc[v.contract_status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="card">
      <h2>업체 컨택</h2>
      {error && <div className="error-banner">{error}</div>}
      {vendors.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>아직 등록한 업체가 없어요.</p>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {['상담중', '계약완료', '결제완료'].map((s) => `${s} ${counts[s] || 0}`).join(' · ')}
        </p>
      )}
      <p style={{ marginTop: 12 }}>
        <Link to="/vendors" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block' }}>
          업체 컨택 관리로 이동
        </Link>
      </p>
    </div>
  );
}
