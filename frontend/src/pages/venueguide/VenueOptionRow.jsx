import { useEffect, useState } from 'react';
import MoneyInput from '../../components/MoneyInput.jsx';
import { won, formatDateKr } from './helpers.js';

// 같은 웨딩홀도 홀·날짜·시간대에 따라 견적이 달라지므로, 후보 하나에 여러 개 둘 수 있는
// "실제 예약 가능한 옵션" 하나. 그중 하나만 예약 확정(is_selected)할 수 있다.
export default function VenueOptionRow({ option, onUpdate, onDelete, onConfirm, onUnconfirm, confirming }) {
  const [label, setLabel] = useState(option.label || '');
  const [scheduledDate, setScheduledDate] = useState(option.scheduled_date || '');
  const [ceremonyTime, setCeremonyTime] = useState(option.ceremony_time?.slice(0, 5) || '');
  const [mealUntil, setMealUntil] = useState(option.meal_service_until?.slice(0, 5) || '');
  const [rentalFee, setRentalFee] = useState(option.rental_fee ?? '');
  const [mealPrice, setMealPrice] = useState(option.meal_price ?? '');
  const [headcount, setHeadcount] = useState(option.guaranteed_headcount ?? '');
  const [extraFee, setExtraFee] = useState(option.extra_person_fee ?? '');
  const [mandatoryFee, setMandatoryFee] = useState(option.mandatory_fee ?? '');
  const [quotedPrice, setQuotedPrice] = useState(option.quoted_price ?? '');

  useEffect(() => setLabel(option.label || ''), [option.label]);
  useEffect(() => setScheduledDate(option.scheduled_date || ''), [option.scheduled_date]);
  useEffect(() => setCeremonyTime(option.ceremony_time?.slice(0, 5) || ''), [option.ceremony_time]);
  useEffect(() => setMealUntil(option.meal_service_until?.slice(0, 5) || ''), [option.meal_service_until]);
  useEffect(() => setRentalFee(option.rental_fee ?? ''), [option.rental_fee]);
  useEffect(() => setMealPrice(option.meal_price ?? ''), [option.meal_price]);
  useEffect(() => setHeadcount(option.guaranteed_headcount ?? ''), [option.guaranteed_headcount]);
  useEffect(() => setExtraFee(option.extra_person_fee ?? ''), [option.extra_person_fee]);
  useEffect(() => setMandatoryFee(option.mandatory_fee ?? ''), [option.mandatory_fee]);
  useEffect(() => setQuotedPrice(option.quoted_price ?? ''), [option.quoted_price]);

  const commitNumber = (field, next, current) =>
    Number(next || 0) !== Number(current || 0) && onUpdate({ [field]: next === '' ? null : Number(next) });

  const summaryBits = [
    formatDateKr(option.scheduled_date),
    option.ceremony_time?.slice(0, 5),
  ].filter(Boolean).join(' · ');

  return (
    <details className="card" style={{ padding: 14, marginBottom: 8, background: 'var(--bg)' }}>
      <summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: '0.92rem' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {option.label || summaryBits || '옵션'}
          {option.is_selected && <span className="badge badge-success" style={{ marginLeft: 6, fontSize: '0.65rem' }}>예약 확정</span>}
        </span>
        <span style={{ fontWeight: 400, fontSize: '0.85rem', color: 'var(--accent-strong)', flexShrink: 0 }}>
          {won(option.total_price ?? option.quoted_price)}
        </span>
      </summary>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {option.is_selected ? (
            <button className="btn-ghost" onClick={onUnconfirm} disabled={confirming}>예약 확정 취소</button>
          ) : (
            <button className="btn-secondary" onClick={onConfirm} disabled={confirming}>이 옵션으로 예약 확정</button>
          )}
        </div>

        <div className="field">
          <label>구분(예: 토요일 1시, 그랜드홀)</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => label !== (option.label || '') && onUpdate({ label: label || null })} />
        </div>

        <div className="form-row">
          <div className="field">
            <label>예정일</label>
            <input
              type="date" value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              onBlur={() => scheduledDate !== (option.scheduled_date || '') && onUpdate({ scheduled_date: scheduledDate || null })}
            />
          </div>
          <div className="field">
            <label>예식 시작 시간</label>
            <input
              type="time" value={ceremonyTime}
              onChange={(e) => setCeremonyTime(e.target.value)}
              onBlur={() => ceremonyTime !== (option.ceremony_time?.slice(0, 5) || '') && onUpdate({ ceremony_time: ceremonyTime || null })}
            />
          </div>
          <div className="field">
            <label>식사 가능 시간(까지)</label>
            <input
              type="time" value={mealUntil}
              onChange={(e) => setMealUntil(e.target.value)}
              onBlur={() => mealUntil !== (option.meal_service_until?.slice(0, 5) || '') && onUpdate({ meal_service_until: mealUntil || null })}
            />
          </div>
        </div>

        <div className="field">
          <label>받은 견적(총액만 아는 경우)</label>
          <MoneyInput
            value={quotedPrice}
            onChange={setQuotedPrice}
            onBlurCommit={() => Number(quotedPrice || 0) !== Number(option.quoted_price || 0) && onUpdate({ quoted_price: quotedPrice === '' ? null : Number(quotedPrice) })}
          />
        </div>

        <h4 style={{ marginTop: 16, marginBottom: 8, fontSize: '0.88rem' }}>비교 정보 (총금액 계산용)</h4>
        <div className="form-row">
          <div className="field">
            <label>대관료</label>
            <MoneyInput value={rentalFee} onChange={setRentalFee} onBlurCommit={() => commitNumber('rental_fee', rentalFee, option.rental_fee)} />
          </div>
          <div className="field">
            <label>식대(1인 기준)</label>
            <MoneyInput value={mealPrice} onChange={setMealPrice} onBlurCommit={() => commitNumber('meal_price', mealPrice, option.meal_price)} />
          </div>
          <div className="field">
            <label>보증 인원</label>
            <input
              type="number" min="0" value={headcount}
              onChange={(e) => setHeadcount(e.target.value)}
              onBlur={() => commitNumber('guaranteed_headcount', headcount, option.guaranteed_headcount)}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>보증 인원 초과 시 1인당 추가비용</label>
            <MoneyInput value={extraFee} onChange={setExtraFee} onBlurCommit={() => commitNumber('extra_person_fee', extraFee, option.extra_person_fee)} />
          </div>
          <div className="field">
            <label>필수 포함 금액</label>
            <MoneyInput value={mandatoryFee} onChange={setMandatoryFee} onBlurCommit={() => commitNumber('mandatory_fee', mandatoryFee, option.mandatory_fee)} />
          </div>
        </div>
        {option.total_price != null && (
          <p style={{ fontSize: '0.85rem', margin: '0 0 8px' }}>
            총금액 = 대관료 + 식대 × 보증인원 + 필수 포함 금액 = <strong style={{ color: 'var(--accent-strong)' }}>{won(option.total_price)}</strong> (자동 계산됨)
          </p>
        )}

        <button className="btn-ghost" style={{ marginTop: 8 }} onClick={onDelete}>옵션 삭제</button>
      </div>
    </details>
  );
}
