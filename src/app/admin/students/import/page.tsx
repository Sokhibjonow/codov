import { BackLink } from "@/components/admin/BackLink";
import { PageHeader } from "@/components/PageHeader";
import { getDictionary } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { ImportWizard } from "./ImportWizard";

export default async function ImportStudentsPage() {
  await requireUser("ADMIN");
  const { t } = await getDictionary();

  return (
    <>
      <BackLink href="/admin/students" label={t.students.title} />
      <PageHeader title={t.import.title} subtitle={t.import.subtitle} />
      <ImportWizard t={t} />
    </>
  );
}
