import { useEffect, useState } from 'react';
import Meter from '../../components/Meter.jsx';
import LineItemRow from './LineItemRow.jsx';
import LineItemCard from './LineItemCard.jsx';
import { won } from './helpers.js';

// 이 카테고리에서 가장 많이 쓰인 업체명(웨딩홀·스튜디오·드레스처럼 보통 한 업체가 항목 전체를 담당하는 경우,
// 새 항목을 추가할 때마다 매번 다시 입력하지 않도록 기본값으로 미리 채워줌)
function commonVendorOf(items) {
  const counts = new Map();
  for (const item of items) {
    if (!item.vendor_name) continue;
    counts.set(item.vendor_name, (counts.get(item.vendor_name) || 0) + 1);
  }
  let best = '';
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) { best = name; bestCount = count; }
  }
  return best;
}

export default function CategorySection({ category, summary, items, recommended, onAdd, onUpdate, onDelete }) {
  const [newItem, setNewItem] = useState({ item_name: '', vendor_name: '' });
  const [adding, setAdding] = useState(false);
  const [bulkVendor, setBulkVendor] = useState('');
  const [applyingBulk, setApplyingBulk] = useState(false);

  const spent = summary?.spent || 0;
  const overage = Math.max(0, spent - recommended);
  const commonVendor = commonVendorOf(items);

  useEffect(() => {
    setBulkVendor(commonVendor);
    setNewItem((prev) => (prev.vendor_name ? prev : { ...prev, vendor_name: commonVendor }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commonVendor]);

  const submit = async (e) => {
    e.preventDefault();
    if (!newItem.item_name.trim() || adding) return;
    setAdding(true);
    try {
      await onAdd(category, {
        item_name: newItem.item_name.trim(),
        vendor_name: newItem.vendor_name || null,
      });
      setNewItem({ item_name: '', vendor_name: commonVendor });
    } finally {
      setAdding(false);
    }
  };

  const applyBulkVendor = async () => {
    if (!bulkVendor.trim() || applyingBulk) return;
    setApplyingBulk(true);
    try {
      await Promise.all(
        items.filter((item) => item.vendor_name !== bulkVendor).map((item) => onUpdate(item, { vendor_name: bulkVendor }))
      );
    } finally {
      setApplyingBulk(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>{category}</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {won(spent)}{recommended > 0 && ` / 권장 ${won(recommended)}`}
          {overage > 0 && <span className="badge badge-warn" style={{ marginLeft: 8 }}>초과 {won(overage)}</span>}
        </span>
      </div>
      <div style={{ marginTop: 8, marginBottom: 12 }}>
        <Meter value={spent} max={recommended || 1} />
      </div>

      {items.length > 0 && (
        <div className="form-row" style={{ marginBottom: 12, alignItems: 'flex-end' }}>
          <div className="field">
            <label>이 카테고리 업체명</label>
            <input list="budget-vendor-names" value={bulkVendor} onChange={(e) => setBulkVendor(e.target.value)} placeholder="예: 한곳에서 다 하는 업체명" />
          </div>
          <div className="field" style={{ flex: '0 0 auto' }}>
            <label>&nbsp;</label>
            <button className="btn-ghost" type="button" onClick={applyBulkVendor} disabled={applyingBulk}>
              {applyingBulk ? '적용 중...' : '전체 항목에 적용'}
            </button>
          </div>
        </div>
      )}

      {/* 데스크톱: 한눈에 훑어보기 좋은 표 / 모바일: 표가 옆으로 잘려서 카드로. 768px 기준은 사이드바
          전환 기준과 동일 — 실제로 두 개 다 렌더링되고 CSS로 하나만 보이게 함(리사이즈 이벤트 불필요) */}
      {items.length > 0 && (
        <div className="line-items-table-wrap" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                <th style={{ padding: 6 }}>세부항목</th>
                <th style={{ padding: 6 }}>업체명</th>
                <th style={{ padding: 6 }}>총금액</th>
                <th style={{ padding: 6 }}>최종결제금액</th>
                <th style={{ padding: 6 }}>결제자</th>
                <th style={{ padding: 6 }}>결제수단</th>
                <th style={{ padding: 6 }}>상태</th>
                <th style={{ padding: 6 }}></th>
                <th style={{ padding: 6 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <LineItemRow key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="line-items-cards">
        {items.map((item) => (
          <LineItemCard key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>

      <form onSubmit={submit} className="form-row" style={{ marginTop: 12 }}>
        <div className="field">
          <label>세부항목</label>
          <input value={newItem.item_name} onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })} />
        </div>
        <div className="field">
          <label>업체명</label>
          <input list="budget-vendor-names" value={newItem.vendor_name} onChange={(e) => setNewItem({ ...newItem, vendor_name: e.target.value })} />
        </div>
        <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
          <label>&nbsp;</label>
          <button className="btn-secondary" type="submit" disabled={adding}>
            {adding ? '추가 중...' : '+ 항목 추가'}
          </button>
        </div>
      </form>
    </div>
  );
}
