import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // send the refresh-token cookie
});

// ---------- Access token kept in MEMORY (not localStorage) ----------
let accessToken = null;
export const setAccessToken = (token) => {
  accessToken = token;
};

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// ---------- Single-flight refresh ----------
// If 5 requests get 401 at the same time, only ONE /auth/refresh call is made.
// (Two parallel refreshes would trip the server's token-reuse detection and log the user out.)
let refreshPromise = null;

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post('/api/v1/auth/refresh', null, { withCredentials: true })
      .then((res) => {
        setAccessToken(res.data.data.accessToken);
        return res.data.data; // { user, accessToken }
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

// ---------- On 401: refresh once, then retry the original request ----------
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = AUTH_ENDPOINTS.some((url) => original?.url?.startsWith(url));

    if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        await refreshSession();
        return api(original); // retry with the new token
      } catch {
        setAccessToken(null);
        window.dispatchEvent(new Event('auth:logout')); // AuthContext listens for this
      }
    }
    return Promise.reject(error);
  }
);

// Turn any API error into one readable message
export function getErrorMessage(error) {
  const data = error?.response?.data;
  if (data?.details?.length) {
    return data.details.map((d) => `${d.field}: ${d.message}`).join(', ');
  }
  return data?.message || error?.message || 'Something went wrong';
}
