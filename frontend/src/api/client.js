const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// access token은 XSS로 인한 탈취 위험을 줄이기 위해 localStorage가 아니라 메모리에만 보관.
// 새로고침 시에는 httpOnly refresh 쿠키로 /auth/refresh를 호출해 다시 발급받는다.
let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          accessToken = null;
          return null;
        }
        const body = await res.json();
        accessToken = body.accessToken;
        return body;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request(path, { method = 'GET', body, retry = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request(path, { method, body, retry: false });
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(data?.error || `요청에 실패했습니다 (${res.status})`, res.status, data);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
  refreshAccessToken,
};

export { ApiError };
