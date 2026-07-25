export const PAYER_LABELS = { groom: '신랑', bride: '신부' };
export const METHOD_LABELS = { card: '카드', cash: '현금', transfer: '계좌이체' };
export const PRESET_LABELS = { economic: '실속형', average: '평균형', premium: '프리미엄형' };
export const STATUS_LABELS = { planned: '예정', in_progress: '진행중', done: '완료' };

export function won(n) {
  return `${Number(n || 0).toLocaleString()}원`;
}

export function recommendedFor(category, targetNum, ratios, categoryTargets) {
  if (categoryTargets?.[category] != null) return Number(categoryTargets[category]);
  return Math.round(targetNum * (ratios?.[category] || 0));
}
