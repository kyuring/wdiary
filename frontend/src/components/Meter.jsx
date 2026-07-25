// "단일 비율 vs 한도" 표시용 Meter. 트랙은 채움색과 같은 계열의 옅은 톤(전용 파이 차트 대신 권장되는 형태).
function severityOf(ratio) {
  if (ratio > 1) return 'danger';
  if (ratio >= 0.9) return 'warn';
  return 'accent';
}

const FILL_VAR = { accent: 'var(--accent)', warn: 'var(--warn)', danger: 'var(--danger)' };
const TRACK_VAR = { accent: 'var(--accent-bg)', warn: 'var(--warn-bg)', danger: 'var(--danger-bg)' };

export default function Meter({ value, max, height = 10 }) {
  const ratio = max > 0 ? value / max : 0;
  const severity = severityOf(ratio);
  const percent = Math.min(100, Math.max(0, ratio * 100));

  return (
    <div
      style={{ height, borderRadius: 999, background: TRACK_VAR[severity], overflow: 'hidden' }}
      role="meter"
      aria-valuenow={Math.round(value)}
      aria-valuemax={Math.round(max)}
    >
      <div
        style={{
          height: '100%',
          width: `${percent}%`,
          background: FILL_VAR[severity],
          borderRadius: 999,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
}
