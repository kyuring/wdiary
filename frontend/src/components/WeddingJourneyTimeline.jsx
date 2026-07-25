import { useGuideContent } from '../context/GuideContentContext.jsx';

export default function WeddingJourneyTimeline({ percent, dday }) {
  const milestones = useGuideContent('roadmap.journey_milestones');
  if (percent == null || !milestones) return null;
  const arrived = dday != null && dday <= 0;

  return (
    <div className="card journey-timeline" aria-label={`결혼 준비 진행률 ${Math.round(percent)}%`}>
      <div className="journey-track">
        <div className="journey-track-fill" style={{ width: `${percent}%` }} />
        {milestones.map((m) => {
          const isFinal = m.pct === 100;
          const passed = percent >= m.pct;
          return (
            <div
              key={m.pct}
              className={`journey-marker${isFinal ? ' final' : ''}${passed ? ' passed' : ''}${isFinal && arrived ? ' arrived' : ''}`}
              style={{ left: `${m.pct}%` }}
              title={m.label}
            >
              <span className="journey-icon">{m.icon}</span>
            </div>
          );
        })}
        <div className="journey-current" style={{ left: `${percent}%` }} title="현재 위치">
          👰🤵
        </div>
      </div>
    </div>
  );
}
