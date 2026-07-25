import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCoupleForRequest } from '../utils/coupleAccess.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const result = await query('SELECT * FROM honeymoon WHERE couple_id = $1', [couple.id]);
    res.json({ honeymoon: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

const FIELDS = ['destination', 'budget', 'flight_memo', 'accommodation_memo', 'notes'];

router.patch('/', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const updates = FIELDS.filter((f) => req.body[f] !== undefined);
    if (updates.length === 0) {
      return res.status(400).json({ error: '수정할 항목이 없습니다.' });
    }

    await query(
      `INSERT INTO honeymoon (couple_id) VALUES ($1) ON CONFLICT (couple_id) DO NOTHING`,
      [couple.id]
    );

    const setClause = updates.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
    const values = updates.map((key) => req.body[key]);
    values.push(couple.id);

    const result = await query(
      `UPDATE honeymoon SET ${setClause} WHERE couple_id = $${values.length} RETURNING *`,
      values
    );
    res.json({ honeymoon: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// --- 항공편 구간 ---

router.get('/flights', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const result = await query(
      'SELECT * FROM honeymoon_flights WHERE couple_id = $1 ORDER BY sort_order, id',
      [couple.id]
    );
    res.json({ flights: result.rows });
  } catch (err) {
    next(err);
  }
});

// 계산기에서 "적용하기"로 여러 구간을 한 번에 생성
router.post('/flights/bulk', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const { legs } = req.body;
    if (!Array.isArray(legs) || legs.length === 0) {
      return res.status(400).json({ error: 'legs 배열을 입력해주세요.' });
    }

    const values = [];
    const placeholders = legs.map((leg, idx) => {
      const base = idx * 4;
      values.push(couple.id, leg.from, leg.to, leg.price ?? null);
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, ${idx})`;
    });

    const result = await query(
      `INSERT INTO honeymoon_flights (couple_id, from_place, to_place, price, sort_order)
       VALUES ${placeholders.join(', ')} RETURNING *`,
      values
    );
    res.status(201).json({ flights: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/flights', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const { from_place, to_place } = req.body;
    if (!from_place || !to_place) {
      return res.status(400).json({ error: '출발지와 도착지를 입력해주세요.' });
    }

    const result = await query(
      `INSERT INTO honeymoon_flights (couple_id, from_place, to_place)
       VALUES ($1, $2, $3) RETURNING *`,
      [couple.id, from_place, to_place]
    );
    res.status(201).json({ flight: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

const FLIGHT_FIELDS = ['from_place', 'to_place', 'flight_no', 'price', 'departure_at', 'arrival_at'];

router.patch('/flights/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const updates = FLIGHT_FIELDS.filter((f) => req.body[f] !== undefined);
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    const setClause = updates.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
    const values = updates.map((key) => req.body[key]);
    const result = await query(
      `UPDATE honeymoon_flights SET ${setClause}
       WHERE id = $${values.length + 1} AND couple_id = $${values.length + 2}
       RETURNING *`,
      [...values, req.params.id, couple.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '항공편을 찾을 수 없습니다.' });
    res.json({ flight: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/flights/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const result = await query(
      'DELETE FROM honeymoon_flights WHERE id = $1 AND couple_id = $2 RETURNING id',
      [req.params.id, couple.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '항공편을 찾을 수 없습니다.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// --- 숙소 ---

router.get('/stays', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const result = await query(
      'SELECT * FROM honeymoon_stays WHERE couple_id = $1 ORDER BY sort_order, id',
      [couple.id]
    );
    res.json({ stays: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/stays/bulk', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const { stays } = req.body;
    if (!Array.isArray(stays) || stays.length === 0) {
      return res.status(400).json({ error: 'stays 배열을 입력해주세요.' });
    }

    const values = [];
    const placeholders = stays.map((s, idx) => {
      const base = idx * 3;
      values.push(couple.id, s.destination, s.nights ?? null);
      return `($${base + 1}, $${base + 2}, $${base + 3}, ${idx})`;
    });

    const result = await query(
      `INSERT INTO honeymoon_stays (couple_id, destination, nights, sort_order)
       VALUES ${placeholders.join(', ')} RETURNING *`,
      values
    );
    res.status(201).json({ stays: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/stays', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const { destination } = req.body;
    if (!destination) return res.status(400).json({ error: '목적지를 입력해주세요.' });

    const result = await query(
      `INSERT INTO honeymoon_stays (couple_id, destination) VALUES ($1, $2) RETURNING *`,
      [couple.id, destination]
    );
    res.status(201).json({ stay: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

const STAY_FIELDS = ['destination', 'hotel_name', 'price', 'nights'];

router.patch('/stays/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const updates = STAY_FIELDS.filter((f) => req.body[f] !== undefined);
    if (updates.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    const setClause = updates.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
    const values = updates.map((key) => req.body[key]);
    const result = await query(
      `UPDATE honeymoon_stays SET ${setClause}
       WHERE id = $${values.length + 1} AND couple_id = $${values.length + 2}
       RETURNING *`,
      [...values, req.params.id, couple.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '숙소를 찾을 수 없습니다.' });
    res.json({ stay: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/stays/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const result = await query(
      'DELETE FROM honeymoon_stays WHERE id = $1 AND couple_id = $2 RETURNING id',
      [req.params.id, couple.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '숙소를 찾을 수 없습니다.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
