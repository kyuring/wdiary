import { Router } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, refreshCookieOptions } from '../utils/jwt.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

const USERNAME_RE = /^[a-z0-9_]{4,20}$/;
const NICKNAME_RE = /^[가-힣a-zA-Z0-9]{2,12}$/;

function publicUser(row) {
  return { id: row.id, username: row.username, nickname: row.nickname, role: row.role };
}

router.get('/check-username', async (req, res, next) => {
  try {
    const username = (req.query.username || '').toLowerCase();
    if (!USERNAME_RE.test(username)) {
      return res.json({ available: false, reason: '영문 소문자·숫자·밑줄(_)만 사용해 4~20자로 입력해주세요.' });
    }
    const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
    res.json({ available: existing.rows.length === 0 });
  } catch (err) {
    next(err);
  }
});

router.get('/check-nickname', async (req, res, next) => {
  try {
    const nickname = req.query.nickname || '';
    if (!NICKNAME_RE.test(nickname)) {
      return res.json({ available: false, reason: '한글·영문·숫자만 사용해 2~12자로 입력해주세요.' });
    }
    const existing = await query('SELECT id FROM users WHERE nickname = $1', [nickname]);
    res.json({ available: existing.rows.length === 0 });
  } catch (err) {
    next(err);
  }
});

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const username = (req.body.username || '').toLowerCase();
    const { password, nickname } = req.body;
    if (!username || !password || !nickname) {
      return res.status(400).json({ error: '아이디, 비밀번호, 닉네임을 모두 입력해주세요.' });
    }
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: '아이디는 영문 소문자·숫자·밑줄(_)만 사용해 4~20자로 입력해주세요.' });
    }
    if (!NICKNAME_RE.test(nickname)) {
      return res.status(400).json({ error: '닉네임은 한글·영문·숫자만 사용해 2~12자로 입력해주세요.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다.' });
    }

    const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
    }
    const existingNickname = await query('SELECT id FROM users WHERE nickname = $1', [nickname]);
    if (existingNickname.rows.length > 0) {
      return res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const inserted = await query(
      `INSERT INTO users (username, password_hash, nickname, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, username, nickname, role`,
      [username, passwordHash, nickname]
    );
    const user = inserted.rows[0];

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    res.cookie('refresh_token', refreshToken, refreshCookieOptions());
    res.status(201).json({ accessToken, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const username = (req.body.username || '').toLowerCase();
    const { password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
    }

    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
    if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
      return res.status(403).json({ error: `이용이 정지된 계정입니다. (${new Date(user.suspended_until).toISOString().slice(0, 10)}까지)` });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    res.cookie('refresh_token', refreshToken, refreshCookieOptions());
    res.json({ accessToken, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' });

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ error: '세션이 만료되었습니다. 다시 로그인해주세요.' });
    }

    const result = await query('SELECT id, username, nickname, role, suspended_until FROM users WHERE id = $1', [payload.sub]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: '사용자를 찾을 수 없습니다.' });
    if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
      return res.status(403).json({ error: `이용이 정지된 계정입니다. (${new Date(user.suspended_until).toISOString().slice(0, 10)}까지)` });
    }

    const accessToken = signAccessToken(user);
    res.json({ accessToken, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('refresh_token', { ...refreshCookieOptions(), maxAge: undefined });
  res.status(204).end();
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await query('SELECT id, username, nickname, role FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
