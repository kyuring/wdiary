import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCoupleForRequest } from '../utils/coupleAccess.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const result = await query('SELECT * FROM invitation WHERE couple_id = $1', [couple.id]);
    res.json({ invitation: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

const FIELDS = ['design_url', 'sent_date'];

router.patch('/', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const updates = FIELDS.filter((f) => req.body[f] !== undefined);
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    await query(
      `INSERT INTO invitation (couple_id) VALUES ($1) ON CONFLICT (couple_id) DO NOTHING`,
      [couple.id]
    );

    const setClause = updates.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
    const values = updates.map((key) => req.body[key]);
    values.push(couple.id);

    const result = await query(
      `UPDATE invitation SET ${setClause} WHERE couple_id = $${values.length} RETURNING *`,
      values
    );
    res.json({ invitation: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
