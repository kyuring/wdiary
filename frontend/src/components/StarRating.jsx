export function StarRatingInput({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2 }} role="radiogroup" aria-label="평점">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(value === n ? '' : n)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.5rem',
            lineHeight: 1,
            padding: '2px 1px',
            color: n <= (value || 0) ? 'var(--accent-strong)' : 'var(--border)',
          }}
          title={`${n}점`}
        >
          {n <= (value || 0) ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
}

export function StarRatingDisplay({ rating }) {
  if (!rating) return null;
  return (
    <span style={{ color: 'var(--accent-strong)', letterSpacing: 1 }}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}
