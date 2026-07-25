import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import MoneyInput from '../../components/MoneyInput.jsx';
import { downloadCsv } from '../../lib/exportCsv.js';
import { won } from './helpers.js';

const PAYMENT_LABELS = { cash: '현금', transfer: '계좌이체' };

function GiftRow({ gift, index, onUpdate, onDelete }) {
  const [name, setName] = useState(gift.name || '');
  const [relation, setRelation] = useState(gift.relation || '');
  const [amount, setAmount] = useState(gift.amount ?? '');
  const [mealTickets, setMealTickets] = useState(gift.meal_tickets ?? '');
  const [memo, setMemo] = useState(gift.memo || '');

  useEffect(() => setName(gift.name || ''), [gift.name]);
  useEffect(() => setRelation(gift.relation || ''), [gift.relation]);
  useEffect(() => setAmount(gift.amount ?? ''), [gift.amount]);
  useEffect(() => setMealTickets(gift.meal_tickets ?? ''), [gift.meal_tickets]);
  useEffect(() => setMemo(gift.memo || ''), [gift.memo]);

  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
      <span style={{ width: 28, textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{index}</span>
      <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== (gift.name || '') && onUpdate(gift, { name })} placeholder="이름" style={{ width: 80 }} />
      <input value={relation} onChange={(e) => setRelation(e.target.value)} onBlur={() => relation !== (gift.relation || '') && onUpdate(gift, { relation })} placeholder="관계" style={{ width: 70 }} />
      <div style={{ width: 110 }}>
        <MoneyInput value={amount} onChange={setAmount} onBlurCommit={() => Number(amount || 0) !== Number(gift.amount || 0) && onUpdate(gift, { amount: amount === '' ? null : Number(amount) })} />
      </div>
      <select value={gift.payment_method || ''} onChange={(e) => onUpdate(gift, { payment_method: e.target.value || null })}>
        <option value="">방법</option>
        <option value="cash">현금</option>
        <option value="transfer">계좌이체</option>
      </select>
      <input
        type="number"
        min="0"
        style={{ width: 140 }}
        value={mealTickets}
        onChange={(e) => setMealTickets(e.target.value)}
        onBlur={() => Number(mealTickets || 0) !== Number(gift.meal_tickets || 0) && onUpdate(gift, { meal_tickets: mealTickets === '' ? null : Number(mealTickets) })}
        placeholder="식권 수량(장)"
        title="식권 수량"
      />
      <input value={memo} onChange={(e) => setMemo(e.target.value)} onBlur={() => memo !== (gift.memo || '') && onUpdate(gift, { memo })} placeholder="메모" style={{ flex: 1, minWidth: 50 }} />
      <button className="btn-ghost" onClick={() => onDelete(gift)}>삭제</button>
    </li>
  );
}

const SIDE_LABELS = { groom: '신랑측', bride: '신부측' };

export default function GiftSection() {
  const [side, setSide] = useState(null);
  const [gifts, setGifts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/wedding-day/gifts').then((res) => { setSide(res.side); setGifts(res.gifts); }).catch((err) => setError(err.message));
  }, []);

  const addGift = async () => {
    const result = await api.post('/wedding-day/gifts', {});
    setGifts((prev) => [...prev, result.gift]);
  };
  const updateGift = async (gift, fields) => {
    const result = await api.patch(`/wedding-day/gifts/${gift.id}`, fields);
    setGifts((prev) => prev.map((g) => (g.id === gift.id ? result.gift : g)));
  };
  const deleteGift = async (gift) => {
    await api.delete(`/wedding-day/gifts/${gift.id}`);
    setGifts((prev) => prev.filter((g) => g.id !== gift.id));
  };

  if (!gifts) {
    return error ? <div className="card"><div className="error-banner">{error}</div></div> : null;
  }

  const total = gifts.reduce((sum, g) => sum + Number(g.amount || 0), 0);
  const totalMeals = gifts.reduce((sum, g) => sum + Number(g.meal_tickets || 0), 0);
  const cashTotal = gifts.filter((g) => g.payment_method === 'cash').reduce((sum, g) => sum + Number(g.amount || 0), 0);
  const transferTotal = gifts.filter((g) => g.payment_method === 'transfer').reduce((sum, g) => sum + Number(g.amount || 0), 0);
  const unspecifiedTotal = total - cashTotal - transferTotal;

  const exportCsv = () => {
    const headers = ['번호', '이름', '관계', '금액', '결제방법', '식권(장)', '메모'];
    const rows = gifts.map((g, idx) => [
      idx + 1,
      g.name || '',
      g.relation || '',
      g.amount ?? '',
      PAYMENT_LABELS[g.payment_method] || '',
      g.meal_tickets ?? '',
      g.memo || '',
    ]);
    rows.push(['', '현금 합계', '', cashTotal, '', '', '']);
    rows.push(['', '계좌이체 합계', '', transferTotal, '', '', '']);
    rows.push(['', '전체 합계', '', total, '', totalMeals, '']);
    downloadCsv(`축의금_${SIDE_LABELS[side]}.csv`, headers, rows);
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>축의금 트래커 — {SIDE_LABELS[side]}</h2>
        <button className="btn-secondary" onClick={exportCsv} disabled={gifts.length === 0}>엑셀로 내보내기</button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 12 }}>
        로그인한 계정 기준으로 {SIDE_LABELS[side]} 목록만 보여요. 배우자 계정으로 로그인하면 그쪽 목록만 보이고, 서로의 목록은 API 응답에도 실리지 않아요.
      </p>
      {error && <div className="error-banner">{error}</div>}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: '0.9rem' }}>
        <span>전체 합계: <strong style={{ color: 'var(--accent-strong)' }}>{won(total)}</strong></span>
        <span>현금: <strong>{won(cashTotal)}</strong></span>
        <span>계좌이체: <strong>{won(transferTotal)}</strong></span>
        {unspecifiedTotal > 0 && <span style={{ color: 'var(--text-muted)' }}>결제방법 미입력: {won(unspecifiedTotal)}</span>}
        <span>식권: <strong>{totalMeals}장</strong></span>
      </div>
      <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
        {gifts.map((g, idx) => (
          <GiftRow key={g.id} gift={g} index={idx + 1} onUpdate={updateGift} onDelete={deleteGift} />
        ))}
      </ul>
      <button className="btn-ghost" style={{ marginTop: 10 }} onClick={addGift}>+ 추가</button>
    </div>
  );
}
