import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useGuideContent } from '../context/GuideContentContext.jsx';
import { useCouple } from '../context/CoupleContext.jsx';
import VenueCard from './venueguide/VenueCard.jsx';
import VenueCompareCard from './venueguide/VenueCompareCard.jsx';
import ReferenceQuoteModal from './venueguide/ReferenceQuoteModal.jsx';
import VenueLeadTimeSection from './venueguide/VenueLeadTimeSection.jsx';
import { StarRatingDisplay } from '../components/StarRating.jsx';
import { won } from './venueguide/helpers.js';

export default function VenueGuide() {
  const [venues, setVenues] = useState(null);
  const checklist = useGuideContent('venue.checklist');
  const venueLeadTimeMonths = useGuideContent('roadmap.venue_lead_time');
  const { couple, updateCouple } = useCouple();
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [addingVenue, setAddingVenue] = useState(false);
  const [refQuoteVenue, setRefQuoteVenue] = useState(null);

  useEffect(() => {
    api.get('/venues').then((res) => setVenues(res.venues)).catch((err) => setError(err.message));
  }, []);

  const addVenue = async (e) => {
    e.preventDefault();
    if (!newName.trim() || addingVenue) return;
    setAddingVenue(true);
    try {
      const result = await api.post('/venues', { name: newName.trim() });
      setVenues((prev) => [...prev, result.venue]);
      setNewName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingVenue(false);
    }
  };

  const updateVenue = async (venue, fields) => {
    try {
      const result = await api.patch(`/venues/${venue.id}`, fields);
      setVenues((prev) => prev.map((v) => (v.id === venue.id ? result.venue : v)));
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteVenue = async (venue) => {
    try {
      await api.delete(`/venues/${venue.id}`);
      setVenues((prev) => prev.filter((v) => v.id !== venue.id));
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !venues) return <div className="full-page-center">{error}</div>;
  if (!venues) return <div className="full-page-center">불러오는 중...</div>;

  // 체크리스트 항목 숨김/커스텀 추가는 이 후보 하나가 아니라 couple 전체(모든 후보 카드)에 공유되는 템플릿 설정 —
  // roadmap.hidden_roadmap_tasks/custom_roadmap_tasks와 동일한 패턴
  const hiddenChecklistItems = new Set(couple.hidden_venue_checklist_items || []);
  const customChecklistItems = couple.custom_venue_checklist_items || {};

  const hideChecklistItem = (item) =>
    updateCouple({ hidden_venue_checklist_items: [...hiddenChecklistItems, item] });
  const restoreChecklistItem = (item) =>
    updateCouple({ hidden_venue_checklist_items: [...hiddenChecklistItems].filter((t) => t !== item) });
  const addCustomChecklistItem = (category, text) => {
    const current = customChecklistItems[category] || [];
    return updateCouple({ custom_venue_checklist_items: { ...customChecklistItems, [category]: [...current, text] } });
  };
  const deleteCustomChecklistItem = (category, text) => {
    const current = customChecklistItems[category] || [];
    return updateCouple({
      custom_venue_checklist_items: { ...customChecklistItems, [category]: current.filter((t) => t !== text) },
    });
  };

  return (
    <div>
      <h1>웨딩홀</h1>
      {error && <div className="error-banner">{error}</div>}

      <VenueLeadTimeSection venueLeadTimeMonths={venueLeadTimeMonths} />

      <div className="card">
        <h2>웨딩홀 후보 추가</h2>
        <form onSubmit={addVenue} className="form-row">
          <div className="field">
            <label>이름</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button className="btn-primary" type="submit" disabled={addingVenue}>
              {addingVenue ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>

      {venues.length > 0 && (
        <div className="card">
          <h2>후보 비교</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: -8, marginBottom: 10 }}>
            후보 이름은 가로로 스크롤해도 계속 보여요.
          </p>
          <div className="line-items-table-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: 8, position: 'sticky', left: 0, background: 'var(--bg-alt)' }}>후보</th>
                  <th style={{ padding: 8 }}>평점</th>
                  <th style={{ padding: 8 }}>대관료</th>
                  <th style={{ padding: 8 }}>식대(1인)</th>
                  <th style={{ padding: 8 }}>보증인원</th>
                  <th style={{ padding: 8 }}>초과 인원 추가비용</th>
                  <th style={{ padding: 8 }}>필수 포함 금액</th>
                  <th style={{ padding: 8 }}>총금액</th>
                  <th style={{ padding: 8 }}>예식시간</th>
                  <th style={{ padding: 8 }}>식사 마감</th>
                  <th style={{ padding: 8 }}>근처역</th>
                  <th style={{ padding: 8 }}>참고 견적</th>
                </tr>
              </thead>
              <tbody>
                {venues.map((v) => (
                  <tr key={v.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 8, fontWeight: 600, position: 'sticky', left: 0, background: 'var(--bg-alt)', whiteSpace: 'nowrap' }}>
                      {v.name}
                      {v.is_booked && <span className="badge badge-success" style={{ marginLeft: 6 }}>확정</span>}
                    </td>
                    <td style={{ padding: 8 }}>{v.rating != null ? <StarRatingDisplay rating={v.rating} /> : '-'}</td>
                    <td style={{ padding: 8 }}>{won(v.rental_fee)}</td>
                    <td style={{ padding: 8 }}>{won(v.meal_price)}</td>
                    <td style={{ padding: 8 }}>{v.guaranteed_headcount ?? '-'}</td>
                    <td style={{ padding: 8 }}>{won(v.extra_person_fee)}</td>
                    <td style={{ padding: 8 }}>{won(v.mandatory_fee)}</td>
                    <td style={{ padding: 8, fontWeight: 600, color: 'var(--accent-strong)' }}>{won(v.total_price)}</td>
                    <td style={{ padding: 8 }}>{v.ceremony_time?.slice(0, 5) || '-'}</td>
                    <td style={{ padding: 8 }}>{v.meal_service_until?.slice(0, 5) || '-'}</td>
                    <td style={{ padding: 8 }}>{v.nearby_station || '-'}</td>
                    <td style={{ padding: 8 }}>
                      <button className="btn-ghost" onClick={() => setRefQuoteVenue(v)}>
                        보기/입력
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="line-items-cards">
            {venues.map((v) => (
              <VenueCompareCard key={v.id} venue={v} onOpenRefQuote={() => setRefQuoteVenue(v)} />
            ))}
          </div>
        </div>
      )}

      {refQuoteVenue && (
        <ReferenceQuoteModal
          venue={refQuoteVenue}
          onClose={() => setRefQuoteVenue(null)}
        />
      )}

      {venues.map((v) => (
        <VenueCard
          key={v.id}
          venue={v}
          checklist={checklist}
          hiddenChecklistItems={hiddenChecklistItems}
          customChecklistItems={customChecklistItems}
          onUpdate={updateVenue}
          onDelete={deleteVenue}
          onOpenRefQuote={() => setRefQuoteVenue(v)}
          onHideChecklistItem={hideChecklistItem}
          onRestoreChecklistItem={restoreChecklistItem}
          onAddCustomChecklistItem={addCustomChecklistItem}
          onDeleteCustomChecklistItem={deleteCustomChecklistItem}
        />
      ))}
    </div>
  );
}
