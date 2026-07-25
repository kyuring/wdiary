function toDigits(str) {
  return str.replace(/[^\d]/g, '');
}

function formatDigits(digits) {
  if (!digits) return '';
  return Number(digits).toLocaleString();
}

// 금액 입력칸 — 타이핑하는 동안 천단위 콤마를 붙여 보여주고, 부모에는 숫자(원 단위)로 올려줌
export default function MoneyInput({ value, onChange, onBlurCommit, placeholder }) {
  const display = value === '' || value == null ? '' : formatDigits(String(value));

  const handleChange = (e) => {
    const digits = toDigits(e.target.value);
    onChange(digits === '' ? '' : Number(digits));
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onBlur={onBlurCommit}
        placeholder={placeholder}
        style={{ width: '100%', paddingRight: 32 }}
      />
      <span
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
          fontSize: '0.8rem',
          pointerEvents: 'none',
        }}
      >
        원
      </span>
    </div>
  );
}
