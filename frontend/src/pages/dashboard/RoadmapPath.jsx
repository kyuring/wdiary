import { useState } from 'react';
import { useCouple } from '../../context/CoupleContext.jsx';
import { currentPhaseIndex } from '../../lib/roadmap.js';

const CARD_HEIGHT = 190;

// 준비 타임라인을 같은 크기 카드의 그리드로 보여줌(모든 카드 폭·높이 동일 — 항목 수가 달라도
// 내부 목록만 스크롤되게 해서 들쭉날쭉해 보이지 않게 함). 장식은 최소화하고 현재/지난 단계만
// 색으로 구분. 숨김 여부는 couple.hidden_roadmap_tasks, 커플이 직접 추가한 항목은
// couple.custom_roadmap_tasks(단계별 배열)에 저장 — 둘은 별개라 커스텀 항목은 숨기지 않고 바로 삭제됨.
function PhaseCard({ phase, isCurrent, isPast, hidden, customTasks, onHide, onRestore, onDeleteCustom }) {
  const visibleTasks = phase.tasks.filter((t) => !hidden.has(t));
  const hiddenTasks = phase.tasks.filter((t) => hidden.has(t));

  return (
    <div
      className="card"
      style={{
        margin: 0,
        height: CARD_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        borderColor: isCurrent ? 'var(--accent-strong)' : 'var(--border)',
        background: isCurrent ? 'var(--accent-bg)' : 'var(--bg-alt)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, marginBottom: 6, flexShrink: 0 }}>
        <strong style={{ fontSize: '0.88rem' }}>{isPast && '✓ '}{phase.min}~{phase.max}%</strong>
        {isCurrent && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>현재</span>}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {visibleTasks.length === 0 && hiddenTasks.length === 0 && customTasks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>항목 없음</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {customTasks.map((t) => (
              <li key={`custom-${t}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, padding: '2px 0', fontSize: '0.82rem' }}>
                <span>{t}</span>
                <button className="btn-ghost" style={{ fontSize: '0.68rem', padding: '0 4px', flexShrink: 0 }} onClick={() => onDeleteCustom(t)} title="이 항목 삭제">
                  ✕
                </button>
              </li>
            ))}
            {visibleTasks.map((t) => (
              <li key={t} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, padding: '2px 0', fontSize: '0.82rem' }}>
                <span>{t}</span>
                <button className="btn-ghost" style={{ fontSize: '0.68rem', padding: '0 4px', flexShrink: 0 }} onClick={() => onHide(t)} title="이 항목 숨기기">
                  ✕
                </button>
              </li>
            ))}
            {hiddenTasks.map((t) => (
              <li key={t} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, padding: '2px 0', fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                <span>{t}</span>
                <button className="btn-ghost" style={{ fontSize: '0.68rem', padding: '0 4px', textDecoration: 'none', flexShrink: 0 }} onClick={() => onRestore(t)}>
                  복원
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AddTaskCard({ phases, onAdd }) {
  const [phaseKey, setPhaseKey] = useState(String(phases[0].min));
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || adding) return;
    setAdding(true);
    try {
      await onAdd(phaseKey, text.trim());
      setText('');
    } finally {
      setAdding(false);
    }
  };

  return (
    <form onSubmit={submit} className="card" style={{ margin: 0, height: CARD_HEIGHT, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <strong style={{ fontSize: '0.88rem' }}>+ 항목 추가</strong>
      <select value={phaseKey} onChange={(e) => setPhaseKey(e.target.value)} style={{ fontSize: '0.8rem' }}>
        {phases.map((p) => (
          <option key={p.min} value={p.min}>{p.min}~{p.max}%</option>
        ))}
      </select>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="할 일 입력"
        style={{ flex: 1, resize: 'none', fontSize: '0.82rem', padding: 6, border: '1px solid var(--border)', borderRadius: 6, background: 'transparent' }}
      />
      <button className="btn-secondary" type="submit" disabled={adding} style={{ fontSize: '0.82rem', padding: '4px 8px' }}>
        {adding ? '추가 중...' : '추가'}
      </button>
    </form>
  );
}

export default function RoadmapPath({ phases, percent }) {
  const { couple, updateCouple } = useCouple();

  if (!phases || phases.length === 0) return null;

  const currentIndex = currentPhaseIndex(phases, percent);
  const hidden = new Set(couple.hidden_roadmap_tasks || []);
  const customByPhase = couple.custom_roadmap_tasks || {};

  const hideTask = (task) => updateCouple({ hidden_roadmap_tasks: [...hidden, task] });
  const restoreTask = (task) => updateCouple({ hidden_roadmap_tasks: [...hidden].filter((t) => t !== task) });

  const addCustomTask = (phaseKey, text) => {
    const current = customByPhase[phaseKey] || [];
    return updateCouple({ custom_roadmap_tasks: { ...customByPhase, [phaseKey]: [...current, text] } });
  };
  const deleteCustomTask = (phaseKey, text) => {
    const current = customByPhase[phaseKey] || [];
    return updateCouple({ custom_roadmap_tasks: { ...customByPhase, [phaseKey]: current.filter((t) => t !== text) } });
  };

  return (
    <div className="card">
      <h2 style={{ margin: 0 }}>준비 타임라인</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4, marginBottom: 14 }}>
        {percent != null
          ? `전체 준비기간의 ${Math.round(percent)}% 지점 기준 대략적인 가이드예요. 해당 없는 항목은 ✕로 지워도 돼요.`
          : '결혼식 날짜를 입력하면 지금 무엇을 준비해야 할지 알려드려요. (대략적인 가이드예요)'}
      </p>

      <div className="roadmap-grid">
        <AddTaskCard phases={phases} onAdd={addCustomTask} />
        {phases.map((phase, i) => (
          <PhaseCard
            key={phase.min}
            phase={phase}
            isCurrent={i === currentIndex}
            isPast={i < currentIndex}
            hidden={hidden}
            customTasks={customByPhase[String(phase.min)] || []}
            onHide={hideTask}
            onRestore={restoreTask}
            onDeleteCustom={(text) => deleteCustomTask(String(phase.min), text)}
          />
        ))}
      </div>
    </div>
  );
}
