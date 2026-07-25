// "가이드성 콘텐츠"를 guide_content 테이블에 채워주는 시드 스크립트.
// 새 개발 DB를 부트스트랩할 때 한 번 실행한다: node scripts/seedGuideContent.mjs (backend 폴더에서)
// 앱 코드 자체는 이 값을 import하지 않고 GET /api/guide-content(/:key)로 받아온다.
// ON CONFLICT DO NOTHING이라 이미 값이 있는 section_key는 건드리지 않는다(관리자 페이지에서 수정한 내용을 덮어쓰지 않음).
import 'dotenv/config';
import pg from 'pg';

const VENUE_CHECKLIST = {
  홀: [
    '홀 분위기',
    '단독홀 여부(동시간대 다른 예식 진행 여부)',
    '옆 홀과 동시 진행 시 방음 상태',
    '식 간격(앞뒤 예식과의 시간 간격)',
    '홀 규모(수용 인원)',
    '좌석 배치 형태(원형·극장식·롱테이블) 및 테이블당 인원',
    '버진로드 길이',
    '천장고',
    '신랑신부 동선',
    '플라워 샤워 비용·형태',
    '빔 프로젝터·영상 화면 여부',
    '원판(스냅) 필수 여부',
    'BGM·식순 변경 가능 여부',
    '리허설 가능 여부 및 소요 시간',
    '야외 예식 시 우천 대안 유무',
    '화환 반입·처리 규정',
    '음향·조명 시스템 상태',
    '노키즈존 여부·유아 동반 시설 유무',
    '반려동물 동반 하객 가능 여부',
    '주례 유무 선택 가능 여부',
  ],
  '공간·동선': [
    '로비 크기 및 편의성',
    '엘리베이터·에스컬레이터 유무(개수)',
    'ATM 여부',
    '포토테이블·답례품 테이블 설치 가능 여부와 위치',
    '신부대기실 위치·크기·조명',
    '신부 전용 화장실 및 내부 거울 유무',
    '혼주 대기실·탈의실·락커 유무',
    '혼주 메이크업 포함 여부',
    '출장 메이크업 가능 여부',
    '폐백실 유무',
    '화장실 위치와 개수',
    '휠체어·유모차 접근성',
    '하객 이동 동선(주차장→로비→식장)',
    '원거리 하객을 위한 인근 숙박시설 유무',
  ],
  '식사·피로연': [
    '식사 장소가 같은 건물인지',
    '식사 수용 인원 및 시간 제한',
    '식사타입(뷔페·코스·한상)',
    '식대(대인·소인) 및 부가세 포함 여부',
    '공간 분리(다른 홀/혼주) 여부',
    '식권 준비 여부',
    '시식 가능 인원·시기',
    '주류비(반입 가능 여부 및 비용)',
    '이바지 음식 반입 규정',
    '음료 무료 제공 여부와 종류',
    '혼주 식사 별도 여부(인원·시간)',
    '외부 답례품 반입 가능 여부',
  ],
  '계약 관련': [
    '대관료',
    '보증 인원 수 및 초과 인원 1인당 추가비용',
    '계약금 금액 및 취소 시 위약금 규정',
    '현금·카드 결제 시 금액 차이 여부',
    '현금영수증 발행 여부',
    '부가가치세 포함 여부',
    '계약금·중도금·잔금 납부 일정',
    '예식 소요 시간(초과 시 추가비용)',
    '공정위 표준계약서 사용 여부',
    '성수기·비수기 및 시간대별 가격 차이',
  ],
  촬영: [
    '본식 스냅·영상 외부 업체 반입 가능 여부 및 비용',
    '예식 전 사진 촬영 여유 시간',
    '폐백 촬영 가능 여부',
    '촬영 시간 제한',
    '하객 촬영 사진·영상 SNS 게시 관련 안내(초상권)',
  ],
  '교통·주차': [
    '대중교통 접근성(가까운 역·정류장)',
    '혼주 차량 지정 주차공간 여부',
    '주차 가능 대수',
    '주차 요금(무료·유료, 시간당 요금)',
    '주차장과 홀 사이 동선',
    '셔틀버스 운행 여부 및 간격',
  ],
};

