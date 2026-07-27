import { Router } from 'express';
import { pool, query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { generateInviteCode } from '../utils/inviteCode.js';
import { findCoupleByUserId } from '../utils/coupleAccess.js';
import { getGuideContent } from '../utils/guideContent.js';

const router = Router();

async function seedDefaultChecklist(coupleId) {
  const defaultItems = (await getGuideContent('checklist.defaults')) || [];
  if (defaultItems.length === 0) return;

  const values = [];
  const placeholders = defaultItems.map(([category, title], idx) => {
    values.push(coupleId, category, title);
    const base = idx * 3;
    return `($${base + 1}, $${base + 2}, $${base + 3})`;
  }).join(', ');

  await query(
    `INSERT INTO checklist_items (couple_id, category, title) VALUES ${placeholders}`,
    values
  );
}

async function insertCoupleWithUniqueCode({ userId, role, weddingDate, groomName, brideName }) {
  const column = role === 'bride' ? 'bride_user_id' : 'groom_user_id';
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = generateInviteCode();
    try {
      const result = await query(
        `INSERT INTO couples (${column}, invite_code, wedding_date, groom_name, bride_name)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, inviteCode, weddingDate || null, groomName || null, brideName || null]
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === '23505' && err.constraint === 'couples_invite_code_key') continue; // 코드 충돌 시 재시도
      throw err;
    }
  }
  const err = new Error('초대 코드를 생성하지 못했습니다.');
  err.status = 500;
  throw err;
}

// 커플 프로필 생성 (최초 1명이 실행)
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const existing = await findCoupleByUserId(req.user.id);
    if (existing) {
      return res.status(409).json({ error: '이미 커플에 속해있습니다.' });
    }

    const { role, wedding_date, groom_name, bride_name } = req.body;
    if (role !== 'groom' && role !== 'bride') {
      return res.status(400).json({ error: 'role은 groom 또는 bride여야 합니다.' });
    }

    const couple = await insertCoupleWithUniqueCode({
      userId: req.user.id,
      role,
      weddingDate: wedding_date,
      groomName: groom_name,
      brideName: bride_name,
    });
    await seedDefaultChecklist(couple.id);
    res.status(201).json({ couple });
  } catch (err) {
    next(err);
  }
});

// 초대 코드로 배우자 가입
router.post('/join', requireAuth, async (req, res, next) => {
  try {
    const existing = await findCoupleByUserId(req.user.id);
    if (existing) {
      return res.status(409).json({ error: '이미 커플에 속해있습니다.' });
    }

    const { invite_code } = req.body;
    if (!invite_code) {
      return res.status(400).json({ error: '초대 코드를 입력해주세요.' });
    }

    const found = await query('SELECT * FROM couples WHERE invite_code = $1', [invite_code.toUpperCase()]);
    const couple = found.rows[0];
    if (!couple) {
      return res.status(404).json({ error: '유효하지 않은 초대 코드입니다.' });
    }

    let column;
    if (!couple.groom_user_id) column = 'groom_user_id';
    else if (!couple.bride_user_id) column = 'bride_user_id';
    else {
      return res.status(409).json({ error: '이미 양쪽 모두 참여가 완료된 커플입니다.' });
    }

    // join 성공 시 초대 코드는 즉시 무효화(재사용 불가)
    const updated = await query(
      `UPDATE couples SET ${column} = $1, invite_code = NULL WHERE id = $2 RETURNING *`,
      [req.user.id, couple.id]
    );
    res.json({ couple: updated.rows[0] });
  } catch (err) {
    next(err);
  }
});

// '커플 만들기'로 혼자 만들어뒀다가(배우자 미가입) 사실 배우자가 먼저 만든 코드가 있어서
// 그쪽으로 갈아타고 싶을 때. 기존에 혼자 만든 커플은 삭제되고(체크리스트 등도 cascade로 함께 삭제) 새 커플에 참여함.
router.post('/switch', requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { invite_code } = req.body;
    if (!invite_code) {
      return res.status(400).json({ error: '초대 코드를 입력해주세요.' });
    }

    await client.query('BEGIN');

    const mine = await client.query(
      'SELECT * FROM couples WHERE groom_user_id = $1 OR bride_user_id = $1',
      [req.user.id]
    );
    const myCouple = mine.rows[0];
    if (!myCouple) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '커플에 속해있지 않습니다.' });
    }
    if (myCouple.groom_user_id && myCouple.bride_user_id) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '이미 배우자가 참여한 커플은 변경할 수 없습니다.' });
    }

    const target = await client.query('SELECT * FROM couples WHERE invite_code = $1', [invite_code.toUpperCase()]);
    const targetCouple = target.rows[0];
    if (!targetCouple) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: '유효하지 않은 초대 코드입니다.' });
    }
    if (targetCouple.id === myCouple.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '지금 사용 중인 커플과 같은 코드예요.' });
    }

    let column;
    if (!targetCouple.groom_user_id) column = 'groom_user_id';
    else if (!targetCouple.bride_user_id) column = 'bride_user_id';
    else {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: '이미 양쪽 모두 참여가 완료된 커플입니다.' });
    }

    await client.query('DELETE FROM couples WHERE id = $1', [myCouple.id]);
    const updated = await client.query(
      `UPDATE couples SET ${column} = $1, invite_code = NULL WHERE id = $2 RETURNING *`,
      [req.user.id, targetCouple.id]
    );

    await client.query('COMMIT');
    res.json({ couple: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const couple = await findCoupleByUserId(req.user.id);
    if (!couple) return res.status(404).json({ error: '커플에 속해있지 않습니다.' });
    res.json({ couple });
  } catch (err) {
    next(err);
  }
});

const PATCHABLE_FIELDS = [
  'wedding_date',
  'wedding_time',
  'groom_name',
  'bride_name',
  'venue_season',
  'venue_day_type',
  'venue_booked_date',
  'hidden_roadmap_tasks',
  'custom_roadmap_tasks',
];
const JSONB_FIELDS = ['hidden_roadmap_tasks', 'custom_roadmap_tasks'];

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const couple = await findCoupleByUserId(req.user.id);
    if (!couple) return res.status(404).json({ error: '커플에 속해있지 않습니다.' });

    const updates = Object.entries(req.body).filter(([key]) => PATCHABLE_FIELDS.includes(key));
    if (updates.length === 0) {
      return res.status(400).json({ error: '수정할 항목이 없습니다.' });
    }

    // wedding_date를 처음 입력하는 시점의 날짜를 로드맵 %계산의 고정 기준점으로 저장.
    // 이후 wedding_date가 바뀌어도 기준점은 재계산하지 않음(단순화를 위해, 웨딩홀 예약 앵커와 동일한 원칙)
    if (updates.some(([key]) => key === 'wedding_date') && !couple.roadmap_start_date) {
      updates.push(['roadmap_start_date', new Date().toISOString().slice(0, 10)]);
    }

    const setClause = updates
      .map(([key], idx) => (JSONB_FIELDS.includes(key) ? `${key} = $${idx + 1}::jsonb` : `${key} = $${idx + 1}`))
      .join(', ');
    const values = updates.map(([key, value]) => (JSONB_FIELDS.includes(key) ? JSON.stringify(value) : value));
    const result = await query(
      `UPDATE couples SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, couple.id]
    );
    res.json({ couple: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// 배우자가 아직 안 왔을 때 초대 코드 재발급(이전 코드는 폐기)
router.post('/regenerate-invite', requireAuth, async (req, res, next) => {
  try {
    const couple = await findCoupleByUserId(req.user.id);
    if (!couple) return res.status(404).json({ error: '커플에 속해있지 않습니다.' });
    if (couple.groom_user_id && couple.bride_user_id) {
      return res.status(400).json({ error: '이미 양쪽 모두 참여가 완료되어 초대 코드가 필요하지 않습니다.' });
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const inviteCode = generateInviteCode();
      try {
        const result = await query(
          'UPDATE couples SET invite_code = $1 WHERE id = $2 RETURNING *',
          [inviteCode, couple.id]
        );
        return res.json({ couple: result.rows[0] });
      } catch (err) {
        if (err.code === '23505') continue;
        throw err;
      }
    }
    res.status(500).json({ error: '초대 코드를 생성하지 못했습니다.' });
  } catch (err) {
    next(err);
  }
});

export default router;
