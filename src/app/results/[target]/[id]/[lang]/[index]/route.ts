import { resultBlocks } from "@/components/markdown/parse";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { studentAssignmentWhere, studentCourseWhere } from "@/lib/learning";

type Params = Promise<{ target: string; id: string; lang: string; index: string }>;

const notFound = () => new Response("Not found", { status: 404 });

/**
 * Serves one "result only" block of a lesson or an assignment description.
 * The teacher's code never appears in the student's lesson page; it is loaded here,
 * into a sandboxed frame, only for students who have access to that lesson.
 */
export async function GET(_request: Request, { params }: { params: Params }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (user.role === "PARENT") return new Response("Forbidden", { status: 403 });

  const { target, id, lang, index } = await params;
  const blockIndex = Number(index);
  if ((lang !== "uz" && lang !== "ru") || !Number.isInteger(blockIndex) || blockIndex < 0) return notFound();

  const isAdmin = user.role === "ADMIN";
  let text: string | undefined;

  if (target === "lesson") {
    const lesson = await prisma.lesson.findFirst({
      where: isAdmin ? { id } : { id, isPublished: true, module: { course: studentCourseWhere(user.id) } },
      select: { contentUz: true, contentRu: true },
    });
    text = lang === "uz" ? lesson?.contentUz : lesson?.contentRu;
  } else if (target === "assignment") {
    const assignment = await prisma.assignment.findFirst({
      where: isAdmin ? { id } : { id, ...studentAssignmentWhere(user.id) },
      select: { descriptionUz: true, descriptionRu: true },
    });
    text = lang === "uz" ? assignment?.descriptionUz : assignment?.descriptionRu;
  }

  const code = text === undefined ? undefined : resultBlocks(text)[blockIndex];
  if (code === undefined) return notFound();

  return new Response(code, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Runs as an isolated page even if opened directly, and only inside our own pages
      "Content-Security-Policy": "sandbox allow-scripts allow-modals allow-forms allow-popups; frame-ancestors 'self'",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
