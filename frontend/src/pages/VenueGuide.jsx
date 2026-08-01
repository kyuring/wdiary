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

  const addOption = async (venue) => {
    try {
      const result = await api.post(`/venues/${venue.id}/options`, {});
      setVenues((prev) => prev.map((v) => (v.id === venue.id ? { ...v, options: [...v.options, result.option] } : v)));
    } catch (err) {
      setError(err.message);
    }
  };

  const updateOption = async (venue, option, fields) => {
    try {
      const result = await api.patch(`/venues/${venue.id}/options/${option.id}`, fields);
      setVenues((prev) => prev.map((v) => (v.id === venue.id
        ? { ...v, options: v.options.map((o) => (o.id === option.id ? result.option : o)) }
        : v)));
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteOption = async (venue, option) => {
    try {
      await api.delete(`/venues/${venue.id}/options/${option.id}`);
      setVenues((prev) => prev.map((v) => (v.id === venue.id
        ? { ...v, options: v.options.filter((o) => o.id !== option.id), is_booked: option.is_selected ? false : v.is_booked }
        : v)));
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmOption = async (venue, option) => {
    try {
      const result = await api.post(`/venues/${venue.id}/options/${option.id}/confirm`);
      // 커플 전체에서 예약 확정은 하나만 존재하므로, 다른 웨딩홀의 확정 표시도 서버에서 같이 해제됨 — 로컬 상태도 맞춰줌
      setVenues((prev) => prev.map((v) => (v.id === venue.id
        ? result.venue
        : { ...v, is_booked: false, options: v.options.map((o) => ({ ...o, is_selected: false })) })));
    } catch (err) {
      setError(err.message);
    }
  };

  const unconfirmOption = async (venue, option) => {
    try {
      const result = await api.post(`/venues/${venue.id}/options/${option.id}/unconfirm`);
      setVenues((prev) => prev.map((v) => (v.id === venue.id ? result.venue : v)));
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
  const bookedOption = bookedVenue?.options.find((o) => o.is_selected);

  // 비교표는 후보가 아니라 "후보 + 옵션" 조합이 한 열 — 같은 웨딩홀이라도 시간대별 옵션마다 따로 비교됨.
  // 옵션이 아직 없는 후보도 빈 열로는 보이게 함.
  const compareColumns = venues.flatMap((v) => (
    v.options.length > 0 ? v.options.map((o) => ({ venue: v, option: o })) : [{ venue: v, option: null }]
  ));

  const compareRows = [
    { label: '평점', render: ({ venue }) => (venue.rating != null ? <StarRatingDisplay rating={venue.rating} /> : '-') },
    { label: '대관료', render: ({ option }) => won(option?.rental_fee) },
    { label: '식대(1인)', render: ({ option }) => won(option?.meal_price) },
    { label: '보증인원', render: ({ option }) => option?.guaranteed_headcount ?? '-' },
    { label: '초과 인원 추가비용', render: ({ option }) => won(option?.extra_person_fee) },
    { label: '필수 포함 금액', render: ({ option }) => won(option?.mandatory_fee) },
    {
      label: '총금액',
      render: ({ option }) => {
        const total = option?.total_price ?? option?.quoted_price;
        return total != null ? <strong style={{ color: 'var(--accent-strong)' }}>{won(total)}</strong> : '-';
      },
    },
    { label: '예정일', render: ({ option }) => (option && formatDateKr(option.scheduled_date)) || '-' },
    { label: '예식시간', render: ({ option }) => option?.ceremony_time?.slice(0, 5) || '-' },
    { label: '식사 마감', render: ({ option }) => option?.meal_service_until?.slice(0, 5) || '-' },
    { label: '근처역', render: ({ venue }) => venue.nearby_station || '-' },
    {
      label: '지인 참고 견적',
      render: ({ venue }) => <button className="btn-ghost" onClick={() => setRefQuoteVenue(venue)}>보기/입력</button>,
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
              {bookedOption?.label && <span style={{ color: 'var(--text-muted)' }}> · {bookedOption.label}</span>}
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {[formatDateKr(bookedOption?.scheduled_date), bookedOption?.ceremony_time?.slice(0, 5)].filter(Boolean).join(' · ') || '예정일·시간 미입력'}
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
            후보 비교 <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-muted)' }}>({compareColumns.length}개 옵션 · 펼쳐서 보기)</span>
          </summary>
          <div style={{ overflowX: 'auto', marginTop: 14 }}>
            <table style={{ width: '100%', minWidth: 120 + compareColumns.length * 140, tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <colgroup>
                <col style={{ width: 120 }} />
                {compareColumns.map((c) => <col key={`${c.venue.id}-${c.option?.id ?? 'none'}`} />)}
              </colgroup>
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th style={{ padding: 10, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--bg-alt)' }} />
                  {compareColumns.map(({ venue, option }) => (
                    <th key={`${venue.id}-${option?.id ?? 'none'}`} style={{ padding: 10, textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                      {venue.name}
                      {option?.label && <span style={{ fontWeight: 400 }}> · {option.label}</span>}
                      {option?.is_selected && <span className="badge badge-success" style={{ marginLeft: 6 }}>확정</span>}
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
                    {compareColumns.map((c) => (
                      <td key={`${c.venue.id}-${c.option?.id ?? 'none'}`} style={{ padding: 10, textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                        {row.render(c)}
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
          onAddOption={addOption}
          onUpdateOption={updateOption}
          onDeleteOption={deleteOption}
          onConfirmOption={confirmOption}
          onUnconfirmOption={unconfirmOption}
        />
      ))}

      <VenueLeadTimeSection venueLeadTimeMonths={venueLeadTimeMonths} />
    </div>
  );
}