const VENDOR_CATEGORIES = ['스튜디오', '드레스', '메이크업', '부케·플라워', '예물', '신혼여행', '기타'];
const CONTRACT_STATUS_OPTIONS = ['상담중', '계약완료', '결제완료'];
const VENDOR_CHECKLISTS = {
  스튜디오: [
    '촬영 장소·컨셉(스튜디오/야외/해외)',
    '촬영 소요 시간',
    '원판(원본 파일) 제공 매수',
    '원본 파일 전달 매체(USB·클라우드)와 전달 소요기간',
    '앨범 종류·페이지 수·커스터마이징 가능 여부',
    '앨범 배송 소요기간',
    '의상(드레스·한복) 몇 벌 포함되는지',
    '소품·배경 추가 비용 여부',
    '보정 횟수 및 추가 보정 비용',
    '액자·판넬 옵션과 비용',
    '원본파일 SNS 사용 등 저작권 범위',
    '우천 등으로 야외 촬영이 무산됐을 때 재촬영 정책',
  ],
  드레스: [
    '방문(투어) 가능 횟수와 벌수',
    '대여 vs 구매 여부',
    '사이즈 수선 가능 여부 및 추가 비용',
    '피팅 횟수와 최종 피팅 일정',
    '실루엣 종류(A라인·머메이드·벨라인 등) 선택 폭',
    '베일·장갑 등 액세서리 포함 여부',
    '본식 당일 드레스 관리(피팅 도우미) 인력 포함 여부',
    '오염·파손 시 배상 규정',
  ],
  메이크업: [
    '원장·실장·디자이너 등 등급별 가격 차이',
    '리허설 메이크업 가능 여부 및 비용',
    '신랑 메이크업 포함 여부',
    '업스타일(헤어) 옵션',
    '혼주(어머니) 메이크업 패키지 포함 여부',
    '샵 방문 vs 웨딩홀 출장 가능 여부',
    '사용 제품·피부 트러블 상담 가능 여부',
  ],
};
const VENDOR_COMMON_CHECKLIST = [
  '패키지 계약 vs 낱개(개별) 계약 비교',
  '계약금 환불 규정',
  '실장·작가 지정 옵션 유무(지정 시 추가금 여부)',
  '포트폴리오·실제 후기 확인 여부',
];

