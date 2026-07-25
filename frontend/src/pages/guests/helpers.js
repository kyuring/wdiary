export const SIDE_LABELS = { groom: '신랑측', bride: '신부측' };
export const RSVP_OPTIONS = ['참석', '불참', '미정'];

export function extractGuaranteeCount(checksValue) {
  if (!checksValue) return null;
  const match = checksValue.match(/\d+/);
  return match ? Number(match[0]) : null;
}
