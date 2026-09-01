import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import { getApiBaseUrl } from './config';
import { Post, Comment, User, PaginatedResponse, ApiResponse } from '../types';
import { useAuthStore } from '../store/authStore';

const getBase = () => getApiBaseUrl().replace('/api/v1', '');

const toAbs = (url?: string): string | undefined => {
  if (!url) return undefined;
  // Relative path → prepend backend base
  if (url.startsWith('/')) return `${getBase()}${url}`;
  // Proxy URL with a stale host → rewrite to current server
  if (url.includes('/api/v1/media/proxy/')) {
    try {
      const parsed = new URL(url);
      return `${getBase()}${parsed.pathname}${parsed.search}`;
    } catch (_) { return url; }
  }
  // S3 direct URL → rewrite through backend media proxy
  const s3Match = url.match(/https?:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)/);
  if (s3Match) return `${getBase()}/api/v1/media/proxy/${encodeURIComponent(s3Match[1])}`;
  // localhost URL → rewrite to current dynamic host
  if (url.includes('localhost')) return url.replace(/http:\/\/localhost(:\d+)?/, getBase());
  return url;
};

export const feedKeys = {
  all: ['feed'] as const,
  posts: () => [...feedKeys.all, 'posts'] as const,
  communityPosts: (communityId: string) => [...feedKeys.posts(), { communityId }] as const,
  userPosts: (userId: string) => [...feedKeys.posts(), { userId }] as const,
  savedPosts: () => [...feedKeys.posts(), 'saved'] as const,
  post: (id: string) => [...feedKeys.all, 'post', id] as const,
  comments: (postId: string) => [...feedKeys.all, 'comments', postId] as const,
};

export const userKeys = {
  all: ['users'] as const,
  user: (id: string) => [...userKeys.all, id] as const,
};

export function useUserQuery(userId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<User | null>({
    queryKey: userKeys.user(userId),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<User>>(`/users/${userId}`);
      return res.data.data;
    },
    enabled: !!userId && isAuthenticated,
  });
}


function normalizePost(p: any): Post {
  const rawUrls: string[] = p.mediaUrls ?? [];
  const absUrls = rawUrls.map((u: string) => toAbs(u) ?? u);
  if (rawUrls.length > 0 || p.mediaUrl || p.videoUrl) {
    console.log('[normalizePost] id:', p.id,
      '| raw mediaUrls:', rawUrls,
      '| raw mediaUrl:', p.mediaUrl,
      '| raw videoUrl:', p.videoUrl,
      '| absUrls:', absUrls,
      '| resolved mediaUrl:', toAbs(p.mediaUrl) ?? absUrls[0],
    );
  }
  return {
    ...p,
    author: {
      ...p.author,
      avatarUrl: toAbs(p.author?.avatarUrl) ?? p.author?.avatarUrl,
    },
    mediaUrls: absUrls,
    mediaUrl: toAbs(p.mediaUrl) ?? absUrls[0] ?? undefined,
    images: absUrls.length > 1 ? absUrls : (p.images?.map((u: string) => toAbs(u) ?? u) ?? undefined),
    videoUrl: toAbs(p.videoUrl) ?? p.videoUrl ?? undefined,
    tags: p.tags ?? p.hashtags?.map((h: any) => h.hashtag?.name ?? h.name) ?? [],
    isLiked: typeof p.isLiked === 'boolean' ? p.isLiked : (p.liked ?? false),
    likesCount: p.likesCount ?? p.likes_count ?? p._count?.likes ?? 0,
    isBookmarked: p.isBookmarked ?? (p.bookmarks?.length > 0),
    community: p.community
      ? {
          ...p.community,
          avatarUrl: toAbs(p.community.avatarUrl) ?? p.community.avatarUrl,
          bannerUrl: toAbs(p.community.bannerUrl) ?? p.community.bannerUrl,
          membersCount: p.community.membersCount ?? p.community.memberCount ?? 0,
          isJoined: p.community.isJoined ?? false,
        }
      : undefined,
  };
}

// Fetch all feed posts — falls back to trending if personal feed is empty
export function usePostsQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Post[]>({
    queryKey: feedKeys.posts(),
    enabled: isAuthenticated,
    staleTime: 0,
    queryFn: async () => {
      const [feedRes, trendingRes] = await Promise.all([
        apiClient.get<ApiResponse<PaginatedResponse<Post>>>('/posts/feed'),
        apiClient.get<ApiResponse<PaginatedResponse<Post>>>('/posts/trending'),
      ]);
      const feedPosts: any[] = feedRes.data.data.data ?? [];
      if (feedPosts.length > 0) return feedPosts.map(normalizePost);
      return (trendingRes.data.data.data ?? []).map(normalizePost);
    },
  });
}

