export function won(n) {
  return `${Number(n || 0).toLocaleString()}원`;
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.slice(0, 5).split(':').map(Number);
  const period = h < 12 ? '오전' : '오후';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour12}:${String(m).padStart(2, '0')}`;
}
