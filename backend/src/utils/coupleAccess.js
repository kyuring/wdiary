import { query } from '../db.js';

export async function findCoupleByUserId(userId) {
  const result = await query(
    'SELECT * FROM couples WHERE groom_user_id = $1 OR bride_user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

// couple_id로 스코프되는 하위 리소스 라우트(체크리스트/예산/웨딩홀 등)에서 공통으로 쓰는 가드.
// couple이 없으면 404 응답을 보내고 null을 반환 — 호출부에서 `if (!couple) return;` 패턴으로 사용.
export async function requireCoupleForRequest(req, res) {
  const couple = await findCoupleByUserId(req.user.id);
  if (!couple) {
    res.status(404).json({ error: '커플에 속해있지 않습니다.' });
    return null;
  }
  return couple;
}
