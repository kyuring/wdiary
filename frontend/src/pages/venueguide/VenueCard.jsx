import { useEffect, useState } from 'react';
import MoneyInput from '../../components/MoneyInput.jsx';
import { StarRatingInput, StarRatingDisplay } from '../../components/StarRating.jsx';
import { won } from './helpers.js';

function CheckField({ label, value, onSave }) {
  const [text, setText] = useState(value || '');

  useEffect(() => setText(value || ''), [value]);

  return (
    <div className="field" style={{ marginBottom: 10 }}>
      <label>{label}</label>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== (value || '') && onSave(label, text)}
      />
    </div>
  );
}

export default function VenueCard({ venue, checklist, onUpdate, onDelete, onOpenRefQuote }) {
  const [name, setName] = useState(venue.name);
  const [notes, setNotes] = useState(venue.notes || '');
  const [quotedPrice, setQuotedPrice] = useState(venue.quoted_price ?? '');
  const [rentalFee, setRentalFee] = useState(venue.rental_fee ?? '');
  const [mealPrice, setMealPrice] = useState(venue.meal_price ?? '');
  const [headcount, setHeadcount] = useState(venue.guaranteed_headcount ?? '');
  const [extraFee, setExtraFee] = useState(venue.extra_person_fee ?? '');
  const [mandatoryFee, setMandatoryFee] = useState(venue.mandatory_fee ?? '');
  const [station, setStation] = useState(venue.nearby_station || '');

  useEffect(() => setName(venue.name), [venue.name]);
  useEffect(() => setNotes(venue.notes || ''), [venue.notes]);
  useEffect(() => setQuotedPrice(venue.quoted_price ?? ''), [venue.quoted_price]);
  useEffect(() => setRentalFee(venue.rental_fee ?? ''), [venue.rental_fee]);
  useEffect(() => setMealPrice(venue.meal_price ?? ''), [venue.meal_price]);
  useEffect(() => setHeadcount(venue.guaranteed_headcount ?? ''), [venue.guaranteed_headcount]);
  useEffect(() => setExtraFee(venue.extra_person_fee ?? ''), [venue.extra_person_fee]);
  useEffect(() => setMandatoryFee(venue.mandatory_fee ?? ''), [venue.mandatory_fee]);
  useEffect(() => setStation(venue.nearby_station || ''), [venue.nearby_station]);

  const saveCheck = (key, val) => onUpdate(venue, { checks: { [key]: val } });
  const commitNumber = (field, next, current) =>
    Number(next || 0) !== Number(current || 0) && onUpdate(venue, { [field]: next === '' ? null : Number(next) });

  return (
    <details className="card">
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
        {venue.name} {venue.quoted_price != null && <span style={{ color: 'var(--accent-strong)' }}>· {won(venue.quoted_price)}</span>}
        {venue.rating != null && <span style={{ marginLeft: 8, fontWeight: 400, fontSize: '0.9rem' }}><StarRatingDisplay rating={venue.rating} /></span>}
        {venue.is_booked && <span className="badge badge-success" style={{ marginLeft: 8 }}>✓ 예약 확정</span>}
      </summary>

      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {venue.is_booked ? (
          <button className="btn-ghost" onClick={() => onUpdate(venue, { is_booked: false })}>예약 확정 취소</button>
        ) : (
          <button className="btn-secondary" onClick={() => onUpdate(venue, { is_booked: true })}>이 후보로 예약 확정</button>
        )}
        <button className="btn-ghost" onClick={onOpenRefQuote}>
          참고 견적 보기/입력
        </button>
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <label>평점(투어 다녀온 뒤 매겨보세요)</label>
        <StarRatingInput value={venue.rating} onChange={(v) => onUpdate(venue, { rating: v === '' ? null : v })} />
      </div>

      <div className="form-row" style={{ marginTop: 16 }}>
        <div className="field">
          <label>후보 이름</label>
          <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== venue.name && onUpdate(venue, { name })} />
        </div>
        <div className="field">
          <label>받은 견적(총액)</label>
          <MoneyInput
            value={quotedPrice}
            onChange={setQuotedPrice}
            onBlurCommit={() => Number(quotedPrice || 0) !== Number(venue.quoted_price || 0) && onUpdate(venue, { quoted_price: quotedPrice === '' ? null : Number(quotedPrice) })}
          />
        </div>
      </div>

      <div className="field">
        <label>메모</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (venue.notes || '') && onUpdate(venue, { notes })} />
      </div>

      <h3 style={{ marginTop: 20, marginBottom: 8, fontSize: '0.95rem' }}>비교 정보 (총금액 계산용)</h3>
      <div className="form-row">
        <div className="field">
          <label>대관료</label>
          <MoneyInput value={rentalFee} onChange={setRentalFee} onBlurCommit={() => commitNumber('rental_fee', rentalFee, venue.rental_fee)} />
        </div>
        <div className="field">
          <label>식대(1인 기준)</label>
          <MoneyInput value={mealPrice} onChange={setMealPrice} onBlurCommit={() => commitNumber('meal_price', mealPrice, venue.meal_price)} />
        </div>
        <div className="field">
          <label>보증 인원</label>
          <input
            type="number" min="0" value={headcount}
            onChange={(e) => setHeadcount(e.target.value)}
            onBlur={() => commitNumber('guaranteed_headcount', headcount, venue.guaranteed_headcount)}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>보증 인원 초과 시 1인당 추가비용</label>
          <MoneyInput value={extraFee} onChange={setExtraFee} onBlurCommit={() => commitNumber('extra_person_fee', extraFee, venue.extra_person_fee)} />
        </div>
        <div className="field">
          <label>필수 포함 금액</label>
          <MoneyInput value={mandatoryFee} onChange={setMandatoryFee} onBlurCommit={() => commitNumber('mandatory_fee', mandatoryFee, venue.mandatory_fee)} />
        </div>
        <div className="field">
          <label>근처 지하철역</label>
          <input value={station} onChange={(e) => setStation(e.target.value)} onBlur={() => station !== (venue.nearby_station || '') && onUpdate(venue, { nearby_station: station || null })} />
        </div>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>
        필수 포함 금액: 원판·앨범·서비스료 등 계약상 반드시 함께 지불해야 하는 항목의 합계
      </p>
      {venue.total_price != null && (
        <p style={{ fontSize: '0.9rem', margin: '0 0 8px' }}>
          총금액 = 대관료 + 식대 × 보증인원 + 필수 포함 금액 = <strong style={{ color: 'var(--accent-strong)' }}>{won(venue.total_price)}</strong> (자동 계산됨)
        </p>
      )}

      {Object.entries(checklist || {}).map(([category, items]) => (
        <details key={category} style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>{category}</summary>
          <div style={{ marginTop: 10 }}>
            {items.map((item) => (
              <CheckField key={item} label={item} value={venue.checks?.[item]} onSave={saveCheck} />
            ))}
          </div>
        </details>
      ))}

      <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => onDelete(venue)}>
        후보 삭제
      </button>
    </details>
  );
}
