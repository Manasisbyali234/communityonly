import axios from 'axios';
import { getApiBaseUrl } from './config';
import { useAdminStore } from '../store/adminStore';
import { useAuthStore } from '../store/authStore';
import { router } from 'expo-router';

export const adminApiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

adminApiClient.interceptors.request.use(async (config) => {
  if (!useAdminStore.persist.hasHydrated()) {
    await new Promise<void>((resolve) => {
      const unsub = useAdminStore.persist.onFinishHydration(() => { unsub(); resolve(); });
      setTimeout(resolve, 1000);
    });
  }
  const { token, isTokenValid, logout } = useAdminStore.getState();
  if (!isTokenValid()) {
    logout();
    router.replace('/(auth)/login' as any);
    return Promise.reject(new Error('Admin session expired'));
  }
  // Prefer the regular authenticated user token. The API validates that its
  // owner is an active ADMIN, and it is available immediately on native apps.
  const accessToken = useAuthStore.getState().token ?? token;
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

adminApiClient.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      useAdminStore.getState().logout();
      router.replace('/(auth)/login' as any);
    }
    return Promise.reject(error);
  }
);
