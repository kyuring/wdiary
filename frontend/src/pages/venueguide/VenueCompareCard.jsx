import { StarRatingDisplay } from '../../components/StarRating.jsx';
import { won } from './helpers.js';

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: '0.88rem' }}>{value}</div>
    </div>
  );
}

// 후보 비교 표의 모바일용 요약 카드. 표와 같은 항목을 읽기 전용으로 보여주기만 함(수정은 아래
// VenueCard의 펼치는 카드에서) — 예산관리의 line-items-table-wrap/line-items-cards와 같은 패턴.
export default function VenueCompareCard({ venue, onOpenRefQuote }) {
  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <strong>{venue.name}</strong>
        {venue.is_booked && <span className="badge badge-success">확정</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Stat label="평점" value={venue.rating != null ? <StarRatingDisplay rating={venue.rating} /> : '-'} />
        <Stat label="총금액" value={<span style={{ fontWeight: 600, color: 'var(--accent-strong)' }}>{won(venue.total_price)}</span>} />
        <Stat label="대관료" value={won(venue.rental_fee)} />
        <Stat label="식대(1인)" value={won(venue.meal_price)} />
        <Stat label="보증인원" value={venue.guaranteed_headcount ?? '-'} />
        <Stat label="근처역" value={venue.nearby_station || '-'} />
        <Stat label="예식시간" value={venue.ceremony_time?.slice(0, 5) || '-'} />
        <Stat label="식사 마감" value={venue.meal_service_until?.slice(0, 5) || '-'} />
      </div>
      <button className="btn-ghost" style={{ marginTop: 10, fontSize: '0.8rem' }} onClick={onOpenRefQuote}>
        참고 견적 보기/입력
      </button>
    </div>
  );
}
