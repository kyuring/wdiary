import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const CoupleContext = createContext(null);

export function CoupleProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [couple, setCouple] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setCouple(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await api.get('/couples/me');
      setCouple(result.couple);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setCouple(null);
      } else {
        throw err;
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // AuthContext가 refresh 토큰으로 로그인 상태를 아직 확정하기 전에는 user가 일시적으로 null이라,
    // 여기서 먼저 실행하면 couple=null로 잘못 확정해버림(로그인된 admin 계정이 새로고침할 때마다
    // /admin으로 튕기는 원인이었음). 인증 로딩이 끝날 때까지 기다렸다가 실행.
    if (authLoading) return;
    reload();
  }, [authLoading, reload]);

  const updateCouple = useCallback(async (fields) => {
    const result = await api.patch('/couples/me', fields);
    setCouple(result.couple);
    return result.couple;
  }, []);

  return (
    <CoupleContext.Provider value={{ couple, loading, reload, updateCouple }}>
      {children}
    </CoupleContext.Provider>
  );
}

export function useCouple() {
  const ctx = useContext(CoupleContext);
  if (!ctx) throw new Error('useCouple은 CoupleProvider 내부에서만 사용할 수 있습니다.');
  return ctx;
}
