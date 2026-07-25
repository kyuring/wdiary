import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCoupleForRequest } from '../utils/coupleAccess.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const result = await query(
      'SELECT * FROM checklist_items WHERE couple_id = $1 ORDER BY id',
      [couple.id]
    );
    res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const { category, title, assignee, note } = req.body;
    if (!category || !title) {
      return res.status(400).json({ error: '카테고리와 항목명을 입력해주세요.' });
    }
    if (assignee && !['groom', 'bride', 'both'].includes(assignee)) {
      return res.status(400).json({ error: 'assignee는 groom, bride, both 중 하나여야 합니다.' });
    }

    const result = await query(
      `INSERT INTO checklist_items (couple_id, category, title, assignee, note)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [couple.id, category, title, assignee || null, note || null]
    );
    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

const PATCHABLE_FIELDS = ['title', 'done', 'assignee', 'category', 'note', 'note_groom', 'note_bride', 'due_date'];

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const updates = Object.entries(req.body).filter(([key]) => PATCHABLE_FIELDS.includes(key));
    if (updates.length === 0) {
      return res.status(400).json({ error: '수정할 항목이 없습니다.' });
    }

    const setClause = updates.map(([key], idx) => `${key} = $${idx + 1}`).join(', ');
    const values = updates.map(([, value]) => value);
    const result = await query(
      `UPDATE checklist_items SET ${setClause}
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

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const result = await query(
      'DELETE FROM checklist_items WHERE id = $1 AND couple_id = $2 RETURNING id',
      [req.params.id, couple.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
