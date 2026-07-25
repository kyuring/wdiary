import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/stats', async (req, res, next) => {
  try {
    const [users, couples, posts, comments, pendingReports, newUsers, upcomingWeddings, signupsByMonth, openInquiries] = await Promise.all([
      query('SELECT count(*) FROM users'),
      query('SELECT count(*) FROM couples'),
      query('SELECT count(*) FROM community_posts'),
      query('SELECT count(*) FROM community_comments'),
      query(
        `SELECT count(DISTINCT (target_type, target_id)) FROM community_reports r
         WHERE NOT EXISTS (
           SELECT 1 FROM community_posts p WHERE r.target_type = 'post' AND p.id = r.target_id AND p.blinded = true
         ) AND NOT EXISTS (
           SELECT 1 FROM community_comments c WHERE r.target_type = 'comment' AND c.id = r.target_id AND c.blinded = true
         )`
      ),
      query(`SELECT count(*) FROM users WHERE created_at >= now() - interval '7 days'`),
      query(`SELECT count(*) FROM couples WHERE wedding_date IS NOT NULL AND wedding_date BETWEEN now()::date AND now()::date + interval '30 days'`),
      query(`
        SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, count(*) AS count
        FROM users
        WHERE created_at >= date_trunc('month', now()) - interval '11 months'
        GROUP BY 1 ORDER BY 1
      `),
      query(`SELECT category, count(*) FROM inquiries WHERE status = 'open' GROUP BY category`),
    ]);
    res.json({
      userCount: Number(users.rows[0].count),
      coupleCount: Number(couples.rows[0].count),
      postCount: Number(posts.rows[0].count),
      commentCount: Number(comments.rows[0].count),
      pendingReportTargets: Number(pendingReports.rows[0].count),
      newUsersThisWeek: Number(newUsers.rows[0].count),
      upcomingWeddings30d: Number(upcomingWeddings.rows[0].count),
      signupsByMonth: signupsByMonth.rows.map((r) => ({ month: r.month, count: Number(r.count) })),
      openInquiriesByCategory: openInquiries.rows.map((r) => ({ category: r.category, count: Number(r.count) })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/couples', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT c.id, c.wedding_date, c.venue_booked_date, c.created_at,
             c.groom_name, c.bride_name,
             gu.username AS groom_username, gu.nickname AS groom_nickname,
             bu.username AS bride_username, bu.nickname AS bride_nickname
      FROM couples c
      LEFT JOIN users gu ON gu.id = c.groom_user_id
      LEFT JOIN users bu ON bu.id = c.bride_user_id
      ORDER BY c.created_at DESC
    `);
    res.json({ couples: result.rows });
  } catch (err) {
    next(err);
  }
});

// 타겟(글/댓글)별로 신고를 묶어서, 최신 신고가 있는 순으로 반환
router.get('/reports', async (req, res, next) => {
  try {
    const grouped = await query(`
      SELECT target_type, target_id, count(*) AS report_count,
             array_agg(DISTINCT reason) AS reasons, max(created_at) AS last_reported_at
      FROM community_reports
      GROUP BY target_type, target_id
      ORDER BY max(created_at) DESC
    `);

    const items = [];
    for (const row of grouped.rows) {
      const table = row.target_type === 'post' ? 'community_posts' : 'community_comments';
      const target = await query(`SELECT * FROM ${table} WHERE id = $1`, [row.target_id]);
      items.push({
        target_type: row.target_type,
        target_id: row.target_id,
        report_count: Number(row.report_count),
        reasons: row.reasons,
        last_reported_at: row.last_reported_at,
        target: target.rows[0] || null,
      });
    }
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.post('/reports/:targetType/:targetId/unblind', async (req, res, next) => {
  try {
    const { targetType, targetId } = req.params;
    if (!['post', 'comment'].includes(targetType)) {
      return res.status(400).json({ error: 'targetType은 post 또는 comment여야 합니다.' });
    }
    const table = targetType === 'post' ? 'community_posts' : 'community_comments';
    const result = await query(`UPDATE ${table} SET blinded = false WHERE id = $1 RETURNING id`, [targetId]);
    if (result.rows.length === 0) return res.status(404).json({ error: '대상을 찾을 수 없습니다.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.delete('/posts/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM community_reports WHERE target_type = $1 AND target_id = $2', ['post', req.params.id]);
    const result = await query('DELETE FROM community_posts WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: '글을 찾을 수 없습니다.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.delete('/comments/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM community_reports WHERE target_type = $1 AND target_id = $2', ['comment', req.params.id]);
    const result = await query('DELETE FROM community_comments WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: '댓글을 찾을 수 없습니다.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const { search } = req.query;
    const result = search
      ? await query('SELECT id, username, nickname, role, suspended_until, created_at FROM users WHERE username ILIKE $1 OR nickname ILIKE $1 ORDER BY id DESC LIMIT 50', [`%${search}%`])
      : await query('SELECT id, username, nickname, role, suspended_until, created_at FROM users ORDER BY id DESC LIMIT 50');
    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id/suspend', async (req, res, next) => {
  try {
    const { until } = req.body; // ISO date string 또는 null(정지 해제)
    const result = await query(
      'UPDATE users SET suspended_until = $1 WHERE id = $2 RETURNING id, username, suspended_until',
      [until || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
