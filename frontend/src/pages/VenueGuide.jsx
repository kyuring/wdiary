import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useGuideContent } from '../context/GuideContentContext.jsx';
import { useCouple } from '../context/CoupleContext.jsx';
import VenueCard from './venueguide/VenueCard.jsx';
import ReferenceQuoteModal from './venueguide/ReferenceQuoteModal.jsx';
import VenueLeadTimeSection from './venueguide/VenueLeadTimeSection.jsx';
import { StarRatingDisplay } from '../components/StarRating.jsx';
import { won, formatDateKr } from './venueguide/helpers.js';

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

  const bookedVenue = venues.find((v) => v.is_booked);

  const compareRows = [
    { label: '평점', render: (v) => (v.rating != null ? <StarRatingDisplay rating={v.rating} /> : '-') },
    { label: '대관료', render: (v) => won(v.rental_fee) },
    { label: '식대(1인)', render: (v) => won(v.meal_price) },
    { label: '보증인원', render: (v) => v.guaranteed_headcount ?? '-' },
    { label: '초과 인원 추가비용', render: (v) => won(v.extra_person_fee) },
    { label: '필수 포함 금액', render: (v) => won(v.mandatory_fee) },
    { label: '총금액', render: (v) => <strong style={{ color: 'var(--accent-strong)' }}>{won(v.total_price)}</strong> },
    { label: '예정일', render: (v) => formatDateKr(v.scheduled_date) || '-' },
    { label: '예식시간', render: (v) => v.ceremony_time?.slice(0, 5) || '-' },
    { label: '식사 마감', render: (v) => v.meal_service_until?.slice(0, 5) || '-' },
    { label: '근처역', render: (v) => v.nearby_station || '-' },
    {
      label: '견적',
      render: (v) => <button className="btn-ghost" onClick={() => setRefQuoteVenue(v)}>보기/입력</button>,
    },
  ];

  return (
    <div>
      <h1>웨딩홀</h1>
      {error && <div className="error-banner">{error}</div>}

      {bookedVenue && (
        <div className="card" style={{ borderColor: 'var(--accent)', background: 'var(--accent-bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span className="badge badge-success" style={{ marginRight: 8 }}>예약 확정</span>
              <strong style={{ fontSize: '1.05rem' }}>{bookedVenue.name}</strong>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {[formatDateKr(bookedVenue.scheduled_date), bookedVenue.ceremony_time?.slice(0, 5)].filter(Boolean).join(' · ') || '예정일·시간 미입력'}
            </span>
          </div>
        </div>
      )}

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
        <details className="card">
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '1.05rem' }}>
            후보 비교 <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-muted)' }}>({venues.length}곳 · 펼쳐서 보기)</span>
          </summary>
          <div style={{ overflowX: 'auto', marginTop: 14 }}>
            <table style={{ width: '100%', minWidth: 120 + venues.length * 140, tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <colgroup>
                <col style={{ width: 120 }} />
                {venues.map((v) => <col key={v.id} />)}
              </colgroup>
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th style={{ padding: 10, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--bg-alt)' }} />
                  {venues.map((v) => (
                    <th key={v.id} style={{ padding: 10, textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                      {v.name}
                      {v.is_booked && <span className="badge badge-success" style={{ marginLeft: 6 }}>확정</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => (
                  <tr key={row.label} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: 10, fontWeight: 600, position: 'sticky', left: 0, background: 'var(--bg-alt)' }}>
                      {row.label}
                    </td>
                    {venues.map((v) => (
                      <td key={v.id} style={{ padding: 10, textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                        {row.render(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
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

      <VenueLeadTimeSection venueLeadTimeMonths={venueLeadTimeMonths} />
    </div>
  );
}
