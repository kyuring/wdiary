import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { daysUntil } from './helpers.js';

const MAX_TODO_CATEGORIES = 5;

export default function TodoWidget() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/checklist').then((res) => setItems(res.items)).catch((err) => setError(err.message));
  }, []);

  const groups = useMemo(() => {
    if (!items) return [];
    const map = new Map();
    for (const item of items) {
      if (item.done) continue;
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category).push(item);
    }
    // 카테고리 내에서는 목표일이 가까운 순으로 정렬(목표일 없는 항목은 뒤로)
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
    }
    return [...map.entries()];
  }, [items]);

  const shown = groups.slice(0, MAX_TODO_CATEGORIES);
  const moreCount = groups.length - shown.length;
  const totalRemaining = groups.reduce((sum, [, list]) => sum + list.length, 0);

  const toggle = async (item) => {
    const updated = await api.patch(`/checklist/${item.id}`, { done: true });
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated.item : i)));
  };

  return (
    <div className="card">
      <h2>할 일</h2>
      {error && <div className="error-banner">{error}</div>}
      {items === null ? (
        <p style={{ color: 'var(--text-muted)' }}>불러오는 중...</p>
      ) : shown.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>남은 항목이 없어요. 체크리스트를 다 끝냈어요!</p>
      ) : (
        <>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            남은 항목 {totalRemaining}개 · {groups.length}개 카테고리
          </p>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)' }}>카테고리별로 보기</summary>
            <div className="todo-category-list" style={{ marginTop: 10 }}>
              {shown.map(([category, categoryItems]) => (
                <div key={category} className="todo-category">
                  <h3 style={{ fontSize: '0.9rem', margin: '0 0 8px' }}>
                    {category} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({categoryItems.length})</span>
                  </h3>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {categoryItems.map((item) => {
                      const d = daysUntil(item.due_date);
                      const overdue = d != null && d < 0;
                      return (
                        <li key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                          <input type="checkbox" checked={false} onChange={() => toggle(item)} />
                          <span style={{ fontSize: '0.88rem', flex: 1 }}>{item.title}</span>
                          {item.due_date && (
                            <span className={`badge ${overdue ? 'badge-warn' : 'badge-success'}`} style={{ fontSize: '0.7rem' }}>
                              {overdue ? `D+${Math.abs(d)}` : `D-${d}`}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
            {moreCount > 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 8 }}>+{moreCount}개 카테고리 더</p>
            )}
          </details>
        </>
      )}
      <p style={{ marginTop: 12 }}>
        <Link to="/checklist" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block' }}>
          체크리스트 전체 보기
        </Link>
      </p>
    </div>
  );
}