const STYLES = [
  {
    key: 'classic', name: '클래식 & 엘레건트', description: '단정한 격식과 우아함',
    dress: '허리 강조 A라인, 레이스 디테일, 긴 트레인', tuxedo: '블랙·미드나잇 네이비, 화이트 보타이',
    bouquet: '화이트 카라·장미 라운드 부케',
    parentsEntranceSong: [
      'G선상의 아리아(바흐)', '캐논 변주곡(파헬벨)', 'Trumpet Voluntary(클라크)',
      'Méditation - 타이스 명상곡(마스네)', 'Clair de Lune - 달빛(드뷔시)', 'Ave Maria(카치니)',
      'Ave Maria(슈베르트)', 'Nocturne Op.9 No.2(쇼팽)', "Jesu, Joy of Man's Desiring(바흐)",
      'Peer Gynt 中 아침(그리그)',
    ],
    groomEntranceSong: [
      '결혼행진곡(바그너) 현악 버전', 'Canon in D 현악 버전', 'Air on the G String(바흐)',
      'Water Music 中 Alla Hornpipe(헨델)', 'Trumpet Tune(퍼셀)', 'Rondeau(무레, 마스터피스 시어터 테마)',
      "Prince of Denmark's March(클라크)", 'Sinfonia from Cantata No.29(바흐)',
    ],
    entranceSongs: [
      '파헬벨 캐논 변주곡', '사랑의 인사(엘가)', 'Air on the G String(바흐) 하프 버전',
      'Ave Maria(슈베르트)', 'Clair de Lune - 달빛(드뷔시)', 'Méditation - 타이스 명상곡(마스네)',
      '엘리제를 위하여(베토벤) 하프 버전', '사계 中 봄(비발디)', 'Nocturne Op.9 No.2(쇼팽)',
    ],
    congratulatorySong: [
      'A Thousand Years - Christina Perri', 'All of Me - John Legend', 'Marry Me - Train',
      'Perfect - Ed Sheeran', 'Thinking Out Loud - Ed Sheeran', "Can't Help Falling in Love - Elvis Presley",
      'Just the Way You Are - Bruno Mars', 'You Are the Reason - Calum Scott',
      'Endless Love - Lionel Richie & Diana Ross', 'From This Moment On - Shania Twain',
      'When You Say Nothing At All - Ronan Keating', 'The Way You Look Tonight - Frank Sinatra',
    ],
    exitSongs: [
      '멘델스존 결혼행진곡', '환희의 송가(베토벤)', 'Canon Rock 현악 편곡',
      'Water Music - Alla Hornpipe(헨델)', 'Wedding March - 한여름 밤의 꿈(멘델스존, 오케스트라 풀버전)',
      'Marry You - Bruno Mars(현악 편곡)',
    ],
  },
  {
    key: 'modern', name: '모던 미니멀', description: '여백과 라인 중심',
    dress: '장식 최소화 슬림 실루엣', tuxedo: '노타이 슬림핏, 무광 소재',
    bouquet: '단색 그린 or 화이트 미니멀 부케',
    parentsEntranceSong: [
      '아이유 - 밤편지(연주 버전)', '폴킴 - 모든 날, 모든 순간(연주 버전)',
      '아이유 - 러브 포엠(연주 버전)', '성시경 - 두 사람(연주 버전)', '케이윌 - 러브블러썸(연주 버전)',
      '규현 - 고백(연주 버전)', '아이유 - 좋은 날(연주 버전)',
    ],
    groomEntranceSong: [
      '규현 - 고백', '폴킴 - 모든 날, 모든 순간', '케이윌 - 러브블러썸',
      '성시경 - 두 사람', '규현&소유 - 연애소설', 'SG워너비 - 라라라',
    ],
    entranceSongs: [
      '아이유 - 밤편지', '폴킴 - 모든 날, 모든 순간', '아이유 - 좋은 날',
      '아이유 - 러브포엠', '성시경 - 두 사람', '버스커버스커 - 벚꽃 엔딩',
    ],
    congratulatorySong: [
      '이적 - 다행이다', '케이윌 - 니가 필요해', '폴킴 - 모든 날, 모든 순간',
      'SG워너비 - 라라라', '성시경 - 두 사람',
    ],
    exitSongs: [
      '아이유 - Blueming', '백아연 - 쏘쏘', '버스커버스커 - 벚꽃 엔딩', '볼빨간사춘기 - 썸 탈꺼야',
    ],
  },
  {
    key: 'garden', name: '가든 & 아웃도어', description: '자연광 속 편안함',
    dress: '시폰 소재 플로우 실루엣', tuxedo: '리넨 라이트그레이·베이지',
    bouquet: '언스트럭처드 들꽃 부케',
    parentsEntranceSong: [
      '잔나비 - 주저하는 연인들을 위해(연주 버전)', '볼빨간사춘기 - 여행(연주 버전)', '버스커버스커 - 벚꽃 엔딩(연주 버전)',
    ],
    groomEntranceSong: [
      '잔나비 - 주저하는 연인들을 위해', '이무진 - 청춘만화', '볼빨간사춘기 - 썸 탈꺼야',
    ],
    entranceSongs: [
      '볼빨간사춘기 - 여행', '잔나비 - 주저하는 연인들을 위해', '버스커버스커 - 벚꽃 엔딩',
    ],
    congratulatorySong: [
      '이적 - 다행이다', '잔나비 - 주저하는 연인들을 위해', '성시경 - 두 사람', 'SG워너비 - 내 사람',
    ],
    exitSongs: [
      '싹쓰리 - 다시 여기 바닷가', '볼빨간사춘기 - 여행', '이무진 - 청춘만화', '볼빨간사춘기 - 썸 탈꺼야',
    ],
  },
  {
    key: 'korean', name: '한국 전통', description: '폐백·전통 예법 중심',
    dress: '전통 원삼 또는 개량 한복', tuxedo: '사모관대 또는 남색 두루마기',
    bouquet: '색동 리본 국화·작약 부케',
    parentsEntranceSong: ['국악 정악 합주', '수제천', '여민락', '보허자', '낙양춘', '취타'],
    groomEntranceSong: ['해금 연주곡', '청성곡', '대아', '아쟁 산조 연주', '대취타'],
    entranceSongs: ['대금·가야금 연주곡', '천년만세', '영산회상', '가야금 산조', '거문고 산조'],
    congratulatorySong: ['국악 반주 축하공연', '사랑가(춘향가 中)', '판소리 축원가', '성주풀이(민요)', '뱃노래(민요)'],
    exitSongs: ['국악 퓨전 업템포', '락 앙상블과 국악의 만남', '신뱅이 타령 퓨전 버전', '진도 아리랑 퓨전 버전', '강강술래 퓨전 버전'],
  },
  {
    key: 'vintage', name: '빈티지 로맨틱', description: '앤티크·파스텔 낭만',
    dress: '레이스 하이넥·퍼프소매', tuxedo: '헤링본 브라운톤, 서스펜더 포인트',
    bouquet: '피오니·라넌큘러스 파스텔 부케',
    parentsEntranceSong: [
      '이문세 - 붉은 노을(연주 버전)', '조용필 - 이젠 그랬으면 좋겠네(연주 버전)', '유재하 - 사랑하기 때문에(연주 버전)',
      'La Vie en Rose(연주 버전)', 'Fly Me to the Moon(연주 버전)',
    ],
    groomEntranceSong: [
      '이문세 - 붉은 노을', '조용필 - 이젠 그랬으면 좋겠네', '유재하 - 사랑하기 때문에',
      '쿨 - 아로하', 'Beyond the Sea(연주곡)',
    ],
    entranceSongs: [
      '이문세 - 붉은 노을', '유재하 - 사랑하기 때문에',
      'La Vie en Rose(피아노 연주)', 'Moon River(연주곡)',
    ],
    congratulatorySong: [
      '노을 - 청혼', 'SG워너비 - 내 사람', '이적 - 다행이다',
      'At Last - Etta James', "Can't Take My Eyes Off You - Frankie Valli",
    ],
    exitSongs: [
      '쿨 - 아로하', '쿨 - 해변의 여인', '조용필 - 여행을 떠나요',
      'Mambo Italiano', 'Sing, Sing, Sing - Benny Goodman',
    ],
  },
];

