export function won(n) {
  if (n == null || n === '') return '-';
  return `${Number(n).toLocaleString()}원`;
}
