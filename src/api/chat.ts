import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { Message, Notification, PaginatedResponse, ApiResponse, Conversation } from '../types';
import { useEffect } from 'react';
import { getSocket, onSocketReady } from './socket';
import { useAuthStore } from '../store/authStore';

export const chatKeys = {
  all: ['chats'] as const,
  list: () => [...chatKeys.all, 'list'] as const,
  messages: (chatId: string) => [...chatKeys.all, 'messages', chatId] as const,
  unreadCount: () => [...chatKeys.all, 'unread-count'] as const,
};

// Fetch active chat list
export function useChatsQuery() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  return useQuery<Conversation[]>({
    queryKey: chatKeys.list(),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Conversation[]>>('/messages/conversations');
      const conversations = res.data.data;
      // Inject `participant` helper from the participants array
      return conversations.map((conv) => ({
        ...conv,
        participant:
          conv.participant ??
          conv.participants?.find((p) => p.userId !== currentUserId)?.user,
      }));
    },
  });
}

// Fetch a single conversation by ID (used when navigating directly, e.g. from notifications)
export function useConversationQuery(chatId: string, enabled = true) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  return useQuery<Conversation | null>({
    queryKey: [...chatKeys.all, 'single', chatId],
    enabled: !!chatId && enabled,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Conversation[]>>('/messages/conversations');
      const conv = res.data.data.find((c) => c.id === chatId);
      if (!conv) return null;
      return {
        ...conv,
        participant:
          conv.participant ??
          conv.participants?.find((p) => p.userId !== currentUserId)?.user,
      };
    },
    retry: false,
  });
}

// Fetch messages for a specific chat
export function useMessagesQuery(chatId: string) {
  return useQuery<Message[]>(
    {
      queryKey: chatKeys.messages(chatId),
      enabled: !!chatId,
      queryFn: async () => {
        const res = await apiClient.get<ApiResponse<PaginatedResponse<Message>>>(`/messages/conversations/${chatId}`);
        return res.data.data.data;
      },
    }
  );
}

// Send a message
export function useSendMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation<Message, Error, { chatId: string; content: string }>({
    mutationFn: async ({ chatId, content }) => {
      const res = await apiClient.post<ApiResponse<Message>>(`/messages/conversations/${chatId}`, { content });
      const data = res.data.data;
      return data;
    },
    onMutate: async ({ chatId, content }) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.messages(chatId) });
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        conversationId: chatId,
        content,
        createdAt: new Date().toISOString(),
        senderId: useAuthStore.getState().user?.id ?? '',
      } as any;
      queryClient.setQueryData<Message[]>(chatKeys.messages(chatId), (old) =>
        old ? [optimistic, ...old] : [optimistic]
      );
      return { optimisticId: optimistic.id, chatId };
    },
    onSuccess: (data, { chatId }, context: any) => {
      // Replace optimistic message with real one (socket may have already inserted it)
      queryClient.setQueryData<Message[]>(chatKeys.messages(chatId), (old) => {
        if (!old) return [data];
        const withoutOptimistic = old.filter(m => m.id !== context?.optimisticId);
        if (withoutOptimistic.some(m => m.id === data.id)) return withoutOptimistic;
        return [data, ...withoutOptimistic];
      });
      queryClient.invalidateQueries({ queryKey: chatKeys.list() });
    },
    onError: (_err, { chatId }, context: any) => {
      queryClient.setQueryData<Message[]>(chatKeys.messages(chatId), (old) =>
        old ? old.filter(m => m.id !== context?.optimisticId) : old
      );
    },
  });
}

