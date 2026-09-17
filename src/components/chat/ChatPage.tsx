import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureUserChats, getThread, listChats, listContacts } from "@/lib/chat/data";
import { ChatApp } from "./ChatApp";

type ChatPageProps = {
  basePath: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** The chat screen shared by the teacher, students and parents (`?c=` selects a chat). */
export async function ChatPage({ basePath, searchParams }: ChatPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/logout");

  const { t, locale } = await getDictionary();
  const { c } = await searchParams;

  await ensureUserChats(user);
  const [chats, thread, contacts] = await Promise.all([
    listChats(user),
    typeof c === "string" ? getThread(user, c) : null,
    user.role === "ADMIN" ? listContacts() : [],
  ]);

  return (
    <ChatApp
      key={thread?.id ?? "list"}
      t={t}
      locale={locale}
      me={{ id: user.id, role: user.role }}
      chats={chats}
      thread={thread}
      contacts={contacts}
      basePath={basePath}
    />
  );
}
