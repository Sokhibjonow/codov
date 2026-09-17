import type { Metadata } from "next";
import { ChatPage } from "@/components/chat/ChatPage";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Chat" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ParentChatPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser("PARENT");
  return <ChatPage basePath="/parent/chat" searchParams={searchParams} />;
}
