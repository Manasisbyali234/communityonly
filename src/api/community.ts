import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { getSocketUrl } from './config';
import { Community, User, PaginatedResponse, ApiResponse } from '../types';
import { feedKeys } from './feed';
import { useAuthStore } from '../store/authStore';

const toAbsoluteUrl = (url?: string) => {
  if (!url) return '';
  const base = getSocketUrl();
  // Already a proxy URL — just rewrite the host to the current server
  if (url.includes('/api/v1/media/proxy/')) {
    if (url.startsWith('/')) return `${base}${url}`;
    try {
      const parsed = new URL(url);
      const current = new URL(base);
      parsed.host = current.host;
      parsed.port = current.port;
      parsed.protocol = current.protocol;
      return parsed.toString();
    } catch (_) { return url; }
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Rewrite direct S3 URL → backend proxy (encode the key once)
    const s3Match = url.match(/https?:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)/);
    if (s3Match) {
      return `${base}/api/v1/media/proxy/${encodeURIComponent(s3Match[1])}`;
    }
    return url.replace(/http:\/\/localhost(:\d+)?/, base.replace(/\/+$/, ''));
  }
  if (url.startsWith('/')) return `${base}${url}`;
  return url;
};

export const communityKeys = {
  all: ['communities'] as const,
  list: () => [...communityKeys.all, 'list'] as const,
  detail: (id: string) => [...communityKeys.all, 'detail', id] as const,
  members: (id: string) => [...communityKeys.all, 'members', id] as const,
};

// Fetch list of all communities
export function useCommunitiesQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Community[]>({
    queryKey: communityKeys.list(),
    enabled: isAuthenticated,
    staleTime: 0,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Community>>>('/communities');
      return (res.data.data.data ?? []).map((c: any) => ({
        ...c,
        membersCount: c.membersCount ?? c.memberCount ?? 0,
        postsCount: c.postsCount ?? 0,
        avatarUrl: toAbsoluteUrl(c.avatarUrl),
        bannerUrl: toAbsoluteUrl(c.bannerUrl),
        isJoined: c.isJoined ?? false,
        memberStatus: c.memberStatus ?? null,
        isPrivate: c.isPrivate ?? false,
      }));
    },
  });
}

// Fetch single community detail by id
export function useCommunityDetailsQuery(id: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Community | undefined>({
    queryKey: communityKeys.detail(id),
    enabled: !!id && isAuthenticated,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Community>>(`/communities/${id}`);
      const c = res.data.data as any;
      return {
        ...c,
        avatarUrl: toAbsoluteUrl(c.avatarUrl),
        bannerUrl: toAbsoluteUrl(c.bannerUrl),
        membersCount: c.membersCount ?? c.memberCount ?? 0,
        rules: c.rules ?? [],
        feedPostPrompts: c.feedPostPrompts ?? [],
      };
    },
  });
}

// Join or leave community mutation
export function useJoinCommunityMutation() {
  const queryClient = useQueryClient();
  return useMutation<{ status: string } | null, Error, { communityId: string; isJoined: boolean }>({
    mutationFn: async ({ communityId, isJoined }) => {
      try {
        if (isJoined) {
          await apiClient.delete(`/communities/${communityId}/join`);
          return null;
        }
        const res = await apiClient.post<ApiResponse<{ status: string }>>(`/communities/${communityId}/join`);
        return res.data.data;
      } catch (e: any) {
        if (e?.response?.status === 409) return null;
        throw e;
      }
    },
    onMutate: ({ communityId, isJoined }) => {
      const currentList: any[] = queryClient.getQueryData(communityKeys.list()) ?? [];
      const community = currentList.find((c) => c.id === communityId);
      const optimisticStatus = isJoined ? null : community?.isPrivate ? 'PENDING' : 'ACTIVE';
      const optimisticJoined = !isJoined && !community?.isPrivate;

      queryClient.setQueryData(communityKeys.list(), (old: any[]) =>
        (old ?? []).map((c) =>
          c.id === communityId
            ? { ...c, isJoined: optimisticJoined, memberStatus: optimisticStatus }
            : c
        )
      );
      queryClient.setQueryData(communityKeys.detail(communityId), (old: any) =>
        old ? { ...old, isJoined: optimisticJoined, memberStatus: optimisticStatus } : old
      );
    },
    onSuccess: (data, { communityId }) => {
      // Once we have the real status from server, update cache precisely
      const realStatus = data?.status ?? null;
      queryClient.setQueryData(communityKeys.list(), (old: any[]) =>
        (old ?? []).map((c) =>
          c.id === communityId
            ? {
                ...c,
                isJoined: realStatus === 'ACTIVE',
                memberStatus: realStatus,
              }
            : c
        )
      );
      // Also patch the detail cache
      queryClient.setQueryData(communityKeys.detail(communityId), (old: any) =>
        old ? { ...old, isJoined: realStatus === 'ACTIVE', memberStatus: realStatus } : old
      );
      queryClient.invalidateQueries({ queryKey: communityKeys.detail(communityId) });
      queryClient.invalidateQueries({ queryKey: feedKeys.posts() });
    },
  });
}

// Fetch community members
export function useCommunityMembersQuery(communityId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<User[]>({
    queryKey: communityKeys.members(communityId),
    enabled: !!communityId && isAuthenticated,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<User>>>(`/communities/${communityId}/members`);
      return res.data.data.data;
    },
  });
}

// Fetch pending join requests for a private community (admin only)
export function usePendingMembersQuery(communityId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<any[]>({
    queryKey: [...communityKeys.all, 'pending', communityId],
    enabled: !!communityId && isAuthenticated,
    staleTime: 0,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<any[]>>(`/communities/${communityId}/pending`);
      return res.data.data ?? [];
    },
  });
}

// Approve a pending join request
export function useApproveMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { communityId: string; userId: string }>({
    mutationFn: async ({ communityId, userId }) => {
      await apiClient.post(`/communities/${communityId}/members/${userId}/approve`);
    },
    onSuccess: (_data, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: [...communityKeys.all, 'pending', communityId] });
      queryClient.invalidateQueries({ queryKey: communityKeys.members(communityId) });
      queryClient.invalidateQueries({ queryKey: communityKeys.detail(communityId) });
    },
  });
}

// Reject a pending join request
export function useRejectMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { communityId: string; userId: string }>({
    mutationFn: async ({ communityId, userId }) => {
      await apiClient.post(`/communities/${communityId}/members/${userId}/reject`);
    },
    onSuccess: (_data, { communityId }) => {
      queryClient.invalidateQueries({ queryKey: [...communityKeys.all, 'pending', communityId] });
    },
  });
}

// Fetch current user's pending/rejected community creation requests
export function useMyCommunitiesRequestsQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<any[]>({
    queryKey: [...communityKeys.all, 'my-requests'],
    enabled: isAuthenticated,
    staleTime: 0,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<any[]>>('/communities/my/requests');
      return res.data.data ?? [];
    },
  });
}
