import { verifyAccessToken } from '../utils/jwt.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' });

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: '토큰이 유효하지 않거나 만료되었습니다.' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
  }
  next();
}
