import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAccessToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 앱 최초 로드 시 httpOnly refresh 쿠키로 세션 복구 시도
    api.refreshAccessToken()
      .then((result) => {
        if (result) setUser(result.user);
      })
      .finally(() => setLoading(false));
  }, []);

  const register = useCallback(async (username, password, nickname) => {
    const result = await api.post('/auth/register', { username, password, nickname });
    setAccessToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

  const login = useCallback(async (username, password) => {
    const result = await api.post('/auth/login', { username, password });
    setAccessToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.');
  return ctx;
}