// Start or get conversation with user
export function useStartConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation<Conversation, Error, { participantId: string }>({
    mutationFn: async ({ participantId }) => {
      const res = await apiClient.post<ApiResponse<Conversation>>('/messages/conversations', { participantId });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.list() });
    },
  });
}
export function useNotificationsQuery() {
  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Notification>>>('/notifications');
      const items = res.data.data.data;
      // Normalize: for LIKE/COMMENT, backend may send the post ID inside
      // metadata, post, or a dedicated postId field. Hoist it to item.postId.
      return items.map((n: any) => ({
        ...n,
        postId:
          n.postId ??
          n.post?.id ??
          n.metadata?.postId ??
          (n.entityType === 'POST' ? n.entityId : undefined),
      }));
    },
  });
}

export function useUnreadCountQuery() {
  return useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
      return res.data.data.count;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useMarkAllReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.put('/notifications/read-all'),
    onSuccess: () => {
      queryClient.setQueryData<number>(['notifications', 'unread-count'], 0);
      queryClient.setQueryData<Notification[]>(['notifications'], (old) =>
        old?.map((notification) => ({ ...notification, isRead: true })) ?? []
      );
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.put(`/notifications/${id}/read`),
    onSuccess: (_data, id) => {
      const notification = queryClient.getQueryData<Notification[]>(['notifications'])?.find((item) => item.id === id);
      if (notification && !notification.isRead) {
        queryClient.setQueryData<number>(['notifications', 'unread-count'], (count) => Math.max(0, (count ?? 1) - 1));
      }
      queryClient.setQueryData<Notification[]>(['notifications'], (old) =>
        old?.map((item) => item.id === id ? { ...item, isRead: true } : item) ?? []
      );
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Listen to real-time notifications
export function useNotificationSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNew = (notification: any) => {
      // Normalize postId same as REST query
      const normalized = {
        ...notification,
        postId:
          notification.postId ??
          notification.post?.id ??
          notification.metadata?.postId ??
          (notification.entityType === 'POST' ? notification.entityId : undefined),
      };
      queryClient.setQueryData<Notification[]>(['notifications'], (old) => {
        if (!old) return [normalized];
        if (old.some((n) => n.id === normalized.id)) return old;
        return [normalized, ...old];
      });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      // Moderation notifications change data shown on the home, event, and
      // community screens. Invalidate those caches immediately instead of
      // waiting for a restart or their periodic refresh.
      if (['EVENT_APPROVED', 'EVENT_REJECTED'].includes(normalized.type)) {
        queryClient.invalidateQueries({ queryKey: ['events'] });
      }
      if (['COMMUNITY_APPROVED', 'COMMUNITY_REJECTED'].includes(normalized.type)) {
        queryClient.invalidateQueries({ queryKey: ['communities'] });
        queryClient.invalidateQueries({ queryKey: ['communities', 'my-requests'] });
      }
    };

    socket.on('notification:new', handleNew);
    return () => { socket.off('notification:new', handleNew); };
  }, [queryClient]);
}

// Fetch total unread chat message count
export function useUnreadChatCountQuery() {
  return useQuery<number>({
    queryKey: chatKeys.unreadCount(),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<{ count: number }>>('/messages/unread-count');
      return res.data.data.count;
    },
    staleTime: 30_000,
  });
}

// Mark all messages in a conversation as read
export function useMarkConversationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      try {
        await apiClient.put(`/messages/conversations/${conversationId}/read`);
      } catch (err: any) {
        // Silently ignore 403/404 — backend may restrict this endpoint
        // but we still apply the optimistic update locally
        const status = err?.response?.status;
        if (status !== 403 && status !== 404) throw err;
      }
    },
    onMutate: async (conversationId: string) => {
      // Optimistically zero out unread count immediately
      queryClient.setQueryData<Conversation[]>(chatKeys.list(), (old) => {
        if (!old) return old;
        return old.map(conv =>
          conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
        );
      });
      // Optimistically decrement global unread chat count
      const conv = queryClient.getQueryData<Conversation[]>(chatKeys.list())?.find(c => c.id === conversationId);
      const wasUnread = conv?.unreadCount ?? 0;
      if (wasUnread > 0) {
        queryClient.setQueryData<number>(chatKeys.unreadCount(), (old) =>
          Math.max(0, (old ?? 0) - wasUnread)
        );
      }
    },
    onSuccess: (_data, conversationId) => {
      queryClient.setQueryData<Conversation[]>(chatKeys.list(), (old) => {
        if (!old) return old;
        return old.map(conv =>
          conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
        );
      });
      queryClient.invalidateQueries({ queryKey: chatKeys.unreadCount() });
    },
  });
}

