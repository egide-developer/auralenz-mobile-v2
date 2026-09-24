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
  collaborators?: UserPreview[];
  remixOf?: string;
  remixSource?: UserPreview | null;
  isRemix?: boolean;
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

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
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
  editedAt?: string | null;
  /** Previous revisions, newest last. Populated by the backend on each edit. */
  editHistory?: { text: string; editedAt: string }[];
  replyTo?: MessageReplyPreview | null;
  /** Unfurled server-side after the send, so it arrives via message_updated rather than in the send response. */
  linkPreview?: LinkPreview | null;
  /** Burn-after-reading. The body is blanked for recipients until they open it. */
  viewOnce?: boolean;
  /** Whether this viewer has already spent their single view. */
  viewOnceOpened?: boolean;
  viewOnceConsumedAt?: string | null;
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

export interface StoryGroup {
  userId: string;
  user: UserPreview;
  stories: Story[];
  hasUnviewed: boolean;
}

/** A 24-hour text-only status. One active note per author; `.mine` is the viewer's own note (if any). */
export interface NoteEntry {
  _id: string;
  id: string;
  author: UserPreview;
  text: string;
  visibility: "public" | "followers" | "close_friends";
  isMine?: boolean;
  myReaction: string | null;
  reactionCounts: Record<string, number>;
  reactionTotal: number;
  createdAt: string;
  expiresAt: string;
}

/** A broadcast channel: one-to-many, owner (and promoted admins) write to a subscribed audience. */
export interface Channel {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  owner: { id: string; username?: string; avatarUrl?: string };
  memberCount: number;
  isJoined: boolean;
  myRole: "owner" | "admin" | "member" | null;
}

export interface ChannelMessage {
  id: string;
  channel: string;
  sender: UserPreview;
  text: string;
  createdAt: string;
  editedAt?: string | null;
}

export const COMMUNITY_CATEGORIES = [
  "General",
  "Tech",
  "Art & Design",
  "Music",
  "Gaming",
  "Sports",
  "Photography",
  "Travel",
  "Food",
  "Fashion",
  "Wellness",
  "Other",
] as const;

export interface Community {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  category: string;
  rules: string[];
  owner: { id: string; username?: string; avatarUrl?: string };
  memberCount: number;
  myRole: "owner" | "admin" | "member" | null;
  isJoined: boolean;
  announcement: { text: string; author: { id: string; username?: string }; createdAt: string } | null;
}

export interface CommunityMessage {
  id: string;
  community: string;
  author: UserPreview;
  text: string;
  images: string[];
  createdAt: string;
  editedAt?: string | null;
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
  visibility?: "public" | "followers" | "close_friends";
  stickers?: StorySticker[];
}

export interface StorySticker {
  _id: string;
  type: "poll" | "quiz" | "question";
  position: { x: number; y: number };
  question: string;
  options?: { text: string; isCorrect?: boolean }[];
  aggregate?: number[];
  hasResponded?: boolean;
  myResponse?: { optionIndex?: number; text?: string };
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
