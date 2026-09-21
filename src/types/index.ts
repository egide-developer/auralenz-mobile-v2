export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  role: "user" | "admin";
  isVerified: boolean;
  isPrivate: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
}

export interface UserPreview {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isVerified: boolean;
}

export interface Post {
  id: string;
  userId: string;
  author: UserPreview;
  caption?: string;
  media: PostMedia[];
  tags: string[];
  location?: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
}

export interface PostMedia {
  id: string;
  url: string;
  type: "image" | "video" | "audio";
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  duration?: number;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  author: UserPreview;
  content: string;
  text: string;
  likesCount: number;
  isLiked: boolean;
  replies?: Comment[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  name?: string;
  avatarUrl?: string;
  participants: Participant[];
  lastMessage?: LastMessage;
  unreadCount: number;
  createdAt: string;
}

export interface Participant {
  userId: string;
  user: UserPreview;
  role?: "admin" | "member";
  joinedAt: string;
}

export interface LastMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: UserPreview;
  content: string;
  type: "text" | "image" | "audio" | "link" | "system";
  mediaUrl?: string;
  linkPreview?: LinkPreview;
  reactions: Record<string, string[]>;
  readBy: string[];
  createdAt: string;
}

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  favicon?: string;
}

export interface StoryGroup {
  userId: string;
  user: UserPreview;
  stories: Story[];
  hasUnviewed: boolean;
}

export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  type: "image" | "video";
  caption?: string;
  viewsCount: number;
  reactions: StoryReaction[];
  createdAt: string;
}

export interface StoryReaction {
  userId: string;
  emoji: string;
}

export interface AppNotification {
  id: string;
  type: "like" | "comment" | "follow" | "message" | "story_view" | "group_invite" | "mention";
  actor: UserPreview;
  targetId?: string;
  targetType?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  itemsCount: number;
  isShared: boolean;
  shareId?: string;
  createdAt: string;
}

export interface LibraryAsset {
  id: string;
  url: string;
  type: "image" | "video" | "audio";
  filename: string;
  size: number;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