const REGION_GROUPS = {
  수도권: ['서울', '인천', '경기'],
  충청권: ['대전', '세종', '충청'],
  영남권: ['대구', '부산', '울산', '경북', '경남'],
  호남권: ['광주', '전라'],
  강원권: ['강원'],
  제주권: ['제주'],
};
const MIDPOINT_PAIRS = {
  '수도권|충청권': '대전 또는 천안',
  '수도권|영남권': '대전(또는 대구)',
  '수도권|호남권': '대전 또는 전주',
  '충청권|영남권': '대구',
  '충청권|호남권': '전주',
  '영남권|호남권': '진주 또는 광주 인근',
};
const GENERAL_GUIDE = [
  '시간대는 저녁보다 점심 추천(이동 부담 적음)',
  '프라이빗 룸이 있는 한정식집 선호',
  '비용 분담은 사전에 미리 상의',
  '자녀 세대가 먼저 서로 부모님을 소개한 뒤 자리 배치',
  '복장은 단정하게',
  '상견례 전 상대방 부모님 성함과 근황을 미리 파악해두면 좋음',
];
const PRE_MEETING_CHECKLIST = [
  '예식 희망 날짜 후보(2~3개) 정리',
  '신랑측·신부측 예상 하객 수 대략 공유',
  '예식 지역/권역 선호(양가 이동 거리 고려)',
  '총예산에 대한 대략적인 방향(상한선 정도는 합의)',
  '예단·예물 진행 방향(생략/간소화/전통 방식 등) 사전 합의',
  '신혼집 지역·형태에 대한 대략적 계획',
  '상견례 비용을 누가 낼지(또는 반반)',
];
const DAY_OF_CHECKLIST = [
  '상대방 부모님 성함·직업·근황 숙지',
  '자리 배치(보통 신랑측이 입구 반대편 상석에 부모님을 안내) 확인',
  '식사 메뉴 알레르기·못 먹는 음식 사전 확인',
  '대화 중 자연스럽게 예식 날짜 후보와 하객 수 언급하기',
  '다음 결정 사항(웨딩홀 방문 일정, 다음 상견례 필요 여부 등) 정하고 마무리',
];
const CUISINE_OPTIONS = ['한정식', '한식', '양식', '중식', '일식'];

