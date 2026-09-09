import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import { getApiBaseUrl } from './config';
import { ApiResponse } from '../types';
import { useAuthStore } from '../store/authStore';

export function toProxyUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const BASE = getApiBaseUrl().replace('/api/v1', '');
  // Already correct
  if (url.startsWith(`${BASE}/api/v1/media/proxy/`)) return url;
  // Relative proxy path
  if (url.startsWith('/api/v1/media/proxy/')) return `${BASE}${url}`;
  // Other relative path
  if (url.startsWith('/')) return `${BASE}${url}`;
  // Old local IP or localhost URL — rewrite host to current BASE
  if (/https?:\/\/(192\.168\.|10\.|172\.|localhost|127\.0\.0\.1)/.test(url)) {
    try {
      const parsed = new URL(url);
      const current = new URL(BASE);
      parsed.hostname = current.hostname;
      parsed.port = current.port;
      parsed.protocol = current.protocol;
      return parsed.toString();
    } catch (_) {}
  }
  // S3 URL
  const s3Match = url.match(/https?:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)/);
  if (s3Match) return `${BASE}/api/v1/media/proxy/${encodeURIComponent(s3Match[1])}`;
  // R2 public URL (pub-xxx.r2.dev/<key>)
  const r2Match = url.match(/https?:\/\/pub-[^/]+\.r2\.dev\/(.+)/);
  if (r2Match) return `${BASE}/api/v1/media/proxy/${encodeURIComponent(r2Match[1])}`;
  // Raw key with no protocol (e.g. "uploads/file.webp")
  if (!url.startsWith('http')) return `${BASE}/api/v1/media/proxy/${encodeURIComponent(url)}`;
  return url;
}

export interface MediaFile {
  id: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export function useUserFilesQuery(mimeType?: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<MediaFile[]>({
    queryKey: ['media', 'userFiles', mimeType],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<{ files: MediaFile[] }>>('/media/user/files', {
        params: { limit: 100, ...(mimeType ? { mimeType } : {}) },
      });
      return (res.data.data.files ?? []).map((f) => ({
        ...f,
        url: toProxyUrl(f.url) ?? f.url,
      }));
    },
  });
}
