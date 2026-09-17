import { PageHeader } from "@/components/PageHeader";
import { StudentReport } from "@/components/progress/StudentReport";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { getStudentReport } from "@/lib/progress";

export default async function StudentProgressPage() {
  const user = await requireUser("STUDENT");
  const { t, locale } = await getDictionary();
  const report = await getStudentReport(user.id);

  return (
    <>
      <PageHeader title={t.progress.title} />
      <StudentReport t={t} locale={locale} report={report} />
    </>
  );
}