// Fetch a single post
export function usePostQuery(postId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Post | null, { status?: number; message?: string }>({
    queryKey: feedKeys.post(postId),
    queryFn: async () => {
      try {
        const res = await apiClient.get<ApiResponse<Post>>(`/posts/${postId}`);
        if (!res.data?.data) throw { status: 404, message: 'Post not found' };
        return normalizePost(res.data.data);
      } catch (err: any) {
        const status = err?.response?.status ?? err?.status;
        const message = err?.response?.data?.message ?? err?.message ?? 'Unknown error';
        throw { status, message };
      }
    },
    enabled: !!postId && isAuthenticated,
    retry: (failureCount, err: any) => err?.status !== 404 && failureCount < 2,
  });
}

// Fetch posts within a specific community
export function useCommunityPostsQuery(communityId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Post[]>({
    queryKey: feedKeys.communityPosts(communityId),
    enabled: !!communityId && isAuthenticated,
    staleTime: 0,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Post>>>(`/communities/${communityId}/posts`);
      return (res.data.data.data ?? []).map(normalizePost).filter((p: any) => !p.status || p.status === 'APPROVED');
    },
  });
}

// Fetch posts by a user
export function useUserPostsQuery(userId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Post[]>({
    queryKey: feedKeys.userPosts(userId),
    enabled: !!userId && isAuthenticated,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Post>>>(`/users/${userId}/posts`);
      return (res.data.data.data ?? []).map(normalizePost);
    },
  });
}

// Fetch saved posts
export function useSavedPostsQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Post[]>({
    queryKey: feedKeys.savedPosts(),
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<PaginatedResponse<Post>>>('/posts/saved');
      return res.data.data.data;
    },
  });
}

// Create a post
export function useCreatePostMutation() {
  const queryClient = useQueryClient();
  return useMutation<Post, Error, { content: string; communityId?: string; mediaType?: string; mediaUrl?: string; videoUrl?: string; videoFileName?: string; mimeType?: string; fileSize?: number; tags?: string[] }>({
    mutationFn: async (newPost) => {
      const res = await apiClient.post<ApiResponse<Post>>('/posts', {
        content: newPost.content || '',
        communityId: newPost.communityId || undefined,
        mediaUrls: newPost.mediaUrl ? [newPost.mediaUrl] : undefined,
        mediaType: newPost.mediaType,
        videoUrl: newPost.videoUrl || undefined,
        videoFileName: newPost.videoFileName || undefined,
        mimeType: newPost.mimeType || undefined,
        fileSize: newPost.fileSize || undefined,
        tags: newPost.tags,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.posts() });
    },
  });
}

// Like post mutation
export function useLikePostMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (postId) => {
      // Determine current like state from cache to call the right endpoint
      const allPosts = queryClient.getQueryData<Post[]>(feedKeys.posts());
      const cached = allPosts?.find((p) => p.id === postId)
        ?? queryClient.getQueryData<Post | null>(feedKeys.post(postId));
      const currentlyLiked = cached?.isLiked ?? false;
      if (currentlyLiked) {
        await apiClient.delete(`/posts/${postId}/like`);
      } else {
        await apiClient.post(`/posts/${postId}/like`);
      }
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.posts() });
      await queryClient.cancelQueries({ queryKey: feedKeys.post(postId) });

      const prevPosts = queryClient.getQueryData<Post[]>(feedKeys.posts());
      const prevPost = queryClient.getQueryData<Post | null>(feedKeys.post(postId));

      const toggle = (p: Post): Post => ({
        ...p,
        isLiked: !p.isLiked,
        likesCount: p.isLiked ? Math.max(0, p.likesCount - 1) : p.likesCount + 1,
      });

      queryClient.setQueryData<Post[]>(feedKeys.posts(), (old) =>
        old?.map((p) => p.id === postId ? toggle(p) : p)
      );
      queryClient.setQueryData<Post | null>(feedKeys.post(postId), (old) =>
        old ? toggle(old) : old
      );
      queryClient.getQueriesData<Post[]>({ queryKey: feedKeys.posts() }).forEach(([key, data]) => {
        if (Array.isArray(data)) {
          queryClient.setQueryData<Post[]>(key, data.map((p) => p.id === postId ? toggle(p) : p));
        }
      });

      return { prevPosts, prevPost };
    },
    onError: (_err, postId, ctx: any) => {
      if (ctx?.prevPosts) queryClient.setQueryData(feedKeys.posts(), ctx.prevPosts);
      if (ctx?.prevPost !== undefined) queryClient.setQueryData(feedKeys.post(postId), ctx.prevPost);
    },
    onSettled: (_, __, postId) => {
      queryClient.invalidateQueries({ queryKey: feedKeys.post(postId) });
    },
  });
}

// Bookmark/Save post mutation
export function useSavePostMutation() {
  const queryClient = useQueryClient();
  return useMutation<Post | null, Error, string>({
    mutationFn: async (postId) => {
      const res = await apiClient.post<ApiResponse<Post>>(`/posts/${postId}/bookmark`);
      return res.data.data;
    },
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.posts() });
      const prev = queryClient.getQueryData<Post[]>(feedKeys.posts());
      queryClient.setQueryData<Post[]>(feedKeys.posts(), (old) =>
        old?.map((p) => p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p)
      );
      return { prev };
    },
    onError: (_err, _id, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(feedKeys.posts(), ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.posts() });
    },
  });
}

