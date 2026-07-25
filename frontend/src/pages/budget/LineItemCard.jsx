import { useEffect, useState } from 'react';
import MoneyInput from '../../components/MoneyInput.jsx';
import { won, STATUS_LABELS } from './helpers.js';

// 예산 세부항목을 넓은 표 대신 접이식 카드로 보여줌(업체 컨택 관리·웨딩홀 가이드와 같은 패턴).
// 접었을 때는 세부항목명·최종결제금액·상태만 보이고, 펼쳐야 예산·업체명·결제자/수단·계약금/잔금/할인
// 등 나머지 입력 항목이 나옴 — 모바일에서 표가 옆으로 잘리던 문제를 없애면서 데스크톱에서도 동일하게 보임.
export default function LineItemCard({ item, onUpdate, onDelete }) {
  const [itemName, setItemName] = useState(item.item_name);
  const [vendorName, setVendorName] = useState(item.vendor_name || '');
  const [totalAmount, setTotalAmount] = useState(item.total_amount ?? '');
  const [unitPrice, setUnitPrice] = useState(item.unit_price ?? '');
  const [quantity, setQuantity] = useState(item.quantity ?? '');
  const [depositDate, setDepositDate] = useState(item.deposit_date || '');
  const [depositAmount, setDepositAmount] = useState(item.deposit_amount ?? '');
  const [balanceDate, setBalanceDate] = useState(item.balance_date || '');
  const [balanceAmount, setBalanceAmount] = useState(item.balance_amount ?? '');
  const [discountDate, setDiscountDate] = useState(item.discount_date || '');
  const [discountAmount, setDiscountAmount] = useState(item.discount_amount ?? '');
  const [memo, setMemo] = useState(item.memo || '');

  useEffect(() => setItemName(item.item_name), [item.item_name]);
  useEffect(() => setVendorName(item.vendor_name || ''), [item.vendor_name]);
  useEffect(() => setTotalAmount(item.total_amount ?? ''), [item.total_amount]);
  useEffect(() => setUnitPrice(item.unit_price ?? ''), [item.unit_price]);
  useEffect(() => setQuantity(item.quantity ?? ''), [item.quantity]);
  useEffect(() => setDepositDate(item.deposit_date || ''), [item.deposit_date]);
  useEffect(() => setDepositAmount(item.deposit_amount ?? ''), [item.deposit_amount]);
  useEffect(() => setBalanceDate(item.balance_date || ''), [item.balance_date]);
  useEffect(() => setBalanceAmount(item.balance_amount ?? ''), [item.balance_amount]);
  useEffect(() => setDiscountDate(item.discount_date || ''), [item.discount_date]);
  useEffect(() => setDiscountAmount(item.discount_amount ?? ''), [item.discount_amount]);
  useEffect(() => setMemo(item.memo || ''), [item.memo]);

  return (
    <details className="card" style={{ padding: 14, marginBottom: 8 }}>
      <summary style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontWeight: 600 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.item_name}
          {item.vendor_name && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · {item.vendor_name}</span>}
          {item.excluded_from_budget && <span className="badge badge-neutral" style={{ marginLeft: 6, fontSize: '0.65rem' }}>예산 제외</span>}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, fontSize: '0.85rem' }}>
          <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>{STATUS_LABELS[item.status]}</span>
          {won(item.final_amount)}
        </span>
      </summary>

      <div style={{ marginTop: 14 }}>
        <div className="form-row">
          <div className="field">
            <label>세부항목</label>
            <input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              onBlur={() => itemName !== item.item_name && onUpdate(item, { item_name: itemName })}
            />
          </div>
          <div className="field">
            <label>업체명</label>
            <input
              list="budget-vendor-names"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              onBlur={() => vendorName !== (item.vendor_name || '') && onUpdate(item, { vendor_name: vendorName })}
            />
          </div>
        </div>

        <div className="field">
          <label>총금액</label>
          <MoneyInput value={totalAmount} onChange={setTotalAmount} onBlurCommit={() => Number(totalAmount || 0) !== Number(item.total_amount || 0) && onUpdate(item, { total_amount: Number(totalAmount || 0) })} />
        </div>

        {/* 단가×수량은 대부분 항목에 안 맞는 개념(식대처럼 1인당 금액×인원수인 경우만 해당)이라
            식대이거나 이미 값이 들어있는 항목에만 보이게 함 */}
        {(item.item_name === '식대' || item.unit_price != null || item.quantity != null) && (
          <>
            <div className="form-row">
              <div className="field" style={{ minWidth: 130 }}>
                <label>단가(예: 1인당 식대)</label>
                <MoneyInput
                  value={unitPrice}
                  onChange={setUnitPrice}
                  onBlurCommit={() => Number(unitPrice || 0) !== Number(item.unit_price || 0) && onUpdate(item, { unit_price: unitPrice === '' ? null : Number(unitPrice) })}
                />
              </div>
              <div className="field" style={{ minWidth: 100 }}>
                <label>수량(예: 인원수)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onBlur={() => Number(quantity || 0) !== Number(item.quantity || 0) && onUpdate(item, { quantity: quantity === '' ? null : Number(quantity) })}
                />
              </div>
            </div>
            {item.unit_price != null && item.quantity != null && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>
                총금액 = 단가 × 수량 = {won(item.unit_price)} × {item.quantity} = {won(item.total_amount)} (자동 계산됨)
              </p>
            )}
          </>
        )}

        <div className="form-row">
          <div className="field" style={{ minWidth: 'auto' }}>
            <label>결제자</label>
            <select value={item.payer || ''} onChange={(e) => onUpdate(item, { payer: e.target.value || null })}>
              <option value="">-</option>
              <option value="groom">신랑</option>
              <option value="bride">신부</option>
            </select>
          </div>
          <div className="field" style={{ minWidth: 'auto' }}>
            <label>결제수단</label>
            <select value={item.payment_method || ''} onChange={(e) => onUpdate(item, { payment_method: e.target.value || null })}>
              <option value="">-</option>
              <option value="card">카드</option>
              <option value="cash">현금</option>
              <option value="transfer">계좌이체</option>
            </select>
          </div>
          <div className="field" style={{ minWidth: 'auto' }}>
            <label>상태</label>
            <select value={item.status} onChange={(e) => onUpdate(item, { status: e.target.value })}>
              <option value="planned">예정</option>
              <option value="in_progress">진행중</option>
              <option value="done">완료</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="field" style={{ minWidth: 150 }}>
            <label>계약금 일자</label>
            <input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} onBlur={() => depositDate !== (item.deposit_date || '') && onUpdate(item, { deposit_date: depositDate || null })} />
          </div>
          <div className="field" style={{ minWidth: 120 }}>
            <label>계약금 금액</label>
            <MoneyInput value={depositAmount} onChange={setDepositAmount} onBlurCommit={() => Number(depositAmount || 0) !== Number(item.deposit_amount || 0) && onUpdate(item, { deposit_amount: Number(depositAmount || 0) })} />
          </div>
          <div className="field" style={{ minWidth: 150 }}>
            <label>잔금 일자</label>
            <input type="date" value={balanceDate} onChange={(e) => setBalanceDate(e.target.value)} onBlur={() => balanceDate !== (item.balance_date || '') && onUpdate(item, { balance_date: balanceDate || null })} />
          </div>
          <div className="field" style={{ minWidth: 120 }}>
            <label>잔금 금액</label>
            <MoneyInput value={balanceAmount} onChange={setBalanceAmount} onBlurCommit={() => Number(balanceAmount || 0) !== Number(item.balance_amount || 0) && onUpdate(item, { balance_amount: Number(balanceAmount || 0) })} />
          </div>
          <div className="field" style={{ minWidth: 150 }}>
            <label>페이백/할인 일자</label>
            <input type="date" value={discountDate} onChange={(e) => setDiscountDate(e.target.value)} onBlur={() => discountDate !== (item.discount_date || '') && onUpdate(item, { discount_date: discountDate || null })} />
          </div>
          <div className="field" style={{ minWidth: 120 }}>
            <label>페이백/할인 금액</label>
            <MoneyInput value={discountAmount} onChange={setDiscountAmount} onBlurCommit={() => Number(discountAmount || 0) !== Number(item.discount_amount || 0) && onUpdate(item, { discount_amount: Number(discountAmount || 0) })} />
          </div>
          <div className="field" style={{ minWidth: 'auto' }}>
            <label>현금영수증</label>
            <select value={item.receipt_issued == null ? '' : String(item.receipt_issued)} onChange={(e) => onUpdate(item, { receipt_issued: e.target.value === '' ? null : e.target.value === 'true' })}>
              <option value="">해당 없음</option>
              <option value="false">미발행</option>
              <option value="true">발행</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>메모</label>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} onBlur={() => memo !== (item.memo || '') && onUpdate(item, { memo })} />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', marginTop: 8 }}>
          <input type="checkbox" checked={item.excluded_from_budget} onChange={(e) => onUpdate(item, { excluded_from_budget: e.target.checked })} />
          예산 제외(축의금·식권 등으로 충당돼 실제 지출이 아님 — 금액은 표시되지만 카테고리·전체 예산 집계에서 빠짐)
        </label>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '6px 0 0' }}>
          최종결제금액 = 계약금 + 잔금 - 페이백/할인 = {won(item.final_amount)}
        </p>

        <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => onDelete(item)}>
          항목 삭제
        </button>
      </div>
    </details>
  );
}
