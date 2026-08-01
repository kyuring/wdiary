import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCoupleForRequest } from '../utils/coupleAccess.js';

const router = Router();

// 총금액 = 대관료 + 식대 × 보증인원 + 필수 포함 금액 (셋 중 하나라도 입력 안 됐으면 비교 불가능하므로 null)
function optionTotalPrice(o) {
  if (o.rental_fee == null || o.meal_price == null || o.guaranteed_headcount == null) return null;
  return Number(o.rental_fee) + Number(o.meal_price) * Number(o.guaranteed_headcount) + Number(o.mandatory_fee || 0);
}

function withOptionTotal(o) {
  return { ...o, total_price: optionTotalPrice(o) };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const venuesResult = await query('SELECT * FROM venues WHERE couple_id = $1 ORDER BY id', [couple.id]);
    const venues = venuesResult.rows;
    const venueIds = venues.map((v) => v.id);

    let optionsByVenue = new Map();
    if (venueIds.length > 0) {
      const optionsResult = await query(
        'SELECT * FROM venue_options WHERE venue_id = ANY($1::bigint[]) ORDER BY id',
        [venueIds]
      );
      for (const row of optionsResult.rows) {
        const option = withOptionTotal(row);
        const list = optionsByVenue.get(option.venue_id) || [];
        list.push(option);
        optionsByVenue.set(option.venue_id, list);
      }
    }

    res.json({ venues: venues.map((v) => ({ ...v, options: optionsByVenue.get(v.id) || [] })) });
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
    res.status(201).json({ venue: { ...result.rows[0], options: [] } });
  } catch (err) {
    next(err);
  }
});

const VENUE_FIELDS = ['name', 'notes', 'rating', 'nearby_station'];

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const { checks } = req.body;
    const fields = VENUE_FIELDS.filter((f) => req.body[f] !== undefined);
    const values = fields.map((f) => req.body[f]);

    if (fields.length === 0 && checks === undefined) {
      return res.status(400).json({ error: '수정할 항목이 없습니다.' });
    }

    let setClause;
    if (checks !== undefined) {
      // checks는 { "항목명": "답변" } 형태의 부분 업데이트 — 기존 값과 병합
      fields.push('checks');
      values.push(JSON.stringify(checks));
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

    const options = await query('SELECT * FROM venue_options WHERE venue_id = $1 ORDER BY id', [req.params.id]);
    res.json({ venue: { ...result.rows[0], options: options.rows.map(withOptionTotal) } });
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

// 참고 견적/옵션은 커플 소유가 아니라 venue 소유라 매번 "이 venue가 이 커플 것인지"부터 확인해야 함
async function requireOwnedVenue(req, res, coupleId) {
  const result = await query('SELECT * FROM venues WHERE id = $1 AND couple_id = $2', [req.params.venueId, coupleId]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: '후보를 찾을 수 없습니다.' });
    return null;
  }
  return result.rows[0];
}

// --- 옵션: 같은 웨딩홀도 시간대·날짜·홀에 따라 견적이 달라지므로, 후보 하나당 여러 개의
// "실제 예약 가능한 옵션"(가격·시간 조합)을 둘 수 있게 함. 그중 하나만 예약 확정할 수 있음.
const OPTION_FIELDS = [
  'label', 'scheduled_date', 'ceremony_time', 'meal_service_until',
  'rental_fee', 'meal_price', 'guaranteed_headcount', 'extra_person_fee', 'mandatory_fee', 'quoted_price',
];

router.get('/:venueId/options', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;
    if (!(await requireOwnedVenue(req, res, couple.id))) return;

    const result = await query('SELECT * FROM venue_options WHERE venue_id = $1 ORDER BY id', [req.params.venueId]);
    res.json({ options: result.rows.map(withOptionTotal) });
  } catch (err) {
    next(err);
  }
});

