import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCoupleForRequest } from '../utils/coupleAccess.js';

const router = Router();

// 플래너 없이 준비하는 사람들이 사회자에게 그대로 건넬 수 있도록, 실제 예식 진행 관례에 맞춰
// 시간·소요시간(분)·담당까지 채운 기본 큐시트. couple마다 자유롭게 수정 가능.
// is_mc_script(5번째 값)이 false인 항목(준비단계·포토타임 이후)은 "전체일정"에만 보이고
// 사회자에게 실제로 건네는 "사회자 전달용" 큐시트에는 나오지 않음.
const DEFAULT_TIMELINE = [
  ['09:00', 60, '신부', '신부 메이크업 시작', false],
  ['11:00', 30, '신랑신부', '예식장 이동', false],
  ['11:30', 20, '신랑', '신랑 대기 및 하객 맞이', true],
  ['11:50', 5, '사회자', '개식 선언 및 양가 혼주 입장 안내', true],
  ['11:55', 2, '혼주', '양가 혼주 입장', true],
  ['11:57', 1, '신랑', '신랑 입장', true],
  ['11:58', 2, '신부', '신부 입장(아버지 동반)', true],
  ['12:00', 3, '사회자', '성혼선언문 낭독', true],
  ['12:03', 3, '신랑신부', '혼인서약', true],
  ['12:06', 5, '주례·사회자', '주례사 또는 사회자 덕담', true],
  ['12:11', 3, '축가자', '축가', true],
  ['12:14', 2, '신랑신부', '양가 부모님께 인사', true],
  ['12:16', 2, '신랑신부', '하객에게 인사', true],
  ['12:18', 2, '신랑신부', '신랑신부 행진(퇴장)', true],
  ['12:20', 10, '신랑신부', '포토타임', false],
  ['12:30', 20, '신랑신부', '폐백', false],
  ['13:00', null, '전체', '피로연 시작', false],
];

// --- 당일 큐시트 ---

router.get('/timeline', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    let result = await query('SELECT * FROM wedding_day_timeline WHERE couple_id = $1 ORDER BY time, id', [couple.id]);
    if (result.rows.length === 0) {
      const values = [];
      const placeholders = DEFAULT_TIMELINE.map(([time, duration, assignee, task, isMcScript], idx) => {
        values.push(couple.id, time, duration, assignee, task, isMcScript);
        const base = idx * 6;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
      }).join(', ');
      await query(
        `INSERT INTO wedding_day_timeline (couple_id, time, duration_minutes, assignee, task, is_mc_script) VALUES ${placeholders}`,
        values
      );
      result = await query('SELECT * FROM wedding_day_timeline WHERE couple_id = $1 ORDER BY time, id', [couple.id]);
    }
    res.json({ timeline: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/timeline', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const { time, task, duration_minutes, assignee, script } = req.body;
    if (!task) return res.status(400).json({ error: '할 일을 입력해주세요.' });

    const result = await query(
      `INSERT INTO wedding_day_timeline (couple_id, time, task, duration_minutes, assignee, script)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [couple.id, time || null, task, duration_minutes || null, assignee || null, script || null]
    );
    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.patch('/timeline/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const fields = ['time', 'task', 'done', 'duration_minutes', 'assignee', 'script', 'is_mc_script'].filter((f) => req.body[f] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    const setClause = fields.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
    const values = fields.map((key) => req.body[key]);
    const result = await query(
      `UPDATE wedding_day_timeline SET ${setClause}
       WHERE id = $${values.length + 1} AND couple_id = $${values.length + 2}
       RETURNING *`,
      [...values, req.params.id, couple.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
    res.json({ item: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/timeline/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const result = await query(
      'DELETE FROM wedding_day_timeline WHERE id = $1 AND couple_id = $2 RETURNING id',
      [req.params.id, couple.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// --- 축의금 트래커 ---
// 신랑측/신부측 리스트는 로그인한 계정이 couple의 groom_user_id인지 bride_user_id인지로 자동 분리.
// 신랑 계정으로 로그인하면 신랑측만, 신부 계정으로 로그인하면 신부측만 보이고 API 응답 자체에 상대측 데이터가 실리지 않음.
function sideOf(couple, userId) {
  if (String(couple.groom_user_id) === String(userId)) return 'groom';
  if (String(couple.bride_user_id) === String(userId)) return 'bride';
  return null;
}

router.get('/gifts', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const side = sideOf(couple, req.user.id);
    if (!side) return res.status(403).json({ error: '커플 구성원만 조회할 수 있습니다.' });

    const result = await query(
      'SELECT * FROM wedding_day_gifts WHERE couple_id = $1 AND side = $2 ORDER BY id',
      [couple.id, side]
    );
    res.json({ side, gifts: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/gifts', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const side = sideOf(couple, req.user.id);
    if (!side) return res.status(403).json({ error: '커플 구성원만 추가할 수 있습니다.' });

    const { name, amount, memo, relation, payment_method, meal_tickets } = req.body;
    const result = await query(
      `INSERT INTO wedding_day_gifts (couple_id, side, name, amount, memo, relation, payment_method, meal_tickets)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [couple.id, side, name || null, amount || null, memo || null, relation || null, payment_method || null, meal_tickets ?? null]
    );
    res.status(201).json({ gift: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

const GIFT_FIELDS = ['name', 'amount', 'memo', 'relation', 'payment_method', 'meal_tickets'];

router.patch('/gifts/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const side = sideOf(couple, req.user.id);
    if (!side) return res.status(403).json({ error: '커플 구성원만 수정할 수 있습니다.' });

    const fields = GIFT_FIELDS.filter((f) => req.body[f] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    // side 컬럼은 여기서 못 바꾸게 하고(WHERE에 고정), 본인 측 항목만 수정 가능
    const setClause = fields.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
    const values = fields.map((key) => req.body[key]);
    const result = await query(
      `UPDATE wedding_day_gifts SET ${setClause}
       WHERE id = $${values.length + 1} AND couple_id = $${values.length + 2} AND side = $${values.length + 3}
       RETURNING *`,
      [...values, req.params.id, couple.id, side]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
    res.json({ gift: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/gifts/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const side = sideOf(couple, req.user.id);
    if (!side) return res.status(403).json({ error: '커플 구성원만 삭제할 수 있습니다.' });

    const result = await query(
      'DELETE FROM wedding_day_gifts WHERE id = $1 AND couple_id = $2 AND side = $3 RETURNING id',
      [req.params.id, couple.id, side]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// --- 혼인서약서 ---

router.get('/vows', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const result = await query('SELECT * FROM wedding_day_notes WHERE couple_id = $1', [couple.id]);
    res.json({ vows: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

router.patch('/vows', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const fields = ['vows_groom', 'vows_bride'].filter((f) => req.body[f] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    await query(
      `INSERT INTO wedding_day_notes (couple_id) VALUES ($1) ON CONFLICT (couple_id) DO NOTHING`,
      [couple.id]
    );
    const setClause = fields.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
    const values = fields.map((key) => req.body[key]);
    values.push(couple.id);
    const result = await query(
      `UPDATE wedding_day_notes SET ${setClause} WHERE couple_id = $${values.length} RETURNING *`,
      values
    );
    res.json({ vows: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
