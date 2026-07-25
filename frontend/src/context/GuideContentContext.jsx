import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const GuideContentContext = createContext(null);

// 웨딩홀/스드메 체크리스트, 스타일 추천, 상견례 가이드, 신혼여행 목적지, 로드맵 단계, 예산 프리셋 등
// 원래 코드에 하드코딩돼있던 "가이드성 콘텐츠"를 guide_content 테이블에서 한 번에 받아와 앱 전체에 제공.
// 관리자 페이지에서 이 값을 고치면 코드 재배포 없이 바로 반영된다.
export function GuideContentProvider({ children }) {
  const { user } = useAuth();
  const [map, setMap] = useState(null);

  useEffect(() => {
    if (!user) {
      setMap(null);
      return;
    }
    api.get('/guide-content').then((res) => {
      const m = {};
      for (const item of res.items) m[item.section_key] = item.content;
      setMap(m);
    }).catch(() => setMap({}));
  }, [user]);

  return <GuideContentContext.Provider value={map}>{children}</GuideContentContext.Provider>;
}

// map이 아직 null이면(로딩 전) undefined를 반환 — 호출부에서 로딩 처리
export function useGuideContent(key) {
  const map = useContext(GuideContentContext);
  return map ? map[key] : undefined;
}

export function useGuideContentReady() {
  return useContext(GuideContentContext) !== null;
}
