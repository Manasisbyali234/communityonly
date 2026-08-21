import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiClient, API_BASE_URL } from './client';
import { Event, ApiResponse, PaginatedResponse } from '../types';
import { useEventStore } from '../store/eventStore';
import { useAuthStore } from '../store/authStore';

const getBase = () => API_BASE_URL.replace('/api/v1', '');
const toAbs = (url?: string): string | undefined => {
  if (!url) return undefined;
  // Direct S3 URL — rewrite to backend proxy so private bucket objects load
  if (url.includes('amazonaws.com')) {
    try {
      const parsed = new URL(url);
      const key = parsed.pathname.replace(/^\//, '');
      return `${getBase()}/api/v1/media/proxy/${encodeURIComponent(key)}`;
    } catch {}
  }
  // Absolute proxy URL with any host (e.g. stale IP) — repoint to current server
  if (url.startsWith('http')) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith('/api/v1/media/proxy/')) {
        return `${getBase()}${parsed.pathname}${parsed.search}`;
      }
    } catch {}
    return url;
  }
  // Relative proxy path — prepend the server base so Image gets an absolute URL
  if (url.startsWith('/')) return `${getBase()}${url}`;
  return url;
};

const normalizeEvent = (e: any): Event => {
  const coverUrl = toAbs(e.coverUrl);
  console.log('[normalizeEvent] id:', e.id, '| raw coverUrl:', e.coverUrl, '| resolved:', coverUrl);
  return { ...e, coverUrl, userRsvpStatus: e.userRsvpStatus ?? e.myRsvp ?? null };
};

export const eventKeys = {
  all: ['events'] as const,
  list: () => [...eventKeys.all, 'list'] as const,
  myEvents: (userId: string) => [...eventKeys.all, 'mine', userId] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
};

export function useEventsQuery() {
  const localEvents = useEventStore((s) => s.localEvents);
  const removeEvent = useEventStore((s) => s.removeEvent);

  const query = useQuery<Event[]>({
    queryKey: eventKeys.list(),
    // Event approval happens outside this view, so do not retain an old list.
    staleTime: 0,
    refetchInterval: 60_000,
    gcTime: 60 * 60 * 1000,     // 1 hour — keep cached data alive across navigations
    queryFn: async () => {
      try {
        const res = await apiClient.get<ApiResponse<PaginatedResponse<Event>>>('/events');
        const data = res.data.data.data;
        const normalized = (data ?? []).map(normalizeEvent);
        console.log('[useEventsQuery] events coverUrls:', normalized.map((e: Event) => ({ id: e.id, coverUrl: e.coverUrl })));
        return normalized;
      } catch {
        return [];
      }
    },
  });

  const serverData = query.data ?? [];
  const serverIds = new Set(serverData.map((e) => e.id));

  // Evict local events once the server confirms them
  useEffect(() => {
    const confirmedIds = new Set(serverData.map((e) => e.id));
    localEvents.forEach((e) => {
      if (confirmedIds.has(e.id)) removeEvent(e.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.dataUpdatedAt]);

  const newLocals = localEvents.filter((e) => !serverIds.has(e.id));
  const merged = [...newLocals, ...serverData];

  return { ...query, data: merged };
}

export function useMyEventsQuery() {
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery<Event[]>({
    queryKey: eventKeys.myEvents(userId ?? ''),
    enabled: !!userId,
    staleTime: 0,
    refetchInterval: 60_000,
    gcTime: 60 * 60 * 1000,
    queryFn: async () => {
      try {
        // Creator events intentionally include pending/rejected items so users
        // can track the approval status of submissions.
        const res = await apiClient.get<ApiResponse<PaginatedResponse<Event>>>('/events', {
          params: { mine: true },
        });
        const data = res.data.data.data ?? [];
        return data.map(normalizeEvent);
      } catch {
        return [];
      }
    },
  });
}

export function useEventDetailQuery(id: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery<Event | null>({
    queryKey: eventKeys.detail(id ?? ''),
    enabled: !!id,
    staleTime: 30_000,
    queryFn: async () => {
      try {
        const res = await apiClient.get<ApiResponse<Event>>(`/events/${id}`);
        return normalizeEvent(res.data.data);
      } catch {
        // Fallback to checking cached list
        const cachedList = queryClient.getQueryData<Event[]>(eventKeys.list()) || [];
        const found = cachedList.find((e) => e.id === id);
        return found || null;
      }
    },
  });
}

export function useToggleLikeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await apiClient.post<ApiResponse<{ liked: boolean; likesCount: number }>>(`/events/${eventId}/like`);
      return res.data.data;
    },
    onSuccess: (data, eventId) => {
      queryClient.setQueryData<Event[]>(eventKeys.list(), (old) =>
        old?.map((e) =>
          e.id === eventId
            ? { ...e, isLiked: data.liked, likesCount: data.likesCount }
            : e
        ) ?? []
      );
    },
  });
}

