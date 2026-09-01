import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { apiClient, API_BASE_URL } from './client';
import { ApiResponse } from '../types';
import { useAuthStore } from '../store/authStore';

export const storyKeys = {
  all: ['stories'] as const,
  feed: () => [...storyKeys.all, 'feed'] as const,
};

export interface StoryAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Story {
  id: string;
  authorId: string;
  author: StoryAuthor;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  expiresAt: string;
  createdAt: string;
  viewCount: number;
  likesCount: number;
}

export interface StoryGroup {
  user: StoryAuthor;
  stories: Story[];
  hasUnseen: boolean;
}

export function useStoryByIdQuery(id: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Story>({
    queryKey: [...storyKeys.all, 'single', id],
    enabled: isAuthenticated && !!id,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Story>>(`/stories/${id}`);
      return res.data.data;
    },
    staleTime: 0,
  });
}

export function useStoriesFeedQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<StoryGroup[]>({
    queryKey: storyKeys.feed(),
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<StoryGroup[]>>('/stories/feed');
      const now = new Date();
      return (res.data.data ?? [])
        .map((group) => ({
          ...group,
          stories: group.stories
            .filter((s) => new Date(s.expiresAt) > now)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        }))
        .filter((group) => group.stories.length > 0)
        .sort((a, b) => new Date(b.stories[0].createdAt).getTime() - new Date(a.stories[0].createdAt).getTime());
    },
    staleTime: 0,
    refetchInterval: 60_000, // re-check every 60s to drop newly expired stories
  });
}

export function useCreateStoryMutation() {
  const queryClient = useQueryClient();
  return useMutation<Story, Error, { mediaUrl: string; mediaType: 'IMAGE' | 'VIDEO' }>({
    mutationFn: async ({ mediaUrl, mediaType }) => {
      const res = await apiClient.post<ApiResponse<Story>>('/stories', { mediaUrl, mediaType });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storyKeys.all });
      queryClient.refetchQueries({ queryKey: storyKeys.feed() });
    },
  });
}

export function useUpdateStoryMutation() {
  const queryClient = useQueryClient();
  return useMutation<Story, Error, { id: string; mediaUrl?: string; mediaType?: 'IMAGE' | 'VIDEO' }>({
    mutationFn: async ({ id, ...payload }) => {
      const res = await apiClient.patch<ApiResponse<Story>>(`/stories/${id}`, payload);
      return res.data.data;
    },
    onSuccess: (story) => {
      queryClient.setQueryData([...storyKeys.all, 'single', story.id], story);
      queryClient.invalidateQueries({ queryKey: storyKeys.feed() });
    },
  });
}

export function useDeleteStoryMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => { await apiClient.delete(`/stories/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storyKeys.all }),
  });
}

// ─── Story-specific S3 upload (stories/ folder only) ─────────────────────────
export async function uploadMediaFile(
  file: File | Blob | { uri: string; name: string; type: string },
  filename: string,
  mimeType: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const token = useAuthStore.getState().token;
  const url = `${API_BASE_URL}/story-upload/upload`;

  // Native: use XHR (handles file:// URIs from camera correctly)
  if (Platform.OS !== 'web') {
    const nativeFile = file as { uri: string; name?: string; type?: string };
    const formData = new FormData();
    formData.append('file', {
      uri: nativeFile.uri,
      name: nativeFile.name ?? filename,
      type: nativeFile.type ?? mimeType,
    } as any);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      xhr.timeout = 60_000;
      xhr.setRequestHeader('Accept', 'application/json');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText);
            const mediaUrl: string = json?.data?.url;
            if (!mediaUrl) reject(new Error('No URL in upload response'));
            else { onProgress?.(100); resolve(mediaUrl); }
          } catch {
            reject(new Error('Invalid upload response'));
          }
        } else {
          let msg = `Upload failed: ${xhr.status}`;
          try {
            const json = JSON.parse(xhr.responseText);
            if (json?.message) msg = json.message;
          } catch {}
          reject(new Error(msg));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.ontimeout = () => reject(new Error('Upload timed out. Check your connection and try again.'));
      xhr.send(formData);
    });
  }

  // Web: use XHR for progress tracking
  const formData = new FormData();
  formData.append('file', file as File | Blob, filename);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.timeout = 60_000;
    xhr.setRequestHeader('Accept', 'application/json');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText);
          const mediaUrl: string = json?.data?.url;
          if (!mediaUrl) reject(new Error('No URL in upload response'));
          else resolve(mediaUrl);
        } catch {
          reject(new Error('Invalid upload response'));
        }
      } else {
        let msg = `Upload failed: ${xhr.status} ${xhr.statusText}`;
        try {
          const json = JSON.parse(xhr.responseText);
          if (json?.message) msg = json.message;
          else if (json?.errors?.[0]?.message) msg = json.errors[0].message;
        } catch {}
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out. Check your connection and try again.'));
    xhr.send(formData);
  });
}