const DESTINATION_GUIDE = [
  { name: '프랑스', flightPerPerson: 1200000, accommodationPeak: 320000, accommodationOffPeak: 220000, dailyMiscPerPerson: 180000, peakMonths: [6, 7, 8], directFlight: '직항 있음' },
  { name: '스페인', flightPerPerson: 1300000, accommodationPeak: 260000, accommodationOffPeak: 180000, dailyMiscPerPerson: 150000, peakMonths: [6, 7, 8], directFlight: '직항 없음(경유)' },
  { name: '이탈리아', flightPerPerson: 1250000, accommodationPeak: 280000, accommodationOffPeak: 190000, dailyMiscPerPerson: 160000, peakMonths: [6, 7, 8], directFlight: '직항 없음(경유)' },
  { name: '영국', flightPerPerson: 1300000, accommodationPeak: 320000, accommodationOffPeak: 220000, dailyMiscPerPerson: 170000, peakMonths: [6, 7, 8], directFlight: '직항 있음' },
  { name: '몰디브', flightPerPerson: 1500000, accommodationPeak: 650000, accommodationOffPeak: 420000, dailyMiscPerPerson: 200000, peakMonths: [12, 1, 2, 3, 4], directFlight: '직항 없음(싱가포르·두바이 등 경유)' },
  { name: '하와이', flightPerPerson: 1400000, accommodationPeak: 380000, accommodationOffPeak: 260000, dailyMiscPerPerson: 160000, peakMonths: [6, 7, 8, 12], directFlight: '직항 있음' },
  { name: '두바이', flightPerPerson: 900000, accommodationPeak: 300000, accommodationOffPeak: 210000, dailyMiscPerPerson: 130000, peakMonths: [11, 12, 1, 2, 3], directFlight: '직항 있음' },
  { name: '발리', flightPerPerson: 700000, accommodationPeak: 190000, accommodationOffPeak: 130000, dailyMiscPerPerson: 60000, peakMonths: [7, 8, 12, 1], directFlight: '직항 있음' },
  { name: '태국', flightPerPerson: 500000, accommodationPeak: 150000, accommodationOffPeak: 100000, dailyMiscPerPerson: 50000, peakMonths: [11, 12, 1, 2], directFlight: '직항 있음' },
  { name: '베트남', flightPerPerson: 400000, accommodationPeak: 130000, accommodationOffPeak: 85000, dailyMiscPerPerson: 45000, peakMonths: [12, 1, 2], directFlight: '직항 있음' },
  { name: '괌', flightPerPerson: 500000, accommodationPeak: 250000, accommodationOffPeak: 170000, dailyMiscPerPerson: 110000, peakMonths: [12, 1, 2, 3, 4, 7], directFlight: '직항 있음' },
  { name: '사이판', flightPerPerson: 550000, accommodationPeak: 250000, accommodationOffPeak: 170000, dailyMiscPerPerson: 100000, peakMonths: [12, 1, 2, 3, 4, 7], directFlight: '직항 있음' },
  { name: '일본', flightPerPerson: 300000, accommodationPeak: 200000, accommodationOffPeak: 140000, dailyMiscPerPerson: 100000, peakMonths: [3, 4, 10, 11], directFlight: '직항 있음' },
  { name: '싱가포르', flightPerPerson: 600000, accommodationPeak: 220000, accommodationOffPeak: 160000, dailyMiscPerPerson: 110000, peakMonths: [11, 12, 1], directFlight: '직항 있음' },
  { name: '필리핀', flightPerPerson: 500000, accommodationPeak: 180000, accommodationOffPeak: 120000, dailyMiscPerPerson: 50000, peakMonths: [12, 1, 2, 3], directFlight: '직항 있음' },
  { name: '그리스', flightPerPerson: 1400000, accommodationPeak: 300000, accommodationOffPeak: 200000, dailyMiscPerPerson: 140000, peakMonths: [6, 7, 8], directFlight: '직항 없음(경유)' },
  { name: '터키', flightPerPerson: 1100000, accommodationPeak: 220000, accommodationOffPeak: 150000, dailyMiscPerPerson: 80000, peakMonths: [6, 7, 8], directFlight: '직항 있음' },
  { name: '스위스', flightPerPerson: 1300000, accommodationPeak: 350000, accommodationOffPeak: 250000, dailyMiscPerPerson: 200000, peakMonths: [6, 7, 8, 12], directFlight: '직항 없음(경유)' },
  { name: '호주', flightPerPerson: 1200000, accommodationPeak: 280000, accommodationOffPeak: 190000, dailyMiscPerPerson: 150000, peakMonths: [12, 1, 2], directFlight: '직항 있음' },
  { name: '뉴질랜드', flightPerPerson: 1400000, accommodationPeak: 280000, accommodationOffPeak: 190000, dailyMiscPerPerson: 140000, peakMonths: [12, 1, 2], directFlight: '직항 없음(경유)' },
  { name: '크로아티아', flightPerPerson: 1450000, accommodationPeak: 260000, accommodationOffPeak: 180000, dailyMiscPerPerson: 110000, peakMonths: [6, 7, 8], directFlight: '직항 없음(경유)' },
  { name: '포르투갈', flightPerPerson: 1350000, accommodationPeak: 240000, accommodationOffPeak: 170000, dailyMiscPerPerson: 100000, peakMonths: [6, 7, 8], directFlight: '직항 없음(경유)' },
  { name: '미국(본토)', flightPerPerson: 1300000, accommodationPeak: 300000, accommodationOffPeak: 220000, dailyMiscPerPerson: 150000, peakMonths: [6, 7, 8, 12], directFlight: '직항 있음' },
];

const PHASES = [
  { min: 0, max: 15, tasks: ['양가 상견례', '예산 큰 틀 확정', '웨딩홀 조사·투어 시작'] },
  { min: 15, max: 30, tasks: ['웨딩홀 계약', '스드메 업체 상담·계약'] },
  { min: 30, max: 45, tasks: ['드레스 투어 확정', '청첩장 디자인 시작', '신혼여행지 결정'] },
  { min: 45, max: 60, tasks: ['촬영(스튜디오) 진행', '예단·예물 협의', '혼수 리스트 작성'] },
  { min: 60, max: 75, tasks: ['청첩장 발송', '하객 수 확정', '답례품·부케 주문', '신혼집 정리'] },
  { min: 75, max: 90, tasks: ['최종 하객 수 웨딩홀 통보', '축가·사회자 확정', '원판 사진 선택'] },
  { min: 90, max: 100, tasks: ['폐백 준비물', '축의금 접수대 준비', '리허설', '컨디션 관리'] },
];
const VENUE_LEAD_TIME_MONTHS = {
  saturday: { peak: 12, off_peak: 8 },
  sunday: { peak: 10, off_peak: 6 },
  weekday: { peak: 6, off_peak: 3 },
};
const JOURNEY_MILESTONES = [
  { pct: 0, icon: '🤝', label: '상견례' },
  { pct: 15, icon: '🏛️', label: '웨딩홀 계약' },
  { pct: 30, icon: '👗', label: '드레스·청첩장' },
  { pct: 45, icon: '📸', label: '촬영' },
  { pct: 60, icon: '💌', label: '청첩장 발송' },
  { pct: 75, icon: '🎤', label: '사회자·축가' },
  { pct: 90, icon: '🎎', label: '폐백 준비' },
  { pct: 100, icon: '💒', label: '예식일' },
];

