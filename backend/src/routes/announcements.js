import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// 관리자는 비활성/기간만료 공지까지 전부 보고(관리용), 일반 사용자는 지금 시점에 실제로 보여야 하는 공지만 봄
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = req.user.role === 'admin'
      ? await query('SELECT * FROM announcements ORDER BY created_at DESC')
      : await query(
          `SELECT * FROM announcements
           WHERE is_active = true
             AND (starts_at IS NULL OR starts_at <= CURRENT_DATE)
             AND (ends_at IS NULL OR ends_at >= CURRENT_DATE)
           ORDER BY created_at DESC LIMIT 10`
        );
    res.json({ announcements: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { title, body, type, starts_at, ends_at } = req.body;
    if (!title) return res.status(400).json({ error: '제목을 입력해주세요.' });
    if (type && !['banner', 'popup'].includes(type)) {
      return res.status(400).json({ error: "type은 'banner' 또는 'popup'이어야 합니다." });
    }

    const result = await query(
      `INSERT INTO announcements (title, body, type, starts_at, ends_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, body || null, type || 'banner', starts_at || null, ends_at || null, req.user.id]
    );
    res.status(201).json({ announcement: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const fields = ['title', 'body', 'type', 'starts_at', 'ends_at', 'is_active'].filter((f) => req.body[f] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    const setClause = fields.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
    const values = fields.map((key) => req.body[key]);
    const result = await query(
      `UPDATE announcements SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
    res.json({ announcement: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const result = await query('DELETE FROM announcements WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: '공지사항을 찾을 수 없습니다.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
