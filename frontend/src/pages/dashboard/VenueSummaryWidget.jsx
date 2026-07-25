import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { won } from './helpers.js';

const VENUE_KEY_FIELDS = ['대관료', '보증 인원 수 및 초과 인원 1인당 추가비용', '식대(1인 기준) 및 부가세 포함 여부'];

export function BookedVenueLine() {
  const [venues, setVenues] = useState(null);

  useEffect(() => {
    api.get('/venues').then((res) => setVenues(res.venues)).catch(() => setVenues([]));
  }, []);

  const booked = venues?.find((v) => v.is_booked);
  if (!booked) return null;

  return (
    <p style={{ marginTop: 4, color: 'var(--text-muted)' }}>
      📍 {booked.name}
    </p>
  );
}

export default function VenueSummaryWidget() {
  const [venues, setVenues] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/venues').then((res) => setVenues(res.venues)).catch((err) => setError(err.message));
  }, []);

  if (!venues) return null;

  const booked = venues.find((v) => v.is_booked);
  const priced = venues.filter((v) => v.quoted_price != null);
  const cheapest = priced.length ? priced.reduce((a, b) => (Number(a.quoted_price) < Number(b.quoted_price) ? a : b)) : null;

  return (
    <div className="card">
      <h2>웨딩홀</h2>
      {error && <div className="error-banner">{error}</div>}
      {venues.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>아직 등록한 후보가 없어요.</p>
      ) : booked ? (
        <>
          <p><span className="badge badge-success">✓ {booked.name} 예약 확정</span></p>
          {booked.quoted_price != null && (
            <p style={{ fontSize: '0.85rem', marginTop: 6 }}>견적 {won(booked.quoted_price)}</p>
          )}
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {VENUE_KEY_FIELDS.map((field) => (
              <li key={field}>{field}: {booked.checks?.[field] || '미입력'}</li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>후보 {venues.length}곳 비교 중</p>
          {cheapest && (
            <p style={{ marginTop: 4, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              최저 견적: {cheapest.name} ({won(cheapest.quoted_price)})
            </p>
          )}
        </>
      )}
      <p style={{ marginTop: 12 }}>
        <Link to="/venues" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block' }}>
          웨딩홀로 이동
        </Link>
      </p>
    </div>
  );
}
