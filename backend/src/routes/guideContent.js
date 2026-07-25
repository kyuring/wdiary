import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// 로그인한 사용자라면 누구나 가이드 콘텐츠를 읽을 수 있음(체크리스트/추천 문구 등은 공개 정보)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await query('SELECT section_key, content_type, content, updated_at FROM guide_content ORDER BY section_key');
    res.json({ items: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:key', requireAuth, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM guide_content WHERE section_key = $1', [req.params.key]);
    if (result.rows.length === 0) return res.status(404).json({ error: '콘텐츠를 찾을 수 없습니다.' });
    res.json({ item: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// 수정은 관리자만
router.put('/:key', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { content_type, content } = req.body;
    if (!['list', 'table', 'text'].includes(content_type)) {
      return res.status(400).json({ error: "content_type은 'list'|'table'|'text' 중 하나여야 합니다." });
    }
    if (content === undefined) return res.status(400).json({ error: 'content를 입력해주세요.' });

    const result = await query(
      `INSERT INTO guide_content (section_key, content_type, content, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (section_key) DO UPDATE
         SET content_type = $2, content = $3, updated_by = $4, updated_at = now()
       RETURNING *`,
      [req.params.key, content_type, JSON.stringify(content), req.user.id]
    );
    res.json({ item: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
