import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";

// Full-screen pages (the code workspace) without the sidebar
export default async function StudentFocusLayout({ children }: { children: ReactNode }) {
  await requireUser("STUDENT");
  return children;
}
