const PRODUCTION_API = 'https://community-api.metromindz.com';

const normalizeOrigin = (value: string) => value.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

const getConfiguredApiOrigin = () => {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  return configured ? normalizeOrigin(configured) : null;
};

export const getApiOrigin = () => {
  const configured = getConfiguredApiOrigin();
  if (configured) return configured;

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return PRODUCTION_API;
};

export const getApiBaseUrl = () => `${getApiOrigin()}/api/v1`;
export const getSocketUrl = () => getApiOrigin();

// Resolved once at startup
export const API_BASE_URL = getApiBaseUrl();
export const SOCKET_URL = getSocketUrl();
