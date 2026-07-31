import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import CategorySection from './checklist/CategorySection.jsx';
import { groupByCategory } from './checklist/helpers.js';

export default function Checklist() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all | groom | bride | both
  const [newItem, setNewItem] = useState({ category: '', title: '' });
  const [addingItem, setAddingItem] = useState(false);

  useEffect(() => {
    api.get('/checklist').then((res) => setItems(res.items)).catch((err) => setError(err.message));
  }, []);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (filter === 'all') return items;
    return items.filter((i) => i.assignee === filter);
  }, [items, filter]);

  const grouped = useMemo(() => groupByCategory(filteredItems), [filteredItems]);
  const overallPercent = items?.length ? Math.round((items.filter((i) => i.done).length / items.length) * 100) : 0;

  const toggle = async (item) => {
    const updated = await api.patch(`/checklist/${item.id}`, { done: !item.done });
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated.item : i)));
  };

  const changeAssignee = async (item, assignee) => {
    const updated = await api.patch(`/checklist/${item.id}`, { assignee });
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated.item : i)));
  };

  const changeDueDate = async (item, due_date) => {
    const updated = await api.patch(`/checklist/${item.id}`, { due_date });
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated.item : i)));
  };

  const saveNote = async (item, field, value) => {
    const updated = await api.patch(`/checklist/${item.id}`, { [field]: value || null });
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated.item : i)));
  };

  const remove = async (item) => {
    try {
      await api.delete(`/checklist/${item.id}`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setError(err.message);
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    setError('');
    if (!newItem.category || !newItem.title || addingItem) return;
    setAddingItem(true);
    try {
      const result = await api.post('/checklist', newItem);
      setItems((prev) => [...prev, result.item]);
      setNewItem({ category: newItem.category, title: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingItem(false);
    }
  };

  if (!items) return <div className="full-page-center">불러오는 중...</div>;

  return (
    <div>
      <h1>체크리스트</h1>

      <div className="card">
        <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>전체 진행률 {overallPercent}%</p>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${overallPercent}%` }} />
        </div>
        <div className="form-row" style={{ marginTop: 16 }}>
          <div className="field" style={{ minWidth: 'auto' }}>
            <label>담당자 필터</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">전체</option>
              <option value="groom">신랑</option>
              <option value="bride">신부</option>
              <option value="both">공동</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h2>항목 추가하기</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
          기본 제공 항목 외에 두 분이서 더 챙기고 싶은 항목을 자유롭게 추가하세요.
        </p>
        <form onSubmit={addItem} className="form-row">
          <div className="field">
            <label>카테고리</label>
            <input
              list="categories"
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              placeholder="예: 웨딩홀"
            />
            <datalist id="categories">
              {[...new Set(items.map((i) => i.category))].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label>항목명</label>
            <input value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} />
          </div>
          <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button className="btn-primary" type="submit" disabled={addingItem}>
              {addingItem ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>

      {grouped.map(([category, categoryItems]) => (
        <CategorySection
          key={category}
          category={category}
          items={categoryItems}
          onToggle={toggle}
          onAssigneeChange={changeAssignee}
          onDueDateChange={changeDueDate}
          onNoteSave={saveNote}
          onDelete={remove}
        />
      ))}
    </div>
  );
}
