// PHASES, JOURNEY_MILESTONES, VENUE_LEAD_TIME_MONTHS는 더 이상 여기 하드코딩하지 않고
// guide_content('roadmap.phases' / 'roadmap.journey_milestones' / 'roadmap.venue_lead_time')에서 받아온 값을
// 아래 함수들에 인자로 넘겨서 사용한다. 이 파일에는 순수 계산 로직만 남는다.

export const DAY_TYPE_LABELS = { saturday: '토요일', sunday: '일요일', weekday: '평일' };
export const SEASON_LABELS = { peak: '성수기 (봄 3~5월·가을 9~11월)', off_peak: '비수기' };

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// 'YYYY-MM-DD' 문자열을 로컬 타임존 자정 기준으로 파싱 (new Date(str)의 UTC 파싱으로 인한 하루 밀림 방지)
export function parseDateOnly(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(from, to) {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export function calcDday(weddingDateStr) {
  if (!weddingDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const wedding = parseDateOnly(weddingDateStr);
  return daysBetween(today, wedding); // 양수: D-n, 0: D-day, 음수: D+n
}

// 총 준비기간 대비 오늘이 몇 % 지점인지 계산 (roadmap_start_date ~ wedding_date 기준, 0~100 사이로 clamp)
export function calcElapsedPercent(roadmapStartDateStr, weddingDateStr) {
  if (!roadmapStartDateStr || !weddingDateStr) return null;
  const start = parseDateOnly(roadmapStartDateStr);
  const wedding = parseDateOnly(weddingDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalDays = daysBetween(start, wedding);
  if (totalDays <= 0) return 100;

  const elapsedDays = daysBetween(start, today);
  const pct = (elapsedDays / totalDays) * 100;
  return Math.min(100, Math.max(0, pct));
}

export function currentPhase(phases, percent) {
  if (percent == null || !phases) return null;
  return phases.find((p) => percent >= p.min && percent < p.max) || phases[phases.length - 1];
}

export function currentPhaseIndex(phases, percent) {
  if (percent == null || !phases) return 0;
  const idx = phases.findIndex((p) => percent >= p.min && percent < p.max);
  return idx === -1 ? phases.length - 1 : idx;
}

// 남은 준비기간(개월, 소수)이 권장 최소 리드타임보다 짧으면 true
export function needsVenueUrgencyBadge(venueLeadTimeMonths, { weddingDateStr, venueBookedDate, venueSeason, venueDayType }) {
  if (venueBookedDate) return false; // 예약 완료 시 배지 해제(3.2 참고)
  if (!weddingDateStr || !venueSeason || !venueDayType || !venueLeadTimeMonths) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const wedding = parseDateOnly(weddingDateStr);
  const remainingDays = daysBetween(today, wedding);
  const remainingMonths = remainingDays / 30.44;

  const minLeadMonths = venueLeadTimeMonths[venueDayType]?.[venueSeason];
  if (minLeadMonths == null) return false;

  return remainingMonths < minLeadMonths;
}
