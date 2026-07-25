import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';

function TimelineRow({ item, onUpdate, onDelete }) {
  const [time, setTime] = useState(item.time || '');
  const [duration, setDuration] = useState(item.duration_minutes ?? '');
  const [assignee, setAssignee] = useState(item.assignee || '');
  const [task, setTask] = useState(item.task);
  const [script, setScript] = useState(item.script || '');

  useEffect(() => setTime(item.time || ''), [item.time]);
  useEffect(() => setDuration(item.duration_minutes ?? ''), [item.duration_minutes]);
  useEffect(() => setAssignee(item.assignee || ''), [item.assignee]);
  useEffect(() => setTask(item.task), [item.task]);
  useEffect(() => setScript(item.script || ''), [item.script]);

  return (
    <li style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <input type="checkbox" checked={item.done} onChange={() => onUpdate(item, { done: !item.done })} title="완료" />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          onBlur={() => time !== (item.time || '') && onUpdate(item, { time: time || null })}
          style={{ width: 130 }}
        />
        <input
          type="number"
          min="0"
          step="0.5"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          onBlur={() => Number(duration || 0) !== Number(item.duration_minutes || 0) && onUpdate(item, { duration_minutes: duration === '' ? null : Number(duration) })}
          style={{ width: 60 }}
          title="소요시간(분)"
          placeholder="분"
        />
        <input
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          onBlur={() => assignee !== (item.assignee || '') && onUpdate(item, { assignee })}
          style={{ width: 80 }}
          placeholder="담당"
        />
        <input
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onBlur={() => task !== item.task && onUpdate(item, { task })}
          style={{ flex: 1, minWidth: 140, textDecoration: item.done ? 'line-through' : 'none' }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={item.is_mc_script} onChange={() => onUpdate(item, { is_mc_script: !item.is_mc_script })} />
          사회자용
        </label>
        <button className="btn-ghost" onClick={() => onDelete(item)}>삭제</button>
      </div>
      <input
        value={script}
        onChange={(e) => setScript(e.target.value)}
        onBlur={() => script !== (item.script || '') && onUpdate(item, { script })}
        placeholder="사회자 멘트/대본 (선택)"
        style={{ width: '100%', marginTop: 6, fontSize: '0.85rem' }}
      />
    </li>
  );
}

export function useTimeline() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/wedding-day/timeline').then((res) => setItems(res.timeline)).catch((err) => setError(err.message));
  }, []);

  const update = async (item, fields) => {
    const result = await api.patch(`/wedding-day/timeline/${item.id}`, fields);
    setItems((prev) => prev.map((i) => (i.id === item.id ? result.item : i)).sort((a, b) => (a.time || '').localeCompare(b.time || '')));
  };
  const remove = async (item) => {
    await api.delete(`/wedding-day/timeline/${item.id}`);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };
  const add = async (newItem) => {
    const result = await api.post('/wedding-day/timeline', {
      ...newItem,
      duration_minutes: newItem.duration_minutes === '' ? null : Number(newItem.duration_minutes),
    });
    setItems((prev) => [...prev, result.item]);
  };

  return { items, error, update, remove, add };
}

export default function TimelineSection({ items, error, update, remove, add }) {
  const [newItem, setNewItem] = useState({ time: '', duration_minutes: '', assignee: '', task: '' });

  const submit = async (e) => {
    e.preventDefault();
    if (!newItem.task) return;
    await add(newItem);
    setNewItem({ time: '', duration_minutes: '', assignee: '', task: '' });
  };

  if (!items) return null;

  return (
    <div className="card">
      <h2>전체일정</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
        준비 단계부터 피로연까지 당일 전체 흐름이에요. "사회자용" 체크가 된 항목만 사회자에게 전달할 큐시트에 나와요.
      </p>
      {error && <div className="error-banner">{error}</div>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((item) => (
          <TimelineRow key={item.id} item={item} onUpdate={update} onDelete={remove} />
        ))}
      </ul>
      <form onSubmit={submit} className="form-row" style={{ marginTop: 16 }}>
        <div className="field" style={{ minWidth: 120 }}>
          <label>시간</label>
          <input type="time" value={newItem.time} onChange={(e) => setNewItem({ ...newItem, time: e.target.value })} />
        </div>
        <div className="field" style={{ minWidth: 70 }}>
          <label>소요(분)</label>
          <input type="number" min="0" value={newItem.duration_minutes} onChange={(e) => setNewItem({ ...newItem, duration_minutes: e.target.value })} />
        </div>
        <div className="field" style={{ minWidth: 90 }}>
          <label>담당</label>
          <input value={newItem.assignee} onChange={(e) => setNewItem({ ...newItem, assignee: e.target.value })} />
        </div>
        <div className="field">
          <label>할 일</label>
          <input value={newItem.task} onChange={(e) => setNewItem({ ...newItem, task: e.target.value })} />
        </div>
        <div className="field" style={{ flex: '0 0 auto', justifyContent: 'flex-end' }}>
          <label>&nbsp;</label>
          <button className="btn-secondary" type="submit">항목 추가</button>
        </div>
      </form>
    </div>
  );
}
