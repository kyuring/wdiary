import { useEffect, useState } from 'react';

function NoteField({ label, value, onSave, placeholder }) {
  const [text, setText] = useState(value || '');

  useEffect(() => setText(value || ''), [value]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
      {label && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== (value || '') && onSave(text)}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: '0.85rem',
          padding: '6px 8px',
          border: '1px solid var(--border)',
          borderRadius: 6,
          background: 'transparent',
        }}
      />
    </div>
  );
}

export default function ChecklistItemRow({ item, onToggle, onAssigneeChange, onDueDateChange, onNoteSave, onDelete }) {
  return (
    <li style={{ padding: '10px 0', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="checkbox" checked={item.done} onChange={() => onToggle(item)} style={{ flexShrink: 0 }} />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            textDecoration: item.done ? 'line-through' : 'none',
            color: item.done ? 'var(--text-muted)' : 'inherit',
          }}
        >
          {item.title}
        </span>
        <button className="btn-ghost" style={{ flexShrink: 0 }} onClick={() => onDelete(item)}>삭제</button>
      </div>

      <div className="checklist-item-controls">
        <input
          type="date"
          value={item.due_date || ''}
          onChange={(e) => onDueDateChange(item, e.target.value || null)}
          title="목표일"
          style={{ fontSize: '0.82rem', padding: '4px 6px' }}
        />
        <select value={item.assignee || ''} onChange={(e) => onAssigneeChange(item, e.target.value || null)}>
          <option value="">미지정</option>
          <option value="groom">신랑</option>
          <option value="bride">신부</option>
          <option value="both">공동</option>
        </select>
      </div>

      {item.assignee === 'both' ? (
        <>
          <NoteField
            label="신랑:"
            value={item.note_groom}
            onSave={(v) => onNoteSave(item, 'note_groom', v)}
            placeholder="신랑 쪽 메모"
          />
          <NoteField
            label="신부:"
            value={item.note_bride}
            onSave={(v) => onNoteSave(item, 'note_bride', v)}
            placeholder="신부 쪽 메모"
          />
        </>
      ) : (
        <NoteField
          value={item.note}
          onSave={(v) => onNoteSave(item, 'note', v)}
          placeholder="상세 메모 (예: 장소·시간 등)"
        />
      )}
    </li>
  );
}
