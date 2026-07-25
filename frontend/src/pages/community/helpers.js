export const CATEGORIES = ['웨딩홀후기', '상견례장소', '자유'];
export const CATEGORY_BADGE_CLASS = { 웨딩홀후기: 'badge-success', 상견례장소: 'badge-warn', 자유: 'badge-neutral' };
export const REPORT_REASONS = ['스팸광고', '욕설비방', '개인정보노출', '허위정보', '기타'];

export function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