// Listen to real-time chat messages
export function useChatSocket(conversationId?: string) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    const handleNewMessage = (payload: any) => {
      const message: Message = payload?.message ?? payload;

      if (conversationId && message.conversationId === conversationId) {
        queryClient.setQueryData<Message[]>(chatKeys.messages(conversationId), (old) => {
          if (!old) return [message];
          if (old.some(m => m.id === message.id)) return old;
          return [message, ...old];
        });
      }

      queryClient.setQueryData<Conversation[]>(chatKeys.list(), (old) => {
        if (!old) return old;
        return old.map(conv => {
          if (conv.id === message.conversationId) {
            // Only increment unreadCount if the message is from someone else
            // and we're not currently viewing that conversation
            const isFromOther = message.senderId !== currentUserId;
            const isActiveConv = conv.id === conversationId;
            const newUnread = isFromOther && !isActiveConv
              ? (conv.unreadCount || 0) + 1
              : conv.unreadCount;
            return { ...conv, lastMessage: message, lastMessageAt: message.createdAt, unreadCount: newUnread };
          }
          return conv;
        }).sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
      });

      // Update global unread count if message is from someone else and not in active conv
      if (message.senderId !== currentUserId && message.conversationId !== conversationId) {
        queryClient.setQueryData<number>(chatKeys.unreadCount(), (old) => (old ?? 0) + 1);
      }
    };

    const handleUnreadCount = (payload: { count: number }) => {
      queryClient.setQueryData<number>(chatKeys.unreadCount(), payload.count);
    };

    const updatePresence = (payload: { userId: string; lastSeenAt?: string | null }, isOnline: boolean) => {
      queryClient.setQueryData<Conversation[]>(chatKeys.list(), (old) => {
        if (!old) return old;
        return old.map((conversation) => ({
          ...conversation,
          participants: conversation.participants.map((participant) =>
            participant.userId === payload.userId
              ? { ...participant, user: { ...participant.user, isOnline, lastSeenAt: isOnline ? null : payload.lastSeenAt ?? new Date().toISOString() } }
              : participant,
          ),
          participant: conversation.participant?.id === payload.userId
            ? { ...conversation.participant, isOnline, lastSeenAt: isOnline ? null : payload.lastSeenAt ?? new Date().toISOString() }
            : conversation.participant,
        }));
      });
    };

    // Subscribe immediately if socket is already connected, otherwise wait
    const subscribe = (s: ReturnType<typeof getSocket>) => {
      if (!s) return;
      s.off('chat:message', handleNewMessage);
      s.on('chat:message', handleNewMessage);
      s.off('chat:unread_count', handleUnreadCount);
      s.on('chat:unread_count', handleUnreadCount);
      s.off('presence:online', handlePresenceOnline);
      s.on('presence:online', handlePresenceOnline);
      s.off('presence:offline', handlePresenceOffline);
      s.on('presence:offline', handlePresenceOffline);
    };

    const handlePresenceOnline = (payload: { userId: string }) => updatePresence(payload, true);
    const handlePresenceOffline = (payload: { userId: string; lastSeenAt?: string }) => updatePresence(payload, false);

    subscribe(getSocket());
    const unsub = onSocketReady(subscribe);

    return () => {
      unsub();
      getSocket()?.off('chat:message', handleNewMessage);
      getSocket()?.off('chat:unread_count', handleUnreadCount);
      getSocket()?.off('presence:online', handlePresenceOnline);
      getSocket()?.off('presence:offline', handlePresenceOffline);
    };
  }, [conversationId, queryClient, currentUserId]);
}
