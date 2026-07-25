// REGION_GROUPS, MIDPOINT_PAIRS, GENERAL_GUIDE, PRE_MEETING_CHECKLIST, DAY_OF_CHECKLIST, CUISINE_OPTIONS는
// guide_content('sangyeonrye.region_groups' 등)에서 받아온 값을 아래 함수에 인자로 넘겨서 사용한다.
// 이 파일에는 순수 로직만 남는다.

export function allRegions(regionGroups) {
  return regionGroups ? Object.values(regionGroups).flat() : [];
}

export function regionToGroup(regionGroups, region) {
  for (const [group, regions] of Object.entries(regionGroups || {})) {
    if (regions.includes(region)) return group;
  }
  return null;
}

export function recommendMidpoint(regionGroups, midpointPairs, groomRegion, brideRegion) {
  if (!groomRegion || !brideRegion || !regionGroups || !midpointPairs) return null;
  const groupA = regionToGroup(regionGroups, groomRegion);
  const groupB = regionToGroup(regionGroups, brideRegion);
  if (!groupA || !groupB) return null;
  if (groupA === groupB) return `같은 권역이에요 — ${groomRegion}·${brideRegion} 근처에서 정하면 이동 부담이 적어요.`;
  if (groupA === '제주권' || groupB === '제주권') {
    return '한쪽이 제주권이라 이동 부담이 커요. 제주 현지에서 하거나, 김포·광주공항 인근에서 절충하는 걸 추천해요.';
  }
  const key1 = `${groupA}|${groupB}`;
  const key2 = `${groupB}|${groupA}`;
  const midpoint = midpointPairs[key1] || midpointPairs[key2];
  return midpoint ? `추천 중간지점: ${midpoint}` : null;
}
