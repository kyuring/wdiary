import ChecklistItemRow from './ChecklistItemRow.jsx';

export default function CategorySection({ category, items, onToggle, onAssigneeChange, onDueDateChange, onNoteSave, onDelete }) {
  const doneCount = items.filter((i) => i.done).length;

  return (
    <details className="card" open>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
        {category}{' '}
        <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem' }}>
          ({doneCount}/{items.length})
        </span>
      </summary>
      <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
        {items.map((item) => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            onToggle={onToggle}
            onAssigneeChange={onAssigneeChange}
            onDueDateChange={onDueDateChange}
            onNoteSave={onNoteSave}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </details>
  );
}
