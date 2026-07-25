import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCoupleForRequest } from '../utils/coupleAccess.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const result = await query('SELECT * FROM guests WHERE couple_id = $1 ORDER BY id', [couple.id]);
    res.json({ guests: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const { name, side, group_name, phone } = req.body;
    if (!name) return res.status(400).json({ error: '이름을 입력해주세요.' });

    const result = await query(
      `INSERT INTO guests (couple_id, name, side, group_name, phone)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [couple.id, name, side || null, group_name || null, phone || null]
    );
    res.status(201).json({ guest: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

const FIELDS = ['name', 'side', 'group_name', 'phone', 'rsvp', 'meal_count', 'notified'];

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const updates = FIELDS.filter((f) => req.body[f] !== undefined);
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    const setClause = updates.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
    const values = updates.map((key) => req.body[key]);
    const result = await query(
      `UPDATE guests SET ${setClause}
       WHERE id = $${values.length + 1} AND couple_id = $${values.length + 2}
       RETURNING *`,
      [...values, req.params.id, couple.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '하객을 찾을 수 없습니다.' });
    res.json({ guest: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const result = await query(
      'DELETE FROM guests WHERE id = $1 AND couple_id = $2 RETURNING id',
      [req.params.id, couple.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '하객을 찾을 수 없습니다.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