export function useEventCommentsQuery(eventId: string | null) {
  return useQuery({
    queryKey: ['eventComments', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<any>>>(`/events/${eventId}/comments`);
      return res.data.data.data ?? [];
    },
  });
}

export function useAddEventCommentMutation(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const res = await apiClient.post<ApiResponse<any>>(`/events/${eventId}/comments`, { content });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventComments', eventId] });
      queryClient.setQueryData<Event[]>(eventKeys.list(), (old) =>
        old?.map((e) => e.id === eventId ? { ...e, commentsCount: (e.commentsCount ?? 0) + 1 } : e) ?? []
      );
    },
  });
}

export function useUpdateEventCommentMutation(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const res = await apiClient.put<ApiResponse<any>>(`/events/${eventId}/comments/${commentId}`, { content });
      return res.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['eventComments', eventId] }),
  });
}

export function useDeleteEventCommentMutation(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      await apiClient.delete(`/events/${eventId}/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventComments', eventId] });
      queryClient.setQueryData<Event[]>(eventKeys.list(), (old) =>
        old?.map((e) => e.id === eventId ? { ...e, commentsCount: Math.max(0, (e.commentsCount ?? 1) - 1) } : e) ?? []
      );
    },
  });
}

export function useShareEventMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await apiClient.post<ApiResponse<{ sharesCount: number }>>(`/events/${eventId}/share`);
      return res.data.data;
    },
    onSuccess: (data, eventId) => {
      queryClient.setQueryData<Event[]>(eventKeys.list(), (old) =>
        old?.map((e) => e.id === eventId ? { ...e, sharesCount: data.sharesCount } : e) ?? []
      );
    },
  });
}

export function useToggleInterestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await apiClient.post<ApiResponse<{ interested: boolean; interestedCount: number }>>(`/events/${eventId}/interest`);
      return res.data.data;
    },
    onSuccess: (data, eventId) => {
      queryClient.setQueryData<Event[]>(eventKeys.list(), (old) =>
        old?.map((e) =>
          e.id === eventId
            ? { ...e, isInterested: data.interested, interestedCount: data.interestedCount }
            : e
        ) ?? []
      );
    },
  });
}

export function useCreateEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      location?: string;
      startsAt: string;
      endsAt?: string;
      coverUrl?: string;
    }) => {
      const res = await apiClient.post<ApiResponse<Event>>('/events', payload, { timeout: 30000 });
      const data = normalizeEvent(res.data.data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.list() });
    },
    onError: () => {
      // Do not create local fallback — pending events must not appear before admin approval
    },
  });
}

export function useEventParticipantsQuery(eventId: string | null) {
  return useQuery({
    queryKey: ['eventParticipants', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      try {
        const res = await apiClient.get<ApiResponse<any>>(`/events/${eventId}/participants`);
        const d = res.data?.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.data)) return d.data;
        return [];
      } catch {
        try {
          const res = await apiClient.get<ApiResponse<any>>(`/events/${eventId}/interested`);
          const d = res.data?.data;
          if (Array.isArray(d)) return d;
          if (Array.isArray(d?.data)) return d.data;
          return [];
        } catch {
          return [];
        }
      }
    },
  });
}
