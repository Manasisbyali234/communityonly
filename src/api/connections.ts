import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { useEffect } from 'react';
import { getSocket } from './socket';
import { useAuthStore } from '../store/authStore';

export type ConnectionStatus = 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED';

export interface ConnectionRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  sender?: { id: string; displayName: string; avatarUrl?: string; username: string; bio?: string };
}

export const connKeys = {
  status: (userId: string) => ['connections', 'status', userId] as const,
  count: (userId: string) => ['connections', 'count', userId] as const,
  list: (userId: string) => ['connections', 'list', userId] as const,
  pending: () => ['connections', 'pending'] as const,
};

export function useConnectionStatusQuery(targetUserId: string, currentUserId?: string) {
  return useQuery<ConnectionStatus>({
    queryKey: connKeys.status(targetUserId),
    queryFn: async () => {
      const res = await apiClient.get(`/connections/${targetUserId}/status`);
      const req = res.data.data as ConnectionRequest | null;
      if (!req) return 'NONE';
      if (req.status === 'ACCEPTED') return 'ACCEPTED';
      if (req.status === 'PENDING') {
        return req.senderId === currentUserId ? 'PENDING_SENT' : 'PENDING_RECEIVED';
      }
      return 'NONE';
    },
    enabled: !!targetUserId && !!currentUserId && targetUserId !== currentUserId,
    staleTime: 30000,
  });
}

export function useConnectionCountQuery(userId: string) {
  return useQuery<number>({
    queryKey: connKeys.count(userId),
    queryFn: async () => {
      const res = await apiClient.get(`/connections/${userId}/connections/count`);
      return res.data.data.count as number;
    },
    enabled: !!userId,
  });
}

export function useMyConnectionCountQuery(userId: string) {
  return useQuery<number>({
    queryKey: connKeys.count(userId),
    queryFn: async () => {
      const res = await apiClient.get(`/connections/me/connections/count`);
      return res.data.data.count as number;
    },
    enabled: !!userId,
  });
}

export function useConnectionsListQuery(userId: string) {
  return useQuery({
    queryKey: connKeys.list(userId),
    queryFn: async () => {
      const res = await apiClient.get(`/connections/${userId}/connections`);
      return res.data.data as any[];
    },
    enabled: !!userId,
  });
}

export function usePendingRequestsQuery() {
  return useQuery<ConnectionRequest[]>({
    queryKey: connKeys.pending(),
    queryFn: async () => {
      const res = await apiClient.get('/connections/me/pending');
      return res.data.data;
    },
  });
}

export function useSendConnectionRequestMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiClient.post(`/connections/${userId}/request`),
    onSuccess: (_data, userId) => {
      qc.setQueryData<ConnectionStatus>(connKeys.status(userId), 'PENDING_SENT');
    },
  });
}

export function useAcceptConnectionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => apiClient.post(`/connections/requests/${requestId}/accept`),
    onSuccess: (_data, requestId) => {
      qc.invalidateQueries({ queryKey: ['connections'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRejectConnectionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => apiClient.post(`/connections/requests/${requestId}/reject`),
    onSuccess: (_data, requestId) => {
      qc.invalidateQueries({ queryKey: ['connections', 'pending'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Real-time: listen for connection_accepted to refresh counts
export function useConnectionSocket(myUserId?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !myUserId) return;

    const handleAccepted = () => {
      qc.invalidateQueries({ queryKey: connKeys.count(myUserId) });
      qc.invalidateQueries({ queryKey: connKeys.list(myUserId) });
    };

    socket.on('connection:accepted', handleAccepted);
    return () => { socket.off('connection:accepted', handleAccepted); };
  }, [myUserId, qc]);
}
