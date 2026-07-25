import rateLimit from 'express-rate-limit';

// 로그인·회원가입은 무차별 대입(브루트포스)·계정 생성 스팸 방지용으로 IP당 엄격하게 제한.
// 표준 헤더(RateLimit-*)만 내려주고 레거시 X-RateLimit-* 헤더는 끔.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '너무 많이 시도했어요. 잠시 후 다시 시도해주세요.' },
});

// 게시글·댓글·신고 작성은 도배 방지용으로 완화된 제한.
export const postLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '너무 많이 시도했어요. 잠시 후 다시 시도해주세요.' },
});

// 전체 API 공통 하한선(디폴트 안전망) — 위 두 개보다 훨씬 넉넉하게 잡아서 정상 사용에는 영향 없게 함.
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '요청이 너무 많아요. 잠시 후 다시 시도해주세요.' },
});
