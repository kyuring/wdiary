import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCoupleForRequest } from '../utils/coupleAccess.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const result = await query('SELECT * FROM vendors WHERE couple_id = $1 ORDER BY id', [couple.id]);
    res.json({ vendors: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const { category, name, contact, price, notes } = req.body;
    if (!category || !name) {
      return res.status(400).json({ error: '카테고리와 업체명을 입력해주세요.' });
    }

    const result = await query(
      `INSERT INTO vendors (couple_id, category, name, contact, price, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [couple.id, category, name, contact || null, price || null, notes || null]
    );
    res.status(201).json({ vendor: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const { category, name, contact, contract_status, price, notes, checklist_answers } = req.body;
    const fields = [];
    const values = [];

    if (category !== undefined) { fields.push('category'); values.push(category); }
    if (name !== undefined) { fields.push('name'); values.push(name); }
    if (contact !== undefined) { fields.push('contact'); values.push(contact); }
    if (contract_status !== undefined) { fields.push('contract_status'); values.push(contract_status); }
    if (price !== undefined) { fields.push('price'); values.push(price); }
    if (notes !== undefined) { fields.push('notes'); values.push(notes); }

    if (fields.length === 0 && checklist_answers === undefined) {
      return res.status(400).json({ error: '수정할 항목이 없습니다.' });
    }

    const setParts = fields.map((key, idx) => `${key} = $${idx + 1}`);
    if (checklist_answers !== undefined) {
      values.push(JSON.stringify(checklist_answers));
      setParts.push(`checklist_answers = checklist_answers || $${values.length}::jsonb`);
    }

    const result = await query(
      `UPDATE vendors SET ${setParts.join(', ')}
       WHERE id = $${values.length + 1} AND couple_id = $${values.length + 2}
       RETURNING *`,
      [...values, req.params.id, couple.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '업체를 찾을 수 없습니다.' });
    res.json({ vendor: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const result = await query(
      'DELETE FROM vendors WHERE id = $1 AND couple_id = $2 RETURNING id',
      [req.params.id, couple.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '업체를 찾을 수 없습니다.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