const MC_SCRIPT_EXAMPLES = [
  { step: '개식 선언', examples: [
    '지금부터 신랑 ○○○ 군과 신부 ○○○ 양의 결혼식을 시작하겠습니다. 하객 여러분께서는 잠시 자리에서 정숙해 주시기 바랍니다.',
    '바쁜 시간을 내어 이 자리를 축하해 주시기 위해 참석해 주신 여러분께 진심으로 감사드립니다. 지금부터 두 사람의 결혼식을 시작하겠습니다.',
  ] },
  { step: '양가 혼주 입장', examples: [
    '먼저 오늘의 주인공을 낳고 길러주신 양가 부모님을 모시겠습니다. 신랑측 부모님, 신부측 부모님 입장해 주시기 바랍니다.',
  ] },
  { step: '신랑 입장', examples: [
    '이제 이 시대의 멋진 신랑감, 신랑 ○○○ 군이 입장하겠습니다. 하객 여러분의 큰 축하의 박수로 맞아주시기 바랍니다.',
  ] },
  { step: '신부 입장', examples: [
    '다음은 오늘의 주인공, 아름다운 신부가 입장하겠습니다. 신부는 아버님과 함께 입장하겠습니다. 하객 여러분께서는 다 함께 큰 축하의 박수를 보내주시기 바랍니다.',
  ] },
  { step: '성혼선언문 낭독', examples: [
    '이제 두 사람이 부부가 되었음을 여러분 앞에서 선언하는 성혼선언문을 낭독하겠습니다.',
  ] },
  { step: '주례사·사회자 덕담', examples: [
    '이어서 두 사람에게 주례 선생님의 말씀이 있겠습니다.',
    '주례 없이 진행되는 예식인 만큼, 두 사람에게 짧게 축하의 말씀을 전하겠습니다.',
  ] },
  { step: '축가', examples: [
    '두 사람의 앞날을 축복하는 마음을 담아 준비한 축가가 있겠습니다.',
  ] },
  { step: '인사 및 퇴장', examples: [
    '이것으로 신랑 신부의 결혼식을 모두 마치겠습니다. 참석해 주신 하객 여러분께 다시 한번 감사드리며, 신랑 신부가 힘차게 퇴장하겠습니다. 큰 박수로 배웅해 주시기 바랍니다.',
  ] },
];

const VOWS_EXAMPLES = [
  { title: '표준형(전통적 서약)', text: '나 ○○○는 ○○○를 아내(남편)로 맞아, 오늘 이 자리에서 두 사람이 아닌 하나의 가정을 이루었음을 선언합니다. 기쁠 때나 슬플 때나, 건강할 때나 병들었을 때나, 풍요로울 때나 어려울 때나 한결같은 마음으로 사랑하고 아끼며 존중하겠습니다. 서로의 부족함을 탓하기보다 채워주는 사람이 되고, 힘든 순간에는 가장 먼저 손을 내밀어주는 사람이 되겠습니다. 오늘의 이 다짐을 평생 잊지 않고, 죽음이 우리를 갈라놓을 때까지 서로의 곁을 지킬 것을 이 자리에 계신 모든 분들 앞에서 서약합니다.' },
  { title: '다짐형(약속 나열)', text: '나는 오늘부터 ○○○의 좋은 남편(아내)이 되어, 다음과 같이 약속합니다. 하나, 힘든 하루를 보낸 날에는 먼저 안부를 묻고 이야기를 들어주겠습니다. 둘, 다투더라도 그날 안에 화해하려 노력하고, 서로에게 상처 주는 말을 아끼겠습니다. 셋, 각자의 꿈과 시간을 존중하며, 혼자만의 시간이 필요할 때는 기다려주겠습니다. 넷, 부모님과 가족에게 소홀하지 않고, 서로의 가족을 나의 가족처럼 대하겠습니다. 다섯, 오늘처럼 매일 사랑한다고 말하며, 어떤 순간에도 당신 편이 되어주겠습니다.' },
  { title: '감사·회고형', text: '우리가 처음 만났던 날을 아직도 생생히 기억합니다. 그날부터 지금까지, 당신은 늘 제 곁에서 웃음을 주고 힘이 되어준 사람이었습니다. 함께 웃었던 날들만큼이나 함께 견뎌낸 날들이 있었기에, 오늘 이 자리까지 올 수 있었다고 생각합니다. 그 모든 시간에 감사하며, 앞으로 펼쳐질 우리의 날들도 지금처럼 서로에게 가장 든든한 사람이 되어주기를 약속합니다. 당신과 함께라면 어떤 날도 두렵지 않습니다. 남은 인생, 당신의 가장 가까운 친구이자 동반자로 살아가겠습니다.' },
  { title: '유머형', text: '나는 ○○○의 결혼 상대로서, 오늘부터 다음을 지킬 것을 약속합니다. 잔소리는 웃으며 듣고 열 번 중 아홉 번은 반영하겠습니다. 집안일은 미루지 않되, 가끔 미뤄도 너그럽게 봐주시길 바랍니다. 기념일은 반드시 기억하고, 혹시 깜빡하더라도 큰 사랑으로 용서해주시면 감사하겠습니다. 무엇보다 매일 사랑한다고 말하고, 당신이 힘들 때 가장 먼저 달려가는 사람이 되겠습니다. 이 모든 약속, 웃으면서도 진심을 다해 지키겠습니다.' },
  { title: '짧은형(간결)', text: '나는 오늘부터 ○○○의 좋은 남편(아내)이 되어, 어떤 순간에도 서로를 믿고 의지하며 함께 걸어가겠습니다. 기쁠 때는 함께 웃고, 힘들 때는 곁을 지키며, 평생 당신의 편이 되어주겠습니다.' },
];

