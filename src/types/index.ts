export interface User {
  id: string;
  email?: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bannerUrl?: string;
  coverImage?: string;
  bio?: string;
  role?: 'USER' | 'MODERATOR' | 'ADMIN';
  isVerified?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  followersCount?: number;
  followingCount?: number;
  communitiesCount?: number;
  helpCount?: number;
  attendedEventCount?: number;
  joinedAt?: string;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  village?: string;
  occupation?: string;
  languages?: string;
  interests?: string;
  phone?: string;
  phoneNumber?: string;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  category: string;
  isPrivate: boolean;
  memberCount: number;
  membersCount?: number; // Alias
  rules?: Array<string | { title: string; description?: string; id?: string; order?: number }>;
  feedPostPrompts?: string[];
  createdAt: string;
  updatedAt: string;
  isJoined?: boolean; // Injected by backend serializers
  role?: 'MEMBER' | 'MODERATOR' | 'ADMIN'; // Injected by backend serializers
}

export interface Post {
  id: string;
  authorId: string;
  author: User;
  communityId?: string;
  community?: Community;
  content: string;
  mediaUrls: string[];
  mediaUrl?: string; // Alias
  images?: string[]; // Alias
  tags?: string[];
  mediaType?: 'IMAGE' | 'VIDEO' | 'video' | 'image';
  videoUrl?: string;
  videoFileName?: string;
  mimeType?: string;
  fileSize?: number;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean; // Injected by backend serializers
  isBookmarked?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: User;
  parentId?: string;
  content: string;
  likesCount: number;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: User; // Optional based on include
  content?: string;
  mediaUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  readAt?: string;
  createdAt: string;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  user: User;
  lastReadAt?: string;
}

export interface Conversation {
  id: string;
  lastMessageAt?: string;
  createdAt: string;
  participants: ConversationParticipant[];
  messages?: Message[];
  // Frontend helpers typically injected
  participant?: User;
  unreadCount?: number;
  lastMessage?: Message;
}

export interface Event {
  id: string;
  communityId?: string;
  community?: Community;
  creatorId: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: string;
  endsAt?: string;
  coverUrl?: string;
  rsvpCount: number;
  interestedCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isInterested?: boolean;
  isLiked?: boolean;
  createdAt: string;
  updatedAt: string;
  userRsvpStatus?: 'GOING' | 'MAYBE' | 'NOT_GOING';
}

export interface Notification {
  id: string;
  recipientId: string;
  type: 'LIKE' | 'COMMENT' | 'FOLLOW' | 'COMMUNITY_JOIN' | 'EVENT_REMINDER' | 'MENTION' | 'MESSAGE' | 'CONNECTION_REQUEST' | 'CONNECTION_ACCEPTED' | 'EVENT_INTERESTED' | 'EVENT_LIKE' | 'EVENT_COMMENT';
  actorId?: string;
  entityId?: string;
  entityType?: string;
  postId?: string;      // present on LIKE/COMMENT notifications — the actual post ID
  commentId?: string;   // present on COMMENT notifications
  body?: string;
  isRead: boolean;
  createdAt: string;
  actor?: User;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    nextCursor?: string;
    [key: string]: any;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    nextCursor?: string;
  };
}
