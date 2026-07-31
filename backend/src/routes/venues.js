import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCoupleForRequest } from '../utils/coupleAccess.js';

const router = Router();

// 총금액 = 대관료 + 식대 × 보증인원 + 필수 포함 금액 (셋 중 하나라도 입력 안 됐으면 비교 불가능하므로 null)
function totalPrice(v) {
  if (v.rental_fee == null || v.meal_price == null || v.guaranteed_headcount == null) return null;
  return Number(v.rental_fee) + Number(v.meal_price) * Number(v.guaranteed_headcount) + Number(v.mandatory_fee || 0);
}

function withTotal(v) {
  return { ...v, total_price: totalPrice(v) };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const result = await query('SELECT * FROM venues WHERE couple_id = $1 ORDER BY id', [couple.id]);
    res.json({ venues: result.rows.map(withTotal) });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const { name } = req.body;
    if (!name) return res.status(400).json({ error: '웨딩홀 이름을 입력해주세요.' });

    const result = await query(
      `INSERT INTO venues (couple_id, name) VALUES ($1, $2) RETURNING *`,
      [couple.id, name]
    );
    res.status(201).json({ venue: withTotal(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const {
      name, notes, checks, quoted_price, is_booked, rating,
      rental_fee, meal_price, guaranteed_headcount, extra_person_fee, mandatory_fee, nearby_station,
      ceremony_time, meal_service_until, scheduled_date,
    } = req.body;
    const fields = [];
    const values = [];

    if (name !== undefined) { fields.push('name'); values.push(name); }
    if (notes !== undefined) { fields.push('notes'); values.push(notes); }
    if (quoted_price !== undefined) { fields.push('quoted_price'); values.push(quoted_price); }
    if (is_booked !== undefined) { fields.push('is_booked'); values.push(is_booked); }
    if (rating !== undefined) { fields.push('rating'); values.push(rating); }
    if (rental_fee !== undefined) { fields.push('rental_fee'); values.push(rental_fee); }
    if (meal_price !== undefined) { fields.push('meal_price'); values.push(meal_price); }
    if (guaranteed_headcount !== undefined) { fields.push('guaranteed_headcount'); values.push(guaranteed_headcount); }
    if (extra_person_fee !== undefined) { fields.push('extra_person_fee'); values.push(extra_person_fee); }
    if (mandatory_fee !== undefined) { fields.push('mandatory_fee'); values.push(mandatory_fee); }
    if (nearby_station !== undefined) { fields.push('nearby_station'); values.push(nearby_station); }
    if (ceremony_time !== undefined) { fields.push('ceremony_time'); values.push(ceremony_time); }
    if (meal_service_until !== undefined) { fields.push('meal_service_until'); values.push(meal_service_until); }
    if (scheduled_date !== undefined) { fields.push('scheduled_date'); values.push(scheduled_date); }
    if (checks !== undefined) {
      // checks는 { "항목명": "답변" } 형태의 부분 업데이트 — 기존 값과 병합
      fields.push('checks');
      values.push(JSON.stringify(checks));
    }

    if (fields.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    // 커플당 예약 확정 후보는 하나만 존재해야 하므로, true로 켜기 전에 다른 후보의 확정 표시를 먼저 해제
    if (is_booked === true) {
      await query('UPDATE venues SET is_booked = false WHERE couple_id = $1 AND id != $2', [couple.id, req.params.id]);
    }

    let setClause;
    if (checks !== undefined) {
      const checksIdx = fields.indexOf('checks') + 1;
      setClause = fields
        .map((key, idx) => (key === 'checks' ? `checks = checks || $${idx + 1}::jsonb` : `${key} = $${idx + 1}`))
        .join(', ');
    } else {
      setClause = fields.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
    }

    const result = await query(
      `UPDATE venues SET ${setClause}
       WHERE id = $${values.length + 1} AND couple_id = $${values.length + 2}
       RETURNING *`,
      [...values, req.params.id, couple.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '후보를 찾을 수 없습니다.' });

    // 이 후보를 예약 확정하는 순간, 후보에 입력해둔 예정일·예식 시간을 커플의 확정 결혼식 날짜/시간으로 반영
    // (대시보드 D-day, 로드맵, 본식 당일 큐시트 등이 couple.wedding_date/wedding_time을 기준으로 동작하므로)
    if (is_booked === true) {
      const booked = result.rows[0];
      const coupleFields = [];
      const coupleValues = [];
      if (booked.scheduled_date) {
        coupleFields.push('wedding_date');
        coupleValues.push(booked.scheduled_date);
        // wedding_date를 처음 확정하는 거라면 로드맵 %계산의 기준점도 같이 고정(couples.js PATCH /me와 동일한 규칙)
        if (!couple.roadmap_start_date) {
          coupleFields.push('roadmap_start_date');
          coupleValues.push(new Date().toISOString().slice(0, 10));
        }
      }
      if (booked.ceremony_time) { coupleFields.push('wedding_time'); coupleValues.push(booked.ceremony_time); }
      if (coupleFields.length > 0) {
        const coupleSet = coupleFields.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
        await query(`UPDATE couples SET ${coupleSet} WHERE id = $${coupleValues.length + 1}`, [...coupleValues, couple.id]);
      }
    }

    res.json({ venue: withTotal(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const result = await query(
      'DELETE FROM venues WHERE id = $1 AND couple_id = $2 RETURNING id',
      [req.params.id, couple.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '후보를 찾을 수 없습니다.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// 참고 견적은 커플 소유가 아니라 venue 소유라 매번 "이 venue가 이 커플 것인지"부터 확인해야 함
async function requireOwnedVenue(req, res, coupleId) {
  const result = await query('SELECT id FROM venues WHERE id = $1 AND couple_id = $2', [req.params.venueId, coupleId]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: '후보를 찾을 수 없습니다.' });
    return null;
  }
  return result.rows[0];
}

const REF_QUOTE_FIELDS = [
  'hall_name', 'quote_date', 'day_type', 'time_slot', 'rental_fee', 'meal_price',
  'guaranteed_headcount', 'drinks_included', 'contract_day_benefit', 'total_price',
];

router.get('/:venueId/reference-quotes', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;
    if (!(await requireOwnedVenue(req, res, couple.id))) return;

    const result = await query(
      'SELECT * FROM venue_reference_quotes WHERE venue_id = $1 ORDER BY id',
      [req.params.venueId]
    );
    res.json({ quotes: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/:venueId/reference-quotes', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;
    if (!(await requireOwnedVenue(req, res, couple.id))) return;

    const fields = REF_QUOTE_FIELDS.filter((f) => req.body[f] !== undefined);
    const columns = ['venue_id', ...fields];
    const params = [req.params.venueId, ...fields.map((f) => req.body[f])];
    const placeholders = params.map((_, idx) => `$${idx + 1}`).join(', ');

    const result = await query(
      `INSERT INTO venue_reference_quotes (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      params
    );
    res.status(201).json({ quote: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.patch('/:venueId/reference-quotes/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;
    if (!(await requireOwnedVenue(req, res, couple.id))) return;

    const fields = REF_QUOTE_FIELDS.filter((f) => req.body[f] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    const setClause = fields.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
    const params = fields.map((key) => req.body[key]);
    const result = await query(
      `UPDATE venue_reference_quotes SET ${setClause}
       WHERE id = $${params.length + 1} AND venue_id = $${params.length + 2}
       RETURNING *`,
      [...params, req.params.id, req.params.venueId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '견적을 찾을 수 없습니다.' });
    res.json({ quote: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:venueId/reference-quotes/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;
    if (!(await requireOwnedVenue(req, res, couple.id))) return;

    const result = await query(
      'DELETE FROM venue_reference_quotes WHERE id = $1 AND venue_id = $2 RETURNING id',
      [req.params.id, req.params.venueId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '견적을 찾을 수 없습니다.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
