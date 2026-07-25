-- 결혼준비 다이어리 DB 스키마
-- 기획서 "2. DB 스키마" 섹션 기준. 로컬 Docker Postgres / Neon 공용으로 그대로 사용 가능.

CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9_]{4,20}$'),
  password_hash TEXT NOT NULL,
  nickname      TEXT NOT NULL UNIQUE CHECK (nickname ~ '^[가-힣a-zA-Z0-9]{2,12}$'),
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  suspended_until TIMESTAMPTZ, -- 관리자가 정지시킨 경우 이 시각까지 로그인 불가(NULL이면 정지 아님)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE guide_content (
  id           BIGSERIAL PRIMARY KEY,
  section_key  TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL CHECK (content_type IN ('list', 'table', 'text')),
  content      JSONB NOT NULL,
  updated_by   BIGINT REFERENCES users(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 사용자가 관리자에게 보내는 1:1 문의(실시간 채팅 대신 가벼운 게시판식 문의).
CREATE TABLE inquiries (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'ad')), -- 일반문의/광고문의
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered')),
  admin_reply TEXT,
  replied_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inquiries_user ON inquiries(user_id);

-- 관리자가 전체 사용자에게 보이는 공지사항을 올리는 용도.
-- type='banner'는 대시보드 상단 카드, type='popup'은 모달로 뜸.
-- starts_at/ends_at을 넣으면 그 기간에만 자동으로 노출(둘 다 null이면 is_active로만 제어).
CREATE TABLE announcements (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT,
  type       TEXT NOT NULL DEFAULT 'banner' CHECK (type IN ('banner', 'popup')),
  starts_at  DATE,
  ends_at    DATE,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE couples (
  id                BIGSERIAL PRIMARY KEY,
  groom_user_id     BIGINT UNIQUE REFERENCES users(id),
  bride_user_id     BIGINT UNIQUE REFERENCES users(id),
  invite_code       TEXT UNIQUE,
  wedding_date      DATE,
  wedding_time      TIME, -- 예식 시작 시각
  groom_name        TEXT,
  bride_name        TEXT,
  venue_season      TEXT CHECK (venue_season IN ('peak', 'off_peak')),
  venue_day_type    TEXT CHECK (venue_day_type IN ('saturday', 'sunday', 'weekday')),
  venue_booked_date DATE,
  -- wedding_date를 처음 입력한 시점의 날짜. 로드맵 %구간 계산의 분모(총 준비기간)를 고정하기 위한 기준점 —
  -- 이후 오늘 날짜가 바뀌어도 총 준비기간이 매번 재계산되지 않도록 함
  roadmap_start_date DATE,
  -- 대시보드 준비 타임라인 카드에서 이 커플이 "숨김" 처리한 할 일 문구 목록(예: 상견례를 다른 시기에 하거나
  -- 혼수·예물·예단을 안 하는 경우). guide_content의 공통 템플릿 문구와 정확히 일치하는 것만 매칭해서 걸러냄.
  hidden_roadmap_tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- 커플이 직접 추가한 준비 타임라인 할 일. { "<phase.min>": ["문구", ...] } 형태로 단계별 커스텀 항목을 저장
  -- (guide_content 공통 템플릿과 별개 — 삭제는 hidden과 달리 배열에서 바로 제거, 복원 개념 없음).
  custom_roadmap_tasks JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT couples_has_member CHECK (groom_user_id IS NOT NULL OR bride_user_id IS NOT NULL)
);

CREATE TABLE checklist_items (
  id         BIGSERIAL PRIMARY KEY,
  couple_id  BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  category   TEXT NOT NULL,
  title      TEXT NOT NULL,
  done       BOOLEAN NOT NULL DEFAULT false,
  assignee   TEXT CHECK (assignee IN ('groom', 'bride', 'both')),
  note       TEXT, -- 담당자가 미지정이거나 한쪽(신랑/신부)일 때 쓰는 일반 메모
  note_groom TEXT, -- assignee='both'(공동)일 때 신랑 쪽 메모를 신부와 분리해서 저장
  note_bride TEXT, -- assignee='both'(공동)일 때 신부 쪽 메모를 신랑과 분리해서 저장
  due_date   DATE, -- 이 항목을 언제까지 끝낼지(목표일)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_items_couple ON checklist_items(couple_id);

CREATE TABLE roadmap_custom_items (
  id            BIGSERIAL PRIMARY KEY,
  couple_id     BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  phase_min_pct INTEGER NOT NULL,
  phase_max_pct INTEGER NOT NULL,
  title         TEXT NOT NULL,
  note          TEXT,
  done          BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_roadmap_custom_items_couple ON roadmap_custom_items(couple_id);

-- total: 전체 계획 예산(사용자가 설정하는 목표 금액). 카테고리별 목표(예산)는 여기서 총액×프리셋 비율로만 정함(하향식) —
-- budget_line_items에는 항목별 예산을 따로 안 두고 총금액(실제 견적/계약 금액)만 기록함.
-- category_targets: 카테고리별 "권장 금액"을 프리셋 비율 대신 직접 덮어쓴 값(couple이 수동으로 조정한 것만 들어있음).
-- 없는 카테고리는 total * 프리셋 비율로 계산(guide_content 'budget.presets').
CREATE TABLE budget_settings (
  couple_id           BIGINT PRIMARY KEY REFERENCES couples(id) ON DELETE CASCADE,
  total               NUMERIC(12, 0),
  category_targets    JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 실제 결혼 예산 가계부 양식(세부항목 단위)을 그대로 반영. category는 고정 11개 참고값(guide_content 'budget.categories')이지만
-- DB에서 강제하진 않음(다른 guide_content 기반 옵션 목록들과 동일한 패턴).
-- 최종결제금액은 deposit_amount + balance_amount - discount_amount로 계산(저장하지 않고 조회 시 계산).
CREATE TABLE budget_line_items (
  id               BIGSERIAL PRIMARY KEY,
  couple_id        BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  category         TEXT NOT NULL, -- 구분(웨딩홀/스튜디오/드레스/메이크업/예복·한복/예물/상견례/초대/답례/신혼여행/관리)
  item_name        TEXT NOT NULL, -- 세부항목
  vendor_name      TEXT, -- 업체명
  planned          NUMERIC(12, 0) NOT NULL DEFAULT 0, -- 더 이상 UI에서 안 씀(과거 상향식 예산 배정 흔적, 항상 0) — 컬럼은 호환을 위해 유지
  total_amount     NUMERIC(12, 0) NOT NULL DEFAULT 0, -- 실제 계약 총금액. unit_price·quantity가 둘 다 있으면 서버에서 자동 계산됨(식대=1인 단가×인원수 등)
  unit_price       NUMERIC(12, 0), -- 단가(예: 식대 1인당 가격)
  quantity         NUMERIC(8, 1), -- 수량(예: 하객 인원수)
  deposit_date     DATE,
  deposit_amount   NUMERIC(12, 0) NOT NULL DEFAULT 0,
  balance_date     DATE,
  balance_amount   NUMERIC(12, 0) NOT NULL DEFAULT 0,
  discount_date    DATE,
  discount_amount  NUMERIC(12, 0) NOT NULL DEFAULT 0,
  payer            TEXT CHECK (payer IN ('groom', 'bride')),
  payment_method   TEXT CHECK (payment_method IN ('card', 'cash', 'transfer')),
  status           TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'done')),
  receipt_issued   BOOLEAN, -- 현금영수증 발행 여부(null = 해당 없음)
  -- 식대처럼 축의금·식권 등으로 충당되어 실제로는 couple 자기 돈이 나가는 게 아닌 항목 표시.
  -- true면 금액은 계속 보여주되 카테고리/전체 예산 집계에서는 제외함(summarize()에서 처리).
  excluded_from_budget BOOLEAN NOT NULL DEFAULT false,
  memo             TEXT,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_budget_line_items_couple ON budget_line_items(couple_id);

CREATE TABLE venues (
  id                   BIGSERIAL PRIMARY KEY,
  couple_id            BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  notes                TEXT,
  checks               JSONB NOT NULL DEFAULT '{}'::jsonb,
  quoted_price         NUMERIC(12, 0), -- 받은 견적(총액). 후보끼리 비교해서 대략 얼마 정도인지, 상대적으로 싸게 예약했는지 가늠하는 용도
  is_booked            BOOLEAN NOT NULL DEFAULT false, -- 이 후보로 예약 확정. 커플당 하나만 true(대시보드 D-day 카드에 표시)
  -- 아래 6개는 "후보 비교" 표에서 총금액 계산에 쓰는 구조화된 필드(체크리스트의 자유 텍스트 답변과 별개)
  rental_fee           NUMERIC(12, 0), -- 대관료
  meal_price           NUMERIC(12, 0), -- 식대(1인 기준)
  guaranteed_headcount INTEGER,        -- 보증 인원
  extra_person_fee     NUMERIC(12, 0), -- 보증 인원 초과 시 1인당 추가비용
  mandatory_fee        NUMERIC(12, 0), -- 필수 포함 금액(원판·앨범·서비스료 등 계약상 필수 옵션 총액)
  nearby_station       TEXT,           -- 근처 지하철역
  rating               SMALLINT CHECK (rating BETWEEN 1 AND 5) -- 투어 다녀온 뒤 직접 매기는 별점(1~5)
);
CREATE INDEX idx_venues_couple ON venues(couple_id);

-- 지인/커뮤니티에서 메일로 받은 "참고 견적"(내가 실제로 받은 견적이 아니라 타인의 계약 조건 참고용).
-- 한 웨딩홀 후보에 여러 개 넣을 수 있음(지인마다 견적이 다르거나, 같은 웨딩홀의 다른 홀·날짜 견적 등).
-- total_price는 견적서에 적힌 총액을 그대로 저장(자동계산 아님).
CREATE TABLE venue_reference_quotes (
  id                   BIGSERIAL PRIMARY KEY,
  venue_id             BIGINT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  hall_name            TEXT,
  quote_date           DATE,
  day_type             TEXT CHECK (day_type IN ('saturday', 'sunday', 'weekday')),
  time_slot            TEXT,
  rental_fee           NUMERIC(12, 0),
  meal_price           NUMERIC(12, 0),
  guaranteed_headcount INTEGER,
  drinks_included      TEXT,
  contract_day_benefit TEXT,
  total_price          NUMERIC(12, 0),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_venue_reference_quotes_venue ON venue_reference_quotes(venue_id);

CREATE TABLE guests (
  id         BIGSERIAL PRIMARY KEY,
  couple_id  BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  side       TEXT CHECK (side IN ('groom', 'bride')),
  group_name TEXT,
  phone      TEXT,
  rsvp       TEXT NOT NULL DEFAULT '미정' CHECK (rsvp IN ('참석', '불참', '미정')),
  meal_count INTEGER NOT NULL DEFAULT 1,
  notified   BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_guests_couple ON guests(couple_id);

CREATE TABLE invitation (
  couple_id  BIGINT PRIMARY KEY REFERENCES couples(id) ON DELETE CASCADE,
  design_url TEXT,
  sent_date  DATE
);

CREATE TABLE vendors (
  id                 BIGSERIAL PRIMARY KEY,
  couple_id          BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  category            TEXT NOT NULL,
  name                TEXT NOT NULL,
  contact             TEXT,
  contract_status     TEXT NOT NULL DEFAULT '상담중' CHECK (contract_status IN ('상담중', '계약완료', '결제완료')),
  price               NUMERIC(12, 0),
  notes               TEXT,
  checklist_answers   JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX idx_vendors_couple ON vendors(couple_id);

CREATE TABLE style_selection (
  couple_id                      BIGINT PRIMARY KEY REFERENCES couples(id) ON DELETE CASCADE,
  selected                       TEXT,
  parents_entrance_song_choice  TEXT, -- 혼주 입장곡(예시 선택 또는 직접 입력)
  groom_entrance_song_choice    TEXT, -- 신랑 입장곡(예시 선택 또는 직접 입력)
  entrance_song_choice          TEXT, -- 신부 입장곡(예시 선택 또는 직접 입력)
  congratulatory_song_choice    TEXT, -- 축가(예시 선택 또는 직접 입력)
  exit_song_choice               TEXT  -- 퇴장곡(예시 선택 또는 직접 입력)
);

CREATE TABLE sangyeonrye (
  couple_id              BIGINT PRIMARY KEY REFERENCES couples(id) ON DELETE CASCADE,
  groom_region           TEXT,
  bride_region           TEXT,
  decided_place          TEXT,
  notes                  TEXT,
  pre_meeting_checklist  JSONB NOT NULL DEFAULT '{}'::jsonb,
  day_of_checklist       JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE honeymoon (
  couple_id           BIGINT PRIMARY KEY REFERENCES couples(id) ON DELETE CASCADE,
  destination         TEXT,
  budget              NUMERIC(12, 0),
  flight_memo         TEXT, -- 직항 여부·항공사·예약 상태 등 자유 메모
  accommodation_memo  TEXT,
  notes               TEXT
);

-- 목적지 계산기에서 "적용하기"로 넘어오거나 직접 추가하는 실제 항공편 구간(다구간 지원)
CREATE TABLE honeymoon_flights (
  id           BIGSERIAL PRIMARY KEY,
  couple_id    BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  from_place   TEXT NOT NULL,
  to_place     TEXT NOT NULL,
  flight_no    TEXT, -- 항공사·편명
  price        NUMERIC(12, 0),
  departure_at TIMESTAMPTZ,
  arrival_at   TIMESTAMPTZ,
  sort_order   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_honeymoon_flights_couple ON honeymoon_flights(couple_id);

-- 목적지별 실제 숙소 예약 정보
CREATE TABLE honeymoon_stays (
  id          BIGSERIAL PRIMARY KEY,
  couple_id   BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  hotel_name  TEXT,
  price       NUMERIC(12, 0),
  nights      INTEGER,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_honeymoon_stays_couple ON honeymoon_stays(couple_id);

CREATE TABLE wedding_day_timeline (
  id               BIGSERIAL PRIMARY KEY,
  couple_id        BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  time             TIME,
  duration_minutes NUMERIC(5, 1), -- 소요시간(분) — 사회자 대본용
  assignee         TEXT, -- 담당(사회자/신랑/신부/혼주 등)
  task             TEXT NOT NULL,
  script           TEXT, -- 사회자 멘트/대본 상세
  done             BOOLEAN NOT NULL DEFAULT false,
  is_mc_script     BOOLEAN NOT NULL DEFAULT true -- 사회자 전달용 큐시트에 포함할지(준비단계 항목은 false)
);
CREATE INDEX idx_wedding_day_timeline_couple ON wedding_day_timeline(couple_id);

CREATE TABLE wedding_day_gifts (
  id             BIGSERIAL PRIMARY KEY,
  couple_id      BIGINT NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  side           TEXT CHECK (side IN ('groom', 'bride')),
  name           TEXT,
  amount         NUMERIC(12, 0),
  memo           TEXT,
  relation       TEXT, -- 관계(친구·직장동료·친척 등)
  payment_method TEXT CHECK (payment_method IN ('cash', 'transfer')),
  meal_tickets   INTEGER -- 식권 몇 장 가져갔는지
);
CREATE INDEX idx_wedding_day_gifts_couple ON wedding_day_gifts(couple_id);
-- 신랑측/신부측 목록은 PIN이 아니라 로그인 계정(groom_user_id/bride_user_id)으로 자동 분리해서 API가 상대측 데이터를 아예 내려주지 않음

CREATE TABLE wedding_day_notes (
  couple_id  BIGINT PRIMARY KEY REFERENCES couples(id) ON DELETE CASCADE,
  vows_groom TEXT, -- 혼인서약서(신랑)
  vows_bride TEXT  -- 혼인서약서(신부)
);

-- 커뮤니티 (공개 데이터, couple_id와 분리)

CREATE TABLE community_posts (
  id             BIGSERIAL PRIMARY KEY,
  author_user_id BIGINT NOT NULL REFERENCES users(id),
  nickname       TEXT NOT NULL,
  category       TEXT NOT NULL CHECK (category IN ('웨딩홀후기', '상견례장소', '자유')),
  region         TEXT,
  place_name     TEXT,
  rating         INTEGER CHECK (rating BETWEEN 1 AND 5),
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  blinded        BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_community_posts_category_region ON community_posts(category, region);
CREATE INDEX idx_community_posts_place_name ON community_posts(place_name);

CREATE TABLE community_comments (
  id             BIGSERIAL PRIMARY KEY,
  post_id        BIGINT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_user_id BIGINT NOT NULL REFERENCES users(id),
  nickname       TEXT NOT NULL,
  body           TEXT NOT NULL,
  blinded        BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_community_comments_post ON community_comments(post_id);

CREATE TABLE community_reports (
  id               BIGSERIAL PRIMARY KEY,
  target_type      TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id        BIGINT NOT NULL,
  reporter_user_id BIGINT NOT NULL REFERENCES users(id),
  reason           TEXT NOT NULL CHECK (reason IN ('스팸광고', '욕설비방', '개인정보노출', '허위정보', '기타')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (target_type, target_id, reporter_user_id)
);
