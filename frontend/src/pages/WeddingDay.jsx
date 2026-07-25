import { useState } from 'react';
import TimelineSection, { useTimeline } from './weddingday/TimelineSection.jsx';
import MCScriptSection from './weddingday/MCScriptSection.jsx';
import VowsSection from './weddingday/VowsSection.jsx';
import GiftSection from './weddingday/GiftSection.jsx';

const TABS = [
  { key: 'schedule', label: '전체일정' },
  { key: 'mc', label: '사회자 전달용' },
  { key: 'vows', label: '혼인서약서' },
  { key: 'gifts', label: '축의금' },
];

export default function WeddingDay() {
  const [tab, setTab] = useState('schedule');
  const timeline = useTimeline();

  return (
    <div>
      <h1>예식 당일</h1>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'schedule' && <TimelineSection {...timeline} />}
      {tab === 'mc' && <MCScriptSection items={timeline.items} error={timeline.error} />}
      {tab === 'vows' && <VowsSection />}
      {tab === 'gifts' && <GiftSection />}
    </div>
  );
}
