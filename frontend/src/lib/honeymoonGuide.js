// destinationGuide는 guide_content('honeymoon.destinations')에서 받아온 배열을 아래 함수에 인자로 넘겨서 사용한다.
// 이 파일에는 순수 로직만 남는다.

// "프랑스, 스페인" 처럼 콤마로 구분한 검색어를 국가별로 매칭
export function searchDestinations(destinationGuide, query) {
  const terms = query.split(/[,、]/).map((t) => t.trim()).filter(Boolean);
  if (terms.length === 0) return [];
  return terms
    .map((term) => destinationGuide.find((d) => d.name.includes(term) || term.includes(d.name)))
    .filter(Boolean);
}

export function isPeakMonth(destination, month) {
  return month != null && destination.peakMonths.includes(Number(month));
}

export function accommodationRate(destination, month) {
  return isPeakMonth(destination, month) ? destination.accommodationPeak : destination.accommodationOffPeak;
}

// 식비·현지교통·액티비티 등 기타경비(2인, 여행 일수만큼) — 비자·여행자보험·쇼핑 등은 미포함
export function miscTotal(destination, nights) {
  return destination.dailyMiscPerPerson * Number(nights) * 2;
}

// 나라 간 이동(리저널) 항공권 편도 참고 단가(1인) — 국제선 왕복표보다 훨씬 저렴한 구간 이동 비용
const INTERCITY_HOP_PER_PERSON = 250000;

// 2개국 이상이면 "한국→A→B→...→한국" 다구간 여정이라 각 나라 왕복표를 다 사지 않음.
// 첫 나라 입국편 + 나라 사이 이동편(들) + 마지막 나라→한국 귀국편을, 구간별로 나눠서 반환(1인 기준).
// 1개국이면 왕복 항공권 그대로 한 구간.
export function flightItinerary(destinations) {
  if (destinations.length === 0) return [];
  if (destinations.length === 1) {
    return [{ from: '한국', to: destinations[0].name, cost: destinations[0].flightPerPerson, label: '왕복' }];
  }

  const legs = [];
  legs.push({ from: '한국', to: destinations[0].name, cost: destinations[0].flightPerPerson / 2, label: '입국편' });
  for (let i = 0; i < destinations.length - 1; i++) {
    legs.push({ from: destinations[i].name, to: destinations[i + 1].name, cost: INTERCITY_HOP_PER_PERSON, label: '구간이동' });
  }
  const last = destinations[destinations.length - 1];
  legs.push({ from: last.name, to: '한국', cost: last.flightPerPerson / 2, label: '귀국편' });
  return legs;
}

export function multiCityFlightPerPerson(destinations) {
  return flightItinerary(destinations).reduce((sum, leg) => sum + leg.cost, 0);
}
