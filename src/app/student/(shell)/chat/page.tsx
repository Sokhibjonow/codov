import type { Metadata } from "next";
import { ChatPage } from "@/components/chat/ChatPage";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Chat" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function StudentChatPage({ searchParams }: { searchParams: SearchParams }) {
  await requireUser("STUDENT");
  return <ChatPage basePath="/student/chat" searchParams={searchParams} />;
}