router.post('/:venueId/options', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;
    if (!(await requireOwnedVenue(req, res, couple.id))) return;

    const fields = OPTION_FIELDS.filter((f) => req.body[f] !== undefined);
    const columns = ['venue_id', ...fields];
    const params = [req.params.venueId, ...fields.map((f) => req.body[f])];
    const placeholders = params.map((_, idx) => `$${idx + 1}`).join(', ');

    const result = await query(
      `INSERT INTO venue_options (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      params
    );
    res.status(201).json({ option: withOptionTotal(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.patch('/:venueId/options/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;
    if (!(await requireOwnedVenue(req, res, couple.id))) return;

    const fields = OPTION_FIELDS.filter((f) => req.body[f] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    const setClause = fields.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
    const params = fields.map((key) => req.body[key]);
    const result = await query(
      `UPDATE venue_options SET ${setClause}
       WHERE id = $${params.length + 1} AND venue_id = $${params.length + 2}
       RETURNING *`,
      [...params, req.params.id, req.params.venueId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '옵션을 찾을 수 없습니다.' });
    res.json({ option: withOptionTotal(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:venueId/options/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;
    if (!(await requireOwnedVenue(req, res, couple.id))) return;

    const result = await query(
      'DELETE FROM venue_options WHERE id = $1 AND venue_id = $2 RETURNING id, is_selected',
      [req.params.id, req.params.venueId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '옵션을 찾을 수 없습니다.' });
    if (result.rows[0].is_selected) {
      await query('UPDATE venues SET is_booked = false WHERE id = $1', [req.params.venueId]);
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// 이 옵션으로 예약 확정 — 커플 전체를 통틀어 확정은 하나만 존재해야 하므로 다른 웨딩홀·다른 옵션의
// 확정 표시를 모두 해제한 뒤 이 옵션만 켬. 옵션의 예정일·예식 시간을 결혼식 날짜/시간으로 반영.
router.post('/:venueId/options/:id/confirm', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;
    if (!(await requireOwnedVenue(req, res, couple.id))) return;

    const optionResult = await query(
      'SELECT * FROM venue_options WHERE id = $1 AND venue_id = $2',
      [req.params.id, req.params.venueId]
    );
    const option = optionResult.rows[0];
    if (!option) return res.status(404).json({ error: '옵션을 찾을 수 없습니다.' });

    await query(
      'UPDATE venue_options SET is_selected = false WHERE venue_id IN (SELECT id FROM venues WHERE couple_id = $1)',
      [couple.id]
    );
    await query('UPDATE venues SET is_booked = false WHERE couple_id = $1', [couple.id]);
    await query('UPDATE venue_options SET is_selected = true WHERE id = $1', [option.id]);
    await query('UPDATE venues SET is_booked = true WHERE id = $1', [req.params.venueId]);

    // 대시보드 D-day, 로드맵, 본식 당일 큐시트 등이 couple.wedding_date/wedding_time을 기준으로 동작하므로 반영
    const coupleFields = [];
    const coupleValues = [];
    if (option.scheduled_date) {
      coupleFields.push('wedding_date');
      coupleValues.push(option.scheduled_date);
      // wedding_date를 처음 확정하는 거라면 로드맵 %계산의 기준점도 같이 고정(couples.js PATCH /me와 동일한 규칙)
      if (!couple.roadmap_start_date) {
        coupleFields.push('roadmap_start_date');
        coupleValues.push(new Date().toISOString().slice(0, 10));
      }
    }
    if (option.ceremony_time) { coupleFields.push('wedding_time'); coupleValues.push(option.ceremony_time); }
    if (coupleFields.length > 0) {
      const coupleSet = coupleFields.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
      await query(`UPDATE couples SET ${coupleSet} WHERE id = $${coupleValues.length + 1}`, [...coupleValues, couple.id]);
    }

    const venueResult = await query('SELECT * FROM venues WHERE id = $1', [req.params.venueId]);
    const optionsResult = await query('SELECT * FROM venue_options WHERE venue_id = $1 ORDER BY id', [req.params.venueId]);
    res.json({ venue: { ...venueResult.rows[0], options: optionsResult.rows.map(withOptionTotal) } });
  } catch (err) {
    next(err);
  }
});

router.post('/:venueId/options/:id/unconfirm', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;
    if (!(await requireOwnedVenue(req, res, couple.id))) return;

    const result = await query(
      'UPDATE venue_options SET is_selected = false WHERE id = $1 AND venue_id = $2 RETURNING id',
      [req.params.id, req.params.venueId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '옵션을 찾을 수 없습니다.' });
    await query('UPDATE venues SET is_booked = false WHERE id = $1', [req.params.venueId]);

    const venueResult = await query('SELECT * FROM venues WHERE id = $1', [req.params.venueId]);
    const optionsResult = await query('SELECT * FROM venue_options WHERE venue_id = $1 ORDER BY id', [req.params.venueId]);
    res.json({ venue: { ...venueResult.rows[0], options: optionsResult.rows.map(withOptionTotal) } });
  } catch (err) {
    next(err);
  }
});

// --- 참고 견적: 후보 하나에 지인에게 들었거나 직접 알아본 "참고용" 견적을 여러 개 기록
const REF_QUOTE_FIELDS = [
  'source', 'hall_name', 'quote_date', 'day_type', 'time_slot', 'rental_fee', 'meal_price',
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
