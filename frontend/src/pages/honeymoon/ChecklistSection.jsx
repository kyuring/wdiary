import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

export default function ChecklistSection() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/checklist').then((res) => setItems(res.items.filter((i) => i.category === '신혼여행'))).catch((err) => setError(err.message));
  }, []);

  const toggle = async (item) => {
    const updated = await api.patch(`/checklist/${item.id}`, { done: !item.done });
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated.item : i)));
  };

  if (!items) return null;

  return (
    <div className="card">
      <h2>신혼여행 체크리스트</h2>
      {error && <div className="error-banner">{error}</div>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item) => (
          <li key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
            <input type="checkbox" checked={item.done} onChange={() => toggle(item)} />
            <span style={{ textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--text-muted)' : 'inherit' }}>
              {item.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
