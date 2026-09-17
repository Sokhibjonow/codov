import type { Metadata } from "next";
import { ChatPage } from "@/components/chat/ChatPage";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Chat" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminChatPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser("ADMIN");
  return <ChatPage basePath="/admin/chat" searchParams={searchParams} />;
}
