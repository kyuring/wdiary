import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { postLimiter } from '../middleware/rateLimit.js';

const router = Router();

const CATEGORIES = ['웨딩홀후기', '상견례장소', '자유'];
const REPORT_REASONS = ['스팸광고', '욕설비방', '개인정보노출', '허위정보', '기타'];
const REPORT_THRESHOLD = 3;

async function currentNickname(userId) {
  const result = await query('SELECT nickname FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.nickname;
}

router.get('/posts', requireAuth, async (req, res, next) => {
  try {
    const { category, region, search } = req.query;
    const conditions = ['blinded = false'];
    const values = [];

    if (category) {
      values.push(category);
      conditions.push(`category = $${values.length}`);
    }
    if (region) {
      values.push(region);
      conditions.push(`region = $${values.length}`);
    }
    if (search) {
      values.push(`%${search}%`);
      conditions.push(`place_name ILIKE $${values.length}`);
    }

    const result = await query(
      `SELECT p.*, (
         SELECT count(*) FROM community_comments c WHERE c.post_id = p.id AND c.blinded = false
       ) AS comment_count
       FROM community_posts p WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      values
    );
    res.json({ posts: result.rows });
  } catch (err) {
    next(err);
  }
});

router.post('/posts', requireAuth, postLimiter, async (req, res, next) => {
  try {
    const { category, region, place_name, rating, title, body } = req.body;
    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `카테고리는 ${CATEGORIES.join('/')} 중 하나여야 합니다.` });
    }
    if (!title || !body) return res.status(400).json({ error: '제목과 본문을 입력해주세요.' });

    const nickname = await currentNickname(req.user.id);
    const result = await query(
      `INSERT INTO community_posts (author_user_id, nickname, category, region, place_name, rating, title, body)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, nickname, category, region || null, place_name || null, rating || null, title, body]
    );
    res.status(201).json({ post: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/posts/:id', requireAuth, async (req, res, next) => {
  try {
    const post = await query('SELECT * FROM community_posts WHERE id = $1 AND blinded = false', [req.params.id]);
    if (post.rows.length === 0) return res.status(404).json({ error: '글을 찾을 수 없습니다.' });

    const comments = await query(
      'SELECT * FROM community_comments WHERE post_id = $1 AND blinded = false ORDER BY created_at',
      [req.params.id]
    );
    res.json({ post: post.rows[0], comments: comments.rows });
  } catch (err) {
    next(err);
  }
});

router.delete('/posts/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM community_posts WHERE id = $1 AND author_user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '글을 찾을 수 없거나 삭제 권한이 없습니다.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post('/posts/:id/comments', requireAuth, postLimiter, async (req, res, next) => {
  try {
    const { body } = req.body;
    if (!body) return res.status(400).json({ error: '댓글 내용을 입력해주세요.' });

    const nickname = await currentNickname(req.user.id);
    const result = await query(
      `INSERT INTO community_comments (post_id, author_user_id, nickname, body)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, req.user.id, nickname, body]
    );
    res.status(201).json({ comment: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/comments/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM community_comments WHERE id = $1 AND author_user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '댓글을 찾을 수 없거나 삭제 권한이 없습니다.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post('/reports', requireAuth, postLimiter, async (req, res, next) => {
  try {
    const { target_type, target_id, reason } = req.body;
    if (!['post', 'comment'].includes(target_type)) {
      return res.status(400).json({ error: 'target_type은 post 또는 comment여야 합니다.' });
    }
    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ error: `reason은 ${REPORT_REASONS.join('/')} 중 하나여야 합니다.` });
    }

    const table = target_type === 'post' ? 'community_posts' : 'community_comments';
    const target = await query(`SELECT * FROM ${table} WHERE id = $1`, [target_id]);
    if (target.rows.length === 0) return res.status(404).json({ error: '대상을 찾을 수 없습니다.' });
    if (target.rows[0].author_user_id === req.user.id) {
      return res.status(400).json({ error: '본인 글·댓글은 신고할 수 없습니다.' });
    }

    try {
      await query(
        `INSERT INTO community_reports (target_type, target_id, reporter_user_id, reason) VALUES ($1, $2, $3, $4)`,
        [target_type, target_id, req.user.id, reason]
      );
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: '이미 신고한 글·댓글입니다.' });
      throw err;
    }

    const countResult = await query(
      'SELECT count(*) FROM community_reports WHERE target_type = $1 AND target_id = $2',
      [target_type, target_id]
    );
    const reportCount = Number(countResult.rows[0].count);
    let blinded = false;
    if (reportCount >= REPORT_THRESHOLD) {
      await query(`UPDATE ${table} SET blinded = true WHERE id = $1`, [target_id]);
      blinded = true;
    }

    res.status(201).json({ reportCount, blinded });
  } catch (err) {
    next(err);
  }
});

export default router;
