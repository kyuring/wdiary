import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import GuestRow from './guests/GuestRow.jsx';
import InvitationSection from './guests/InvitationSection.jsx';
import { SIDE_LABELS, extractGuaranteeCount } from './guests/helpers.js';

export default function Guests() {
  const [guests, setGuests] = useState(null);
  const [venues, setVenues] = useState(null);
  const [error, setError] = useState('');
  const [newGuest, setNewGuest] = useState({ name: '', side: '' });
  const [adding, setAdding] = useState(false);
  const [sideFilter, setSideFilter] = useState('all');

  useEffect(() => {
    Promise.all([api.get('/guests'), api.get('/venues')])
      .then(([g, v]) => {
        setGuests(g.guests);
        setVenues(v.venues);
      })
      .catch((err) => setError(err.message));
  }, []);

  const updateGuest = async (guest, fields) => {
    try {
      const result = await api.patch(`/guests/${guest.id}`, fields);
      setGuests((prev) => prev.map((g) => (g.id === guest.id ? result.guest : g)));
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteGuest = async (guest) => {
    await api.delete(`/guests/${guest.id}`);
    setGuests((prev) => prev.filter((g) => g.id !== guest.id));
  };

  const addGuest = async (e) => {
    e.preventDefault();
    if (!newGuest.name || adding) return;
    setAdding(true);
    try {
      const result = await api.post('/guests', newGuest);
      setGuests((prev) => [...prev, result.guest]);
      setNewGuest({ name: '', side: newGuest.side });
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const exportCsv = () => {
    const header = ['이름', '구분', '그룹', '연락처', '참석여부', '식수', '청첩장전달'];
    const rows = guests.map((g) => [
      g.name,
      SIDE_LABELS[g.side] || '',
      g.group_name || '',
      g.phone || '',
      g.rsvp,
      g.meal_count,
      g.notified ? 'Y' : 'N',
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '하객리스트.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!guests || !venues) return <div className="full-page-center">불러오는 중...</div>;

  const filtered = sideFilter === 'all' ? guests : guests.filter((g) => g.side === sideFilter);
  const groomCount = guests.filter((g) => g.side === 'groom').length;
  const brideCount = guests.filter((g) => g.side === 'bride').length;
  const confirmed = guests.filter((g) => g.rsvp === '참석').length;
  const expectedMeals = guests.filter((g) => g.rsvp !== '불참').reduce((sum, g) => sum + Number(g.meal_count || 0), 0);

  const booked = venues.find((v) => v.is_booked);
  const guaranteeText = booked?.checks?.['보증 인원 수 및 초과 인원 1인당 추가비용'];
  const guaranteeCount = extractGuaranteeCount(guaranteeText);

  return (
    <div>
      <h1>하객·청첩장 관리</h1>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h2>집계</h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: '0.9rem' }}>
          <span>신랑측 {groomCount}명</span>
          <span>신부측 {brideCount}명</span>
          <span>참석 확정 {confirmed}명</span>
          <span>예상 식수 {expectedMeals}인분</span>
        </div>
        {guaranteeCount != null ? (
          <p style={{ marginTop: 8, fontSize: '0.9rem' }}>
            예약한 웨딩홀 보증 인원(약 {guaranteeCount}명) 대비{' '}
            {expectedMeals > guaranteeCount ? (
              <span className="badge badge-warn">{expectedMeals - guaranteeCount}명 초과</span>
            ) : (
              <span className="badge badge-success">{guaranteeCount - expectedMeals}명 여유</span>
            )}
            <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>(웨딩홀 체크리스트 답변에서 추출 — 정확하지 않을 수 있어요)</span>
          </p>
        ) : (
          <p style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            웨딩홀에서 후보를 예약 확정하고 보증 인원을 입력하면 여기서 비교해드려요.
          </p>
        )}
      </div>

      <InvitationSection />

      <div className="card">
        <h2>하객 리스트</h2>
        <div className="form-row" style={{ marginBottom: 8 }}>
          <div className="field" style={{ minWidth: 'auto' }}>
            <label>구분 필터</label>
            <select value={sideFilter} onChange={(e) => setSideFilter(e.target.value)}>
              <option value="all">전체</option>
              <option value="groom">신랑측</option>
              <option value="bride">신부측</option>
            </select>
          </div>
          <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button className="btn-secondary" onClick={exportCsv} type="button">CSV 내보내기</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: 8 }}>이름</th>
                <th style={{ padding: 8 }}>구분</th>
                <th style={{ padding: 8 }}>그룹</th>
                <th style={{ padding: 8 }}>연락처</th>
                <th style={{ padding: 8 }}>참석여부</th>
                <th style={{ padding: 8 }}>식수</th>
                <th style={{ padding: 8 }}>청첩장</th>
                <th style={{ padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <GuestRow key={g.id} guest={g} onUpdate={updateGuest} onDelete={deleteGuest} />
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={addGuest} className="form-row" style={{ marginTop: 16 }}>
          <div className="field">
            <label>이름</label>
            <input value={newGuest.name} onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })} />
          </div>
          <div className="field">
            <label>구분</label>
            <select value={newGuest.side} onChange={(e) => setNewGuest({ ...newGuest, side: e.target.value })}>
              <option value="">미지정</option>
              <option value="groom">신랑측</option>
              <option value="bride">신부측</option>
            </select>
          </div>
          <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button className="btn-primary" type="submit" disabled={adding}>
              {adding ? '추가 중...' : '하객 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
