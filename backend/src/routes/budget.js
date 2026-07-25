import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireCoupleForRequest } from '../utils/coupleAccess.js';
import { getGuideContent } from '../utils/guideContent.js';

const router = Router();

// 식대는 보통 축의금·식권으로 충당되어 couple 자기 돈이 실제로 나가는 게 아니라서, 기본 시드에서는
// 예산 집계에서 빠지도록 표시해둠(금액은 계속 보여주고 사용자가 언제든 다시 켤 수 있음).
function isExcludedByDefault(category, itemName) {
  return category === '웨딩홀' && itemName === '식대';
}

async function seedDefaultLineItems(coupleId) {
  const defaults = (await getGuideContent('budget.line_item_defaults')) || {};
  const rows = Object.entries(defaults).flatMap(([category, itemNames]) =>
    itemNames.map((itemName, idx) => [category, itemName, idx, isExcludedByDefault(category, itemName)])
  );
  if (rows.length === 0) return;

  const values = [];
  const placeholders = rows.map(([category, itemName, sortOrder, excluded], idx) => {
    values.push(coupleId, category, itemName, sortOrder, excluded);
    const base = idx * 5;
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
  }).join(', ');
  await query(
    `INSERT INTO budget_line_items (couple_id, category, item_name, sort_order, excluded_from_budget) VALUES ${placeholders}`,
    values
  );
}

// 최종결제금액 = 계약금 + 잔금 - 페이백/할인 (실제 결혼 가계부 양식의 계산 방식)
function finalAmount(item) {
  return Number(item.deposit_amount || 0) + Number(item.balance_amount || 0) - Number(item.discount_amount || 0);
}

function withFinalAmount(item) {
  return { ...item, final_amount: finalAmount(item) };
}

// 카테고리 "사용액" 집계용 — 계약금·잔금을 아직 하나도 안 넣었으면(전형적으로 견적만 받은 초기 단계) 총금액을
// 잠정 사용액으로 대신 씀. 계약금이든 잔금이든 하나라도 입력되면 그 순간부터는 실제 결제 기록(finalAmount)을
// 그대로 씀 — "최종결제금액" 자체(개별 항목에 보이는 값)는 이 로직과 무관하게 항상 계약금+잔금-할인 그대로 유지.
function spentAmountFor(item) {
  const deposit = Number(item.deposit_amount || 0);
  const balance = Number(item.balance_amount || 0);
  if (deposit === 0 && balance === 0 && item.total_amount != null) {
    return Number(item.total_amount) - Number(item.discount_amount || 0);
  }
  return finalAmount(item);
}