// 실제 결혼 예산 가계부 양식(엑셀) 기준 11개 고정 카테고리
const BUDGET_CATEGORIES = ['웨딩홀', '스튜디오', '드레스', '메이크업', '예복·한복', '예물', '상견례', '초대', '답례', '신혼여행', '관리'];

// 실제 결혼 가계부 양식의 세부항목 기본값. 커플이 예산관리를 처음 열 때 항목명만 이름으로 채워두고,
// 예산·금액은 0으로 시작해서 직접 채워나가게 함(체크리스트 기본항목과 같은 패턴).
const BUDGET_LINE_ITEM_DEFAULTS = {
  웨딩홀: ['웨딩홀 투어', '웨딩 플래너', '대관료', '식대', '꽃장식', '플라워샤워/플라워 디렉팅', '본식 부케/부토니에/코사지', '전문 사회자', '헬퍼비', '본식스냅(원판)', '본식DVD', '아이폰스냅', '포토테이블', '버스대절', '하객숙소제공'],
  스튜디오: ['촬영비', '작가지정비', '원본비용', '로드씬/야간씬', '촬영의상추가', '액자업그레이드', '앨범 1P 추가', '헤어변형', '헬퍼비', '소품비'],
  드레스: ['기본 드레스(촬영 3벌+본식 1벌)', '피팅비', '기본 외 추가', '재가봉피팅비', '프리미엄라인 드레스', '촬영용 드레스(추가할 때)', '애프터 드레스(추가할 때)'],
  메이크업: ['신랑신부 메이크업', '가족 메이크업', '얼리/레이트 스타트 비용', '아티스트 지정비'],
  '예복·한복': ['신랑 예복', '양가 어머님 한복', '양가 아버님 턱시도'],
  예물: ['웨딩밴드', '시계'],
  상견례: ['상견례 선물', '상견례 식사비용'],
  초대: ['종이청첩장', '모바일청첩장', '신랑측 청첩모임비', '신부측 청첩모임비'],
  답례: ['답례품', '주례 사례', '축가 사례', '축사 사례', '가방순이 사례', '축의금담당 사례'],
  신혼여행: ['항공/교통', '호텔', '식대', '환전', '선물'],
  관리: ['피부관리', '시술'],
};

// 전체 계획 예산 대비 카테고리별 권장 배분 비율(통계 아님, 출발점 참고용). 실속형은 예물 낮추고 신혼여행 비중 높임,
// 프리미엄형은 반대로 예물 비중을 높이고 신혼여행은 낮춤 — 세부항목 결정은 각 카테고리 안에서 사용자가 직접 함.
const BUDGET_PRESETS = {
  economic: { 웨딩홀: 0.35, 스튜디오: 0.06, 드레스: 0.05, 메이크업: 0.03, '예복·한복': 0.04, 예물: 0.08, 상견례: 0.02, 초대: 0.03, 답례: 0.03, 신혼여행: 0.25, 관리: 0.06 },
  average: { 웨딩홀: 0.40, 스튜디오: 0.06, 드레스: 0.06, 메이크업: 0.03, '예복·한복': 0.04, 예물: 0.15, 상견례: 0.01, 초대: 0.02, 답례: 0.02, 신혼여행: 0.18, 관리: 0.03 },
  premium: { 웨딩홀: 0.42, 스튜디오: 0.07, 드레스: 0.08, 메이크업: 0.04, '예복·한복': 0.05, 예물: 0.20, 상견례: 0.01, 초대: 0.02, 답례: 0.02, 신혼여행: 0.06, 관리: 0.03 },
};

