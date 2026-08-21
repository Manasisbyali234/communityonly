const PRODUCTION_API = 'https://community-api.metromindz.com';

export const getApiBaseUrl = () => `${PRODUCTION_API}/api/v1`;
export const getSocketUrl = () => PRODUCTION_API;

// Resolved once at startup
export const API_BASE_URL = getApiBaseUrl();
export const SOCKET_URL = getSocketUrl();