// 식대처럼 excluded_from_budget=true인 항목은 금액은 계속 보이지만(couple 화면의 lineItems 목록에는 그대로 남음)
// 카테고리·전체 예산 집계(권장 금액 비교, 총예산 등)에서는 제외 — 축의금·식권으로 충당돼 실제 지출이 아니기 때문.
// spent(진행 중 포함 전체 기록 금액)와 별개로 actualSpent(status='done'인 것만)를 따로 집계 — 예식 후 정산 리포트에서
// "진짜 확정된 지출"만 보고 싶을 때 씀(예정/진행중인 계약금만 걸린 항목은 아직 확정 지출이 아니므로 제외).
// actualSpent는 총금액 대체 없이 항상 실제 계약금+잔금-할인만 집계(정산 리포트는 확정된 결제만 봐야 하므로).
// 예산(목표)은 항목별로 안 잡고 "요약" 탭(전체 목표 + 카테고리별 권장 비율)에서만 정하므로, 여기서는
// 카테고리별 planned/remaining 같은 상향식 집계를 만들지 않음 — 목표 대비 비교는 프론트에서 recommendedFor()로 함.
function summarize(lineItems) {
  const byCategory = new Map();
  for (const item of lineItems) {
    const entry = byCategory.get(item.category) || { name: item.category, spent: 0, actualSpent: 0 };
    if (!item.excluded_from_budget) {
      entry.spent += spentAmountFor(item);
      if (item.status === 'done') entry.actualSpent += finalAmount(item);
    }
    byCategory.set(item.category, entry);
  }
  const categories = [...byCategory.values()];

  const spentTotal = categories.reduce((sum, c) => sum + c.spent, 0);
  const actualSpentTotal = categories.reduce((sum, c) => sum + c.actualSpent, 0);

  const byPayerMethod = new Map();
  for (const item of lineItems) {
    if (!item.payer || !item.payment_method) continue;
    const key = `${item.payer}|${item.payment_method}`;
    byPayerMethod.set(key, (byPayerMethod.get(key) || 0) + finalAmount(item));
  }
  const payerMethodBreakdown = [...byPayerMethod.entries()].map(([key, amount]) => {
    const [payer, method] = key.split('|');
    return { payer, method, amount };
  });

  return { categories, spentTotal, actualSpentTotal, payerMethodBreakdown };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const [settings, existingLineItems] = await Promise.all([
      query('SELECT * FROM budget_settings WHERE couple_id = $1', [couple.id]),
      query('SELECT * FROM budget_line_items WHERE couple_id = $1', [couple.id]),
    ]);

    if (existingLineItems.rows.length === 0) {
      await seedDefaultLineItems(couple.id);
    }
    const lineItemsResult = existingLineItems.rows.length === 0
      ? await query('SELECT * FROM budget_line_items WHERE couple_id = $1 ORDER BY category, sort_order, id', [couple.id])
      : { rows: existingLineItems.rows.sort((a, b) => a.category.localeCompare(b.category) || a.sort_order - b.sort_order || a.id - b.id) };

    const lineItems = lineItemsResult.rows.map(withFinalAmount);
    const summary = summarize(lineItemsResult.rows);
    const target = Number(settings.rows[0]?.total || 0);

    res.json({
      settings: settings.rows[0] || null,
      lineItems,
      categories: summary.categories,
      totals: {
        targetTotal: settings.rows[0]?.total ?? null,
        spentTotal: summary.spentTotal,
        actualSpentTotal: summary.actualSpentTotal,
        remaining: settings.rows[0]?.total != null ? target - summary.spentTotal : null,
        overageVsTarget: settings.rows[0]?.total != null ? summary.spentTotal - target : null,
        overageActualVsTarget: settings.rows[0]?.total != null ? summary.actualSpentTotal - target : null,
      },
      payerMethodBreakdown: summary.payerMethodBreakdown,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/settings', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const { total, category_targets } = req.body;
    if (total == null && category_targets === undefined) {
      return res.status(400).json({ error: 'total 또는 category_targets 중 하나는 입력해주세요.' });
    }

    await query(
      `INSERT INTO budget_settings (couple_id) VALUES ($1) ON CONFLICT (couple_id) DO NOTHING`,
      [couple.id]
    );

    const fields = [];
    const values = [];
    if (total != null) { fields.push('total'); values.push(total); }
    if (category_targets !== undefined) { fields.push('category_targets'); values.push(JSON.stringify(category_targets)); }

    const setClause = fields.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
    const result = await query(
      `UPDATE budget_settings SET ${setClause} WHERE couple_id = $${values.length + 1} RETURNING *`,
      [...values, couple.id]
    );
    res.json({ settings: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// 예산(목표)은 항목별로 안 받음 — "요약" 탭(전체 목표 + 카테고리별 권장 비율)에서만 정함
const LINE_ITEM_FIELDS = [
  'category', 'item_name', 'vendor_name', 'total_amount',
  'unit_price', 'quantity',
  'deposit_date', 'deposit_amount', 'balance_date', 'balance_amount',
  'discount_date', 'discount_amount', 'payer', 'payment_method',
  'status', 'receipt_issued', 'memo', 'sort_order', 'excluded_from_budget',
];

router.post('/line-items', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const { category, item_name } = req.body;
    if (!category || !item_name) {
      return res.status(400).json({ error: 'category와 item_name을 입력해주세요.' });
    }

    const fields = LINE_ITEM_FIELDS.filter((f) => req.body[f] !== undefined);
    const values = { ...req.body };
    // 단가·수량이 둘 다 있으면 총금액(식대=1인 단가×인원수 등)을 서버에서 계산
    if (values.unit_price != null && values.quantity != null) {
      values.total_amount = Math.round(Number(values.unit_price) * Number(values.quantity));
      if (!fields.includes('total_amount')) fields.push('total_amount');
    }

    const columns = ['couple_id', ...fields];
    const params = [couple.id, ...fields.map((f) => values[f])];
    const placeholders = params.map((_, idx) => `$${idx + 1}`).join(', ');

    const result = await query(
      `INSERT INTO budget_line_items (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      params
    );
    res.status(201).json({ lineItem: withFinalAmount(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.patch('/line-items/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    let fields = LINE_ITEM_FIELDS.filter((f) => req.body[f] !== undefined);
    if (fields.length === 0) return res.status(400).json({ error: '수정할 항목이 없습니다.' });

    const values = { ...req.body };
    // unit_price·quantity 중 하나만 바뀌어도 나머지 값은 현재 저장된 걸 가져와서 total_amount를 다시 계산
    if (fields.includes('unit_price') || fields.includes('quantity')) {
      const current = await query('SELECT unit_price, quantity FROM budget_line_items WHERE id = $1 AND couple_id = $2', [req.params.id, couple.id]);
      if (current.rows.length > 0) {
        const unitPrice = values.unit_price !== undefined ? values.unit_price : current.rows[0].unit_price;
        const quantity = values.quantity !== undefined ? values.quantity : current.rows[0].quantity;
        if (unitPrice != null && quantity != null) {
          values.total_amount = Math.round(Number(unitPrice) * Number(quantity));
          if (!fields.includes('total_amount')) fields = [...fields, 'total_amount'];
        }
      }
    }

    const setClause = fields.map((key, idx) => `${key} = $${idx + 1}`).join(', ');
    const params = fields.map((key) => values[key]);
    const result = await query(
      `UPDATE budget_line_items SET ${setClause}
       WHERE id = $${params.length + 1} AND couple_id = $${params.length + 2}
       RETURNING *`,
      [...params, req.params.id, couple.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
    res.json({ lineItem: withFinalAmount(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});

router.delete('/line-items/:id', requireAuth, async (req, res, next) => {
  try {
    const couple = await requireCoupleForRequest(req, res);
    if (!couple) return;

    const result = await query(
      'DELETE FROM budget_line_items WHERE id = $1 AND couple_id = $2 RETURNING id',
      [req.params.id, couple.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '항목을 찾을 수 없습니다.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
