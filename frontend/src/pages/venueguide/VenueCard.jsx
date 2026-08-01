import { useEffect, useState } from 'react';
import { StarRatingInput } from '../../components/StarRating.jsx';
import VenueOptionRow from './VenueOptionRow.jsx';

function CheckField({ label, value, onSave, onRemove, removeTitle }) {
  const [text, setText] = useState(value || '');

  useEffect(() => setText(value || ''), [value]);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
      <div className="field" style={{ marginBottom: 10, flex: 1 }}>
        <label>{label}</label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => text !== (value || '') && onSave(label, text)}
        />
      </div>
      {onRemove && (
        <button className="btn-ghost" style={{ marginBottom: 10, fontSize: '0.75rem', padding: '0 6px' }} onClick={onRemove} title={removeTitle}>
          ✕
        </button>
      )}
    </div>
  );
}

function AddChecklistItem({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || adding) return;
    setAdding(true);
    try {
      await onAdd(text.trim());
      setText('');
      setOpen(false);
    } finally {
      setAdding(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => setOpen(true)}>
        + 항목 추가
      </button>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 6, marginTop: 4 }}>
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="확인할 항목 입력"
        style={{ flex: 1 }}
      />
      <button className="btn-secondary" type="submit" disabled={adding} style={{ fontSize: '0.8rem' }}>
        {adding ? '추가 중...' : '추가'}
      </button>
      <button type="button" className="btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => setOpen(false)}>취소</button>
    </form>
  );
}

export default function VenueCard({
  venue,
  checklist,
  hiddenChecklistItems,
  customChecklistItems,
  onUpdate,
  onDelete,
  onOpenRefQuote,
  onHideChecklistItem,
  onRestoreChecklistItem,
  onAddCustomChecklistItem,
  onDeleteCustomChecklistItem,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  onConfirmOption,
  onUnconfirmOption,
}) {
  const [name, setName] = useState(venue.name);
  const [notes, setNotes] = useState(venue.notes || '');
  const [station, setStation] = useState(venue.nearby_station || '');
  const [addingOption, setAddingOption] = useState(false);
  const [confirmingOptionId, setConfirmingOptionId] = useState(null);

  useEffect(() => setName(venue.name), [venue.name]);
  useEffect(() => setNotes(venue.notes || ''), [venue.notes]);
  useEffect(() => setStation(venue.nearby_station || ''), [venue.nearby_station]);

  const saveCheck = (key, val) => onUpdate(venue, { checks: { [key]: val } });

  const addOption = async () => {
    setAddingOption(true);
    try {
      await onAddOption(venue);
    } finally {
      setAddingOption(false);
    }
  };

  const confirmOption = async (option) => {
    setConfirmingOptionId(option.id);
    try {
      await onConfirmOption(venue, option);
    } finally {
      setConfirmingOptionId(null);
    }
  };

  const unconfirmOption = async (option) => {
    setConfirmingOptionId(option.id);
    try {
      await onUnconfirmOption(venue, option);
    } finally {
      setConfirmingOptionId(null);
    }
  };

  const options = venue.options || [];
  const cheapestTotal = options
    .map((o) => o.total_price ?? o.quoted_price)
    .filter((v) => v != null)
    .reduce((min, v) => (min == null || v < min ? v : min), null);

  return (
    <details className="card">
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
        {venue.name} {cheapestTotal != null && <span style={{ color: 'var(--accent-strong)' }}>· {Number(cheapestTotal).toLocaleString()}원~</span>}
        {venue.rating != null && <span style={{ marginLeft: 8, fontWeight: 400, fontSize: '0.9rem' }}>★ {venue.rating}</span>}
        {venue.is_booked && <span className="badge badge-success" style={{ marginLeft: 8 }}>✓ 예약 확정</span>}
      </summary>

      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn-ghost" onClick={onOpenRefQuote}>
          지인 참고 견적 보기/입력
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
          <label>근처 지하철역</label>
          <input value={station} onChange={(e) => setStation(e.target.value)} onBlur={() => station !== (venue.nearby_station || '') && onUpdate(venue, { nearby_station: station || null })} />
        </div>
      </div>

      <div className="field">
        <label>메모</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (venue.notes || '') && onUpdate(venue, { notes })} />
      </div>

      <h3 style={{ marginTop: 20, marginBottom: 8, fontSize: '0.95rem' }}>옵션(시간대·날짜별 견적)</h3>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
        같은 웨딩홀이라도 시간대·날짜별로 가격이 다르면 옵션을 여러 개 추가해서 비교하세요. 그중 하나를 예약 확정하면 예정일·예식 시간이 결혼식 날짜·시간으로 자동 반영돼요.
      </p>
      {options.map((option) => (
        <VenueOptionRow
          key={option.id}
          option={option}
          onUpdate={(fields) => onUpdateOption(venue, option, fields)}
          onDelete={() => onDeleteOption(venue, option)}
          onConfirm={() => confirmOption(option)}
          onUnconfirm={() => unconfirmOption(option)}
          confirming={confirmingOptionId === option.id}
        />
      ))}
      <button className="btn-secondary" onClick={addOption} disabled={addingOption}>
        {addingOption ? '추가 중...' : '+ 옵션 추가'}
      </button>

      <h3 style={{ marginTop: 20, marginBottom: 8, fontSize: '0.95rem' }}>체크리스트</h3>
      {Object.entries(checklist || {}).map(([category, items]) => {
        const customItems = customChecklistItems?.[category] || [];
        const visibleItems = items.filter((item) => !hiddenChecklistItems?.has(item));
        const hiddenItems = items.filter((item) => hiddenChecklistItems?.has(item));

        return (
          <details key={category} style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>{category}</summary>
            <div style={{ marginTop: 10 }}>
              {customItems.map((item) => (
                <CheckField
                  key={`custom-${item}`}
                  label={item}
                  value={venue.checks?.[item]}
                  onSave={saveCheck}
                  onRemove={() => onDeleteCustomChecklistItem(category, item)}
                  removeTitle="이 항목 삭제"
                />
              ))}
              {visibleItems.map((item) => (
                <CheckField
                  key={item}
                  label={item}
                  value={venue.checks?.[item]}
                  onSave={saveCheck}
                  onRemove={() => onHideChecklistItem(item)}
                  removeTitle="이 항목 숨기기(모든 후보에서 숨겨져요)"
                />
              ))}
              {hiddenItems.length > 0 && (
                <details style={{ marginBottom: 10 }}>
                  <summary style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    숨긴 항목 {hiddenItems.length}개
                  </summary>
                  {hiddenItems.map((item) => (
                    <div key={item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span style={{ textDecoration: 'line-through' }}>{item}</span>
                      <button className="btn-ghost" style={{ fontSize: '0.75rem' }} onClick={() => onRestoreChecklistItem(item)}>복원</button>
                    </div>
                  ))}
                </details>
              )}
              <AddChecklistItem onAdd={(text) => onAddCustomChecklistItem(category, text)} />
            </div>
          </details>
        );
      })}

      <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => onDelete(venue)}>
        후보 삭제
      </button>
    </details>
  );
}
