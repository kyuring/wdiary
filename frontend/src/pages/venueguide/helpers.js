export function won(n) {
  if (n == null || n === '') return '-';
  return `${Number(n).toLocaleString()}원`;
}

// 'YYYY-MM-DD' -> '2026년 8월 15일' (Date로 변환하지 않고 문자열 그대로 다뤄서 타임존 밀림 방지)
export function formatDateKr(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}