const DEFAULT_CHECKLIST_ITEMS = [
  ['상견례 준비', '양가 희망 날짜·시간대 확인'],
  ['상견례 준비', '상견례 장소 예약'],
  ['상견례 준비', '식사 예약 확인'],
  ['예산', '총 예산 설정'],
  ['예산', '항목별 예산 배분'],
  ['웨딩홀', '양가 희망 예식 시간대·요일 확인'],
  ['웨딩홀', '예상 하객 수 산정'],
  ['웨딩홀', '웨딩홀 후보 3곳 이상 방문'],
  ['웨딩홀', '계약금 납부'],
  ['스드메', '스튜디오 촬영 업체 예약'],
  ['스드메', '드레스 투어 예약'],
  ['스드메', '메이크업 샵 예약'],
  ['스드메', '원판 사진 선택'],
  ['예식 준비', '청첩장 디자인 및 발송'],
  ['예식 준비', '사회자 섭외'],
  ['예식 준비', '축가·축사 섭외'],
  ['예식 준비', '부케 예약'],
  ['예물', '커플링·시계·가방 등 품목과 예산 상한 합의'],
  ['예물', '브랜드 후보 리스트업'],
  ['예물', '양가 부모님 예물(시계·반지 등) 필요 여부'],
  ['예단', '예단비 액수에 대한 양가 기준 파악'],
  ['예단', '예단 품목(이불·반상기 등) 준비 여부'],
  ['예단', '함들이 일정과 절차'],
  ['예단', '함진아비 섭외 여부'],
  ['이바지 음식', '준비 여부와 업체 선정'],
  ['혼수 가전', '냉장고·세탁기·건조기·에어컨·TV·청소기 등 품목별 구매처와 예산'],
  ['혼수 가구', '침대·소파·식탁·옷장·화장대 등'],
  ['혼수 기타', '주방용품(그릇·조리도구) 준비'],
  ['혼수 기타', '신혼집 인테리어(도배·조명) 별도 진행 여부'],
  ['혼수 기타', '배송·설치 일정을 입주일과 조율'],
  ['신혼여행', '여행지 선정(허니문 시즌·예산 고려)'],
  ['신혼여행', '여권 유효기간 6개월 이상 확인 및 신규 발급 필요 여부'],
  ['신혼여행', '목적지 비자 필요 여부'],
  ['신혼여행', '항공권·숙소 예약 시기(성수기면 조기 예약 권장)'],
  ['신혼여행', '여행자보험 가입'],
  ['신혼여행', '필요 예방접종 확인'],
  ['신혼여행', '환전·해외카드 준비'],
  ['신혼여행', '캐리어·수하물 규정 확인'],
  ['예식 D-day', '폐백 준비'],
  ['예식 D-day', '답례품 준비'],
  ['예식 D-day', '축의금 접수대 준비'],
  ['예식 D-day', '리허설 진행'],
  ['예식 후', '축의금 주신 분들께 감사 인사'],
  ['예식 후', '답례품 미수령자 발송'],
  ['예식 후', '부모님·양가 어른께 감사 인사'],
  ['예식 후', '웨딩 사진·영상 최종 수령 확인'],
  ['혼인신고·행정', '혼인신고서 작성 및 관할 주민센터 제출'],
  ['혼인신고·행정', '준비 서류 확인(신분증, 증인 2인 서명 등)'],
  ['혼인신고·행정', '배우자 건강보험 피부양자 등재'],
  ['혼인신고·행정', '전입신고(합가 시)'],
  ['혼인신고·행정', '성·본 변경 여부 결정(선택)'],
];

const sections = [
  ['venue.checklist', 'table', VENUE_CHECKLIST],
  ['vendor.categories', 'list', VENDOR_CATEGORIES],
  ['vendor.contract_status_options', 'list', CONTRACT_STATUS_OPTIONS],
  ['vendor.checklist', 'table', VENDOR_CHECKLISTS],
  ['vendor.common_checklist', 'list', VENDOR_COMMON_CHECKLIST],
  ['style.recommendations', 'table', STYLES],
  ['sangyeonrye.region_groups', 'table', REGION_GROUPS],
  ['sangyeonrye.midpoint_pairs', 'table', MIDPOINT_PAIRS],
  ['sangyeonrye.general_guide', 'list', GENERAL_GUIDE],
  ['sangyeonrye.pre_meeting_checklist', 'list', PRE_MEETING_CHECKLIST],
  ['sangyeonrye.day_of_checklist', 'list', DAY_OF_CHECKLIST],
  ['sangyeonrye.cuisine_options', 'list', CUISINE_OPTIONS],
  ['honeymoon.destinations', 'table', DESTINATION_GUIDE],
  ['roadmap.phases', 'table', PHASES],
  ['roadmap.venue_lead_time', 'table', VENUE_LEAD_TIME_MONTHS],
  ['roadmap.journey_milestones', 'table', JOURNEY_MILESTONES],
  ['budget.categories', 'list', BUDGET_CATEGORIES],
  ['budget.line_item_defaults', 'table', BUDGET_LINE_ITEM_DEFAULTS],
  ['budget.presets', 'table', BUDGET_PRESETS],
  ['checklist.defaults', 'list', DEFAULT_CHECKLIST_ITEMS],
  ['weddingday.mc_script_examples', 'table', MC_SCRIPT_EXAMPLES],
  ['weddingday.vows_examples', 'table', VOWS_EXAMPLES],
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  for (const [sectionKey, contentType, content] of sections) {
    await pool.query(
      `INSERT INTO guide_content (section_key, content_type, content, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (section_key) DO NOTHING`,
      [sectionKey, contentType, JSON.stringify(content)]
    );
    console.log(`seeded (if missing): ${sectionKey}`);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