// Fetch comments for a post
export function usePostCommentsQuery(postId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Comment[]>({
    queryKey: feedKeys.comments(postId),
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Comment[] | PaginatedResponse<Comment>>>(`/posts/${postId}/comments`);
      const payload = res.data.data;
      // Handle both paginated { data: [...] } and direct array responses
      return Array.isArray(payload) ? payload : (payload as PaginatedResponse<Comment>).data ?? [];
    },
    enabled: !!postId && isAuthenticated,
  });
}

// Delete a post
export function useDeletePostMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (postId) => {
      await apiClient.delete(`/posts/${postId}`);
    },
    onSuccess: (_data, postId) => {
      // A post can be visible in the main feed, a profile, a community, or saved posts.
      // Remove it from every cached post list immediately rather than waiting for a refetch.
      queryClient.getQueriesData<Post[]>({ queryKey: feedKeys.posts() }).forEach(([key, data]) => {
        if (Array.isArray(data)) {
          queryClient.setQueryData<Post[]>(key, data.filter((p) => p.id !== postId));
        }
      });
      queryClient.setQueryData(feedKeys.post(postId), null);
      queryClient.invalidateQueries({ queryKey: feedKeys.posts() });
    },
  });
}

// Delete a comment
export function useDeleteCommentMutation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (commentId) => {
      await apiClient.delete(`/posts/comments/${commentId}`);
    },
    onSuccess: (_data, commentId) => {
      // Remove the comment from all cached comment lists
      queryClient.getQueriesData<Comment[]>({ queryKey: [...feedKeys.all, 'comments'] }).forEach(([key, data]) => {
        if (Array.isArray(data)) {
          queryClient.setQueryData<Comment[]>(key, data.filter((c) => c.id !== commentId));
        }
      });
      queryClient.invalidateQueries({ queryKey: feedKeys.posts() });
    },
  });
}

// Toggle a comment like
export function useLikeCommentMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    { isLiked: boolean; likesCount: number },
    Error,
    { postId: string; commentId: string },
    { previousComments: Comment[] | undefined }
  >({
    mutationFn: async ({ postId, commentId }) => {
      const res = await apiClient.post<ApiResponse<{ isLiked: boolean; likesCount: number }>>(`/posts/${postId}/comments/${commentId}/like`);
      return res.data.data;
    },
    onMutate: async ({ postId, commentId }) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.comments(postId) });
      const previousComments = queryClient.getQueryData<Comment[]>(feedKeys.comments(postId));
      queryClient.setQueryData<Comment[]>(feedKeys.comments(postId), (old) => old?.map((comment) =>
        comment.id === commentId
          ? { ...comment, isLiked: !comment.isLiked, likesCount: Math.max(0, comment.likesCount + (comment.isLiked ? -1 : 1)) }
          : comment,
      ));
      return { previousComments };
    },
    onError: (_error, { postId }, context) => {
      if (context?.previousComments) queryClient.setQueryData(feedKeys.comments(postId), context.previousComments);
    },
    onSuccess: (result, { postId, commentId }) => {
      queryClient.setQueryData<Comment[]>(feedKeys.comments(postId), (old) => old?.map((comment) =>
        comment.id === commentId ? { ...comment, ...result } : comment,
      ));
    },
  });
}

// Add comment to a post
export function useAddCommentMutation() {
  const queryClient = useQueryClient();
  return useMutation<Comment, Error, { postId: string; content: string }>({
    mutationFn: async ({ postId, content }) => {
      const res = await apiClient.post<ApiResponse<Comment>>(`/posts/${postId}/comments`, { content });
      return res.data.data;
    },
    onMutate: async ({ postId, content }) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.comments(postId) });
      const prevComments = queryClient.getQueryData<Comment[]>(feedKeys.comments(postId));
      const { user } = useAuthStore.getState();
      if (user) {
        const optimistic: Comment = {
          id: `temp-${Date.now()}`,
          postId,
          authorId: user.id,
          author: user as User,
          content,
          likesCount: 0,
          isLiked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        queryClient.setQueryData<Comment[]>(feedKeys.comments(postId), (old = []) => [optimistic, ...old]);
        // Optimistically bump commentsCount on the post
        queryClient.setQueryData<Post[]>(feedKeys.posts(), (old) =>
          old?.map((p) => p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p)
        );
      }
      return { prevComments };
    },
    onError: (_err, { postId }, ctx: any) => {
      if (ctx?.prevComments) queryClient.setQueryData(feedKeys.comments(postId), ctx.prevComments);
    },
    onSuccess: (data, { postId }) => {
      // Replace optimistic entry with real server data
      queryClient.setQueryData<Comment[]>(feedKeys.comments(postId), (old = []) =>
        old.map((c) => c.id.startsWith('temp-') ? data : c)
      );
      queryClient.invalidateQueries({ queryKey: feedKeys.posts() });
      queryClient.invalidateQueries({ queryKey: feedKeys.post(postId) });
    },
  });
}
