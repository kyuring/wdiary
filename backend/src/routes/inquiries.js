import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { postLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = req.user.role === 'admin'
      ? await query(`
          SELECT i.*, u.nickname, u.username
          FROM inquiries i JOIN users u ON u.id = i.user_id
          ORDER BY (i.status = 'open') DESC, i.created_at DESC
        `)
      : await query('SELECT * FROM inquiries WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ inquiries: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, postLimiter, async (req, res, next) => {
  try {
    const { title, body, category } = req.body;
    if (!title || !body) return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
    if (category && !['general', 'ad'].includes(category)) {
      return res.status(400).json({ error: "category는 'general' 또는 'ad'여야 합니다." });
    }

    const result = await query(
      `INSERT INTO inquiries (user_id, title, body, category) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, title, body, category || 'general']
    );
    res.status(201).json({ inquiry: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { admin_reply } = req.body;
    if (!admin_reply) return res.status(400).json({ error: '답변 내용을 입력해주세요.' });

    const result = await query(
      `UPDATE inquiries SET admin_reply = $1, status = 'answered', replied_at = now() WHERE id = $2 RETURNING *`,
      [admin_reply, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
    res.json({ inquiry: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
