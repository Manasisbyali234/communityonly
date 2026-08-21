import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL, SOCKET_URL } from './config';
export { API_BASE_URL, SOCKET_URL };

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject Auth token on every request
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let the browser/native set Content-Type automatically for FormData
    // (ensures multipart boundary is included on web)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

/** Refreshes the access token and updates the store. Throws if refresh fails. */
export const refreshAccessToken = async (): Promise<string> => {
  const authState = useAuthStore.getState();
  const storedRefreshToken = authState.refreshToken;
  if (!storedRefreshToken) {
    authState.logout();
    throw new Error('No refresh token available');
  }

  const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
    refreshToken: storedRefreshToken,
  });
  const newAccessToken: string = res.data.data.accessToken;
  const newRefreshToken: string = res.data.data.refreshToken || storedRefreshToken;
  if (authState.user) {
    await authState.login(authState.user, newAccessToken, newRefreshToken);
  }
  return newAccessToken;
};

/** Deduplicates concurrent refresh calls — safe to call from socket and interceptor simultaneously. */
export const getOrRefreshToken = (): Promise<string> => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = refreshAccessToken().finally(() => { refreshPromise = null; });
  return refreshPromise;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isAuthRoute = originalRequest.url?.includes('/auth/');
    const hasRefreshToken = !!useAuthStore.getState().refreshToken;
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute && hasRefreshToken) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return apiClient(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccessToken = await getOrRefreshToken();
        processQueue(null, newAccessToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
