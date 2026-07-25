import jwt from 'jsonwebtoken';

const ACCESS_TTL = '15m';
const REFRESH_TTL = '30d';

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TTL,
  });
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TTL,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

export function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}
