import { useState } from 'react';
import { useCouple } from '../../context/CoupleContext.jsx';
import { DAY_TYPE_LABELS, SEASON_LABELS, needsVenueUrgencyBadge } from '../../lib/roadmap.js';

export default function VenueLeadTimeSection({ venueLeadTimeMonths }) {
  const { couple, updateCouple } = useCouple();
  const [season, setSeason] = useState(couple.venue_season || '');
  const [dayType, setDayType] = useState(couple.venue_day_type || '');
  const [bookedDate, setBookedDate] = useState(couple.venue_booked_date || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const saveSeasonDayType = async () => {
    setError('');
    setSaving(true);
    try {
      await updateCouple({ venue_season: season, venue_day_type: dayType });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveBookedDate = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await updateCouple({ venue_booked_date: bookedDate || null });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const urgent = needsVenueUrgencyBadge(venueLeadTimeMonths, {
    weddingDateStr: couple.wedding_date,
    venueBookedDate: couple.venue_booked_date,
    venueSeason: couple.venue_season,
    venueDayType: couple.venue_day_type,
  });

  return (
    <div className="card">
      <h2>웨딩홀 예약 리드타임</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        웨딩홀은 시즌·요일에 따라 총 준비기간과 무관하게 최소 예약 리드타임이 필요해요.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {couple.venue_booked_date ? (
        <p>
          <span className="badge badge-success">✓ 웨딩홀 예약 완료 ({couple.venue_booked_date})</span>
        </p>
      ) : (
        urgent && (
          <p>
            <span className="badge badge-warn">⚠ 웨딩홀 예약을 최우선으로 서두르세요</span>
          </p>
        )
      )}

      <div className="form-row" style={{ marginTop: 16 }}>
        <div className="field">
          <label htmlFor="season">희망 시즌</label>
          <select id="season" value={season} onChange={(e) => setSeason(e.target.value)}>
            <option value="">선택 안 함</option>
            <option value="peak">{SEASON_LABELS.peak}</option>
            <option value="off_peak">{SEASON_LABELS.off_peak}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="dayType">희망 요일</label>
          <select id="dayType" value={dayType} onChange={(e) => setDayType(e.target.value)}>
            <option value="">선택 안 함</option>
            <option value="saturday">토요일</option>
            <option value="sunday">일요일</option>
            <option value="weekday">평일</option>
          </select>
        </div>
      </div>
      <button className="btn-secondary" onClick={saveSeasonDayType} disabled={saving}>
        저장
      </button>

      {venueLeadTimeMonths && (
        <div style={{ overflowX: 'auto', marginTop: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: 8 }}>요일 \ 시즌</th>
                <th style={{ padding: 8 }}>성수기</th>
                <th style={{ padding: 8 }}>비수기</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(DAY_TYPE_LABELS).map(([key, label]) => (
                <tr
                  key={key}
                  style={{
                    borderTop: '1px solid var(--border)',
                    background: dayType === key ? 'var(--accent-bg)' : 'transparent',
                  }}
                >
                  <td style={{ padding: 8, fontWeight: 600 }}>{label}</td>
                  <td style={{ padding: 8 }}>{venueLeadTimeMonths[key].peak}개월 전~</td>
                  <td style={{ padding: 8 }}>{venueLeadTimeMonths[key].off_peak}개월 전~</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={saveBookedDate} style={{ marginTop: 20 }}>
        <div className="field">
          <label htmlFor="bookedDate">웨딩홀 예약일 (예약 완료 시 입력하면 경고 배지가 사라져요)</label>
          <input
            id="bookedDate"
            type="date"
            value={bookedDate}
            onChange={(e) => setBookedDate(e.target.value)}
          />
        </div>
        <button className="btn-primary" type="submit" disabled={saving}>
          저장
        </button>
      </form>
    </div>
  );
}
