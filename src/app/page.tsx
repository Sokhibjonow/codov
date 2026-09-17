import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { homePathFor } from "@/lib/session-token";

export default async function Home() {
  const session = await getSession();
  redirect(session ? homePathFor(session.role) : "/login");
}
