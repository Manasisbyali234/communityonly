import { useQuery } from '@tanstack/react-query';
import { apiClient, API_BASE_URL } from './client';
import { User, ApiResponse } from '../types';
import { useAuthStore } from '../store/authStore';

const getBase = () => API_BASE_URL.replace('/api/v1', '');

const toAbs = (url?: string): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('/')) return `${getBase()}${url}`;
  const s3Match = url.match(/https?:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)/);
  if (s3Match) return `${getBase()}/api/v1/media/proxy/${encodeURIComponent(s3Match[1])}`;
  if (url.includes('localhost')) return url.replace(/http:\/\/localhost(:\d+)?/, getBase());
  return url;
};

export const userKeys = {
  all: ['users'] as const,
  suggested: () => [...userKeys.all, 'suggested'] as const,
  search: (query: string) => [...userKeys.all, 'search', query] as const,
};

export function useSuggestedUsersQuery(limit: number = 20) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  return useQuery<User[]>({
    queryKey: userKeys.suggested(),
    enabled: isAuthenticated || !!token,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<User[]>>(`/explore/suggested-users?limit=${limit}`);
      const raw = res.data.data ?? res.data ?? [];
      const list = Array.isArray(raw) ? raw : [];
      return list.map((u: any) => ({
        ...u,
        avatarUrl: toAbs(u.avatarUrl) ?? u.avatarUrl,
        bannerUrl: toAbs(u.bannerUrl) ?? u.bannerUrl,
        followersCount: u.followersCount ?? u._count?.followers ?? 0,
        bio: u.bio ?? '',
        role: u.role ?? undefined,
        _count: undefined,
      }));
    },
  });
}

export function useSearchUsersQuery(query: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  return useQuery<User[]>({
    queryKey: userKeys.search(query),
    queryFn: async () => {
      if (!query) return [];
      const res = await apiClient.get<ApiResponse<User[]>>(`/search/users?q=${encodeURIComponent(query)}`);
      const raw = res.data.data ?? res.data ?? [];
      const list = Array.isArray(raw) ? raw : [];
      return list.map((u: any) => ({
        ...u,
        avatarUrl: toAbs(u.avatarUrl) ?? u.avatarUrl,
        followersCount: u.followersCount ?? u._count?.followers ?? 0,
        bio: u.bio ?? '',
        role: u.role ?? undefined,
      }));
    },
    enabled: query.length > 0 && (isAuthenticated || !!token),
  });
}
