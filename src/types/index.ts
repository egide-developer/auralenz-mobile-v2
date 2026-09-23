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
  isOnline?: boolean;
  hasStory?: boolean;
  hasUnviewedStory?: boolean;
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
  aspectRatio?: number;
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
  user: UserPreview;
  lastMessage: LastMessage | null;
  unreadCount: number;
}

export interface LastMessage {
  text: string;
  messageType: "text" | "image" | "audio" | "file";
  senderId: string;
  senderName: string;
  messageId: string;
  isDeleted: boolean;
  timestamp: string;
}

export interface MessageReadEntry {
  user: string;
  readAt: string;
}

export interface MessageReplyPreview {
  id?: string;
  _id?: string;
  text?: string;
  isDeleted?: boolean;
  sender?: { username?: string };
}

export interface MessageFile {
  url: string;
  mimeType?: string;
  originalName?: string;
  size?: number;
}

export interface Message {
  id: string;
  conversationId?: string;
  groupId?: string;
  senderId: string;
  sender: UserPreview;
  text: string;
  images: string[];
  audioUrl?: string | null;
  audioDuration?: number | null;
  files?: MessageFile[];
  messageType: "text" | "image" | "audio" | "file";
  reactions: { emoji: string; users: string[] }[];
  readBy: MessageReadEntry[];
  isDeleted: boolean;
  createdAt: string;
  replyTo?: MessageReplyPreview | null;
  /** Client-generated id used as a stable list key across the optimistic → confirmed transition. */
  clientId?: string;
  /** True while an optimistically-added message is still in flight to the server. */
  pending?: boolean;
  failed?: boolean;
}

export interface GroupParticipant {
  id: string;
  username: string;
  avatarUrl?: string;
  isOnline?: boolean;
  role: "admin" | "member";
}

export interface ChatGroup {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  createdBy?: string;
  participants: GroupParticipant[];
  lastMessage: LastMessage | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
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

export interface HighlightSummary {
  id: string;
  title: string;
  coverImage?: string;
  itemCount: number;
  createdAt: string;
}

export interface HighlightItem {
  _id: string;
  storyId?: string;
  media: { url: string; type: "image" | "video"; thumbnail?: string };
  text?: string;
  originalCreatedAt: string;
}

export interface Highlight {
  _id: string;
  title: string;
  coverImage?: string;
  owner: UserPreview;
  items: HighlightItem[];
}

export interface AppNotification {
  id: string;
  _id?: string;
  type:
    | "like"
    | "comment"
    | "follow"
    | "mention"
    | "reply"
    | "story_view"
    | "message"
    | "group_invite"
    | "group_join"
    | "story_reply";
  sender: UserPreview;
  post?: { id: string; caption?: string; media?: PostMedia[] };
  comment?: { id: string; text?: string };
  story?: { id: string };
  message?: { id: string; text?: string };
  group?: { id: string; name?: string };
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
