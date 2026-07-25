export default function DdayLabel({ days }) {
  if (days == null) return <span className="dday-number">D-?</span>;
  if (days > 0) return <span className="dday-number">D-{days}</span>;
  if (days === 0) return <span className="dday-number">D-DAY</span>;
  return <span className="dday-number">D+{Math.abs(days)}</span>;
}
