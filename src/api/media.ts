import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import { getApiBaseUrl } from './config';
import { ApiResponse } from '../types';
import { useAuthStore } from '../store/authStore';

export function toProxyUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const BASE = getApiBaseUrl().replace('/api/v1', '');
  const s3Match = url.match(/https?:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)/);
  if (s3Match) return `${BASE}/api/v1/media/proxy/${encodeURIComponent(s3Match[1])}`;
  if (url.startsWith('/')) return `${BASE}${url}`;
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
