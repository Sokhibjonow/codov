import type { Role } from "../session-token";

export type ChatMessageDTO = {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  text: string;
  createdAt: string;
  deleted: boolean;
};

/** The other person in a direct chat */
export type ChatPeer = {
  id: string;
  name: string;
  role: Role;
  /** Parent: children's names; student: group names */
  details: string[];
};

export type ChatSummaryDTO = {
  id: string;
  type: "DIRECT" | "GROUP";
  groupName: string | null;
  peer: ChatPeer | null;
  lastMessage: ChatMessageDTO | null;
  lastActivityAt: string;
  unread: number;
};

export type ChatThreadDTO = {
  id: string;
  type: "DIRECT" | "GROUP";
  groupName: string | null;
  memberCount: number;
  peer: ChatPeer | null;
  messages: ChatMessageDTO[];
  hasMore: boolean;
  /** When each other member last read the chat (direct chats, for "read" marks) */
  readBy: Record<string, string | null>;
};

export type ChatContact = { id: string; name: string; role: "STUDENT" | "PARENT"; details: string[] };

export type ChatEvent =
  | { type: "message"; message: ChatMessageDTO }
  | { type: "read"; chatId: string; userId: string; lastReadAt: string }
  | { type: "deleted"; chatId: string; messageId: string }
  /** Something new in the notification bell; clients reload the list */
  | { type: "notification" };

/** First message of the live stream: proves events actually reach the browser (some proxies hold them back) */
export type StreamHello = { type: "hello" };

/** Delivered to client listeners only: the live connection came back and missed events must be reloaded */
export type ClientChatEvent = ChatEvent | { type: "reconnected" };

export const MESSAGE_MAX_LENGTH = 4000;
export const MESSAGES_PAGE = 50;
