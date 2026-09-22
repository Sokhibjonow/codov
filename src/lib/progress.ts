import type { AttendanceStatus } from "@/generated/prisma/client";
import { prisma } from "./db";
import { fromDbDate, isPast } from "./format";
import { assignmentProgress, getStudentCourses, studentOpenAssignmentWhere, type AssignmentProgress } from "./learning";

// Progress report of one student: shown to the student, their parents and the teacher.
// Deliberately without AI reports and integrity data.

export type ReportAssignment = {
  id: string;
  titleUz: string;
  titleRu: string;
  courseUz: string;
  courseRu: string;
  lessonUz: string;
  lessonRu: string;
  status: AssignmentProgress;
  score: number | null;
  maxScore: number;
  attempts: number;
  dueAt: Date | null;
  overdue: boolean;
  late: boolean;
  teacherComment: string | null;
  updatedAt: Date | null;
};

export type ReportAttendance = { date: string; status: AttendanceStatus; note: string | null; groupName: string };

export type StudentReport = Awaited<ReturnType<typeof getStudentReport>>;

const DONE_STATUSES = new Set<AssignmentProgress>(["SUBMITTED", "NEEDS_REVIEW", "ACCEPTED"]);

export async function getStudentReport(studentId: string) {
  const [courses, assignments, attendance] = await Promise.all([
    getStudentCourses(studentId),
    prisma.assignment.findMany({
      where: await studentOpenAssignmentWhere(studentId),
      orderBy: [
        { lesson: { module: { course: { order: "asc" } } } },
        { lesson: { module: { order: "asc" } } },
        { lesson: { order: "asc" } },
        { order: "asc" },
      ],
      select: {
        id: true,
        titleUz: true,
        titleRu: true,
        maxScore: true,
        lesson: {
          select: {
            titleUz: true,
            titleRu: true,
            module: { select: { course: { select: { titleUz: true, titleRu: true } } } },
          },
        },
        deadlines: {
          where: { group: { members: { some: { userId: studentId } } } },
          orderBy: { dueAt: "asc" },
          take: 1,
          select: { dueAt: true },
        },
        drafts: { where: { userId: studentId }, select: { updatedAt: true } },
        submissions: {
          where: { studentId },
          orderBy: { attempt: "desc" },
          select: { status: true, score: true, isLate: true, createdAt: true, reviewedAt: true, teacherComment: true },
        },
      },
    }),
    prisma.attendanceRecord.findMany({
      where: { studentId },
      orderBy: { date: "desc" },
      select: { date: true, status: true, note: true, group: { select: { name: true } } },
    }),
  ]);

  const items: ReportAssignment[] = assignments.map((a) => {
    const status = assignmentProgress(a);
    const latest = a.submissions[0];
    const dueAt = a.deadlines[0]?.dueAt ?? null;
    return {
      id: a.id,
      titleUz: a.titleUz,
      titleRu: a.titleRu,
      courseUz: a.lesson.module.course.titleUz,
      courseRu: a.lesson.module.course.titleRu,
      lessonUz: a.lesson.titleUz,
      lessonRu: a.lesson.titleRu,
      status,
      score: status === "ACCEPTED" ? (latest?.score ?? null) : null,
      maxScore: a.maxScore,
      attempts: a.submissions.length,
      dueAt,
      overdue: dueAt !== null && isPast(dueAt) && !DONE_STATUSES.has(status),
      late: a.submissions.some((s) => s.isLate),
      teacherComment: a.submissions.find((s) => s.reviewedAt && s.teacherComment)?.teacherComment ?? null,
      updatedAt: latest?.reviewedAt ?? latest?.createdAt ?? a.drafts[0]?.updatedAt ?? null,
    };
  });

  const scored = items.filter((i) => i.score !== null);
  const averageScore = scored.length
    ? Math.round(scored.reduce((sum, i) => sum + (i.score! / i.maxScore) * 100, 0) / scored.length)
    : null;

  const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 } satisfies Record<AttendanceStatus, number>;
  for (const record of attendance) counts[record.status]++;
  const countable = attendance.length - counts.EXCUSED;
  const attendanceRate = countable > 0 ? Math.round(((counts.PRESENT + counts.LATE) / countable) * 100) : null;

  const lessonsTotal = courses.reduce((sum, c) => sum + c.total, 0);
  const lessonsDone = courses.reduce((sum, c) => sum + c.done, 0);

  return {
    courses: courses.map((c) => ({ id: c.id, titleUz: c.titleUz, titleRu: c.titleRu, done: c.done, total: c.total })),
    assignments: items,
    attendance: attendance.map<ReportAttendance>((r) => ({ date: fromDbDate(r.date), status: r.status, note: r.note, groupName: r.group.name })),
    summary: {
      lessonsDone,
      lessonsTotal,
      averageScore,
      attendanceRate,
      attendanceCounts: counts,
      assignmentsTotal: items.length,
      accepted: items.filter((i) => i.status === "ACCEPTED").length,
      inReview: items.filter((i) => i.status === "SUBMITTED" || i.status === "NEEDS_REVIEW").length,
      returned: items.filter((i) => i.status === "RETURNED").length,
      overdue: items.filter((i) => i.overdue).length,
    },
  };
}

/** Something a parent should look at: overdue or returned work, or low attendance. */
export function needsAttention(summary: StudentReport["summary"]) {
  return summary.overdue > 0 || summary.returned > 0 || (summary.attendanceRate !== null && summary.attendanceRate < 80);
}
