import { KeyRound, Power, Trash2 } from "lucide-react";
import { deleteUser, resetPassword, setUserActive } from "@/app/admin/users/actions";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { Locale } from "@/i18n/config";
import { formatDateTime } from "@/lib/format";
import { FormDialog } from "./FormDialog";

type AccessSectionProps = {
  t: Dictionary;
  locale: Locale;
  user: { id: string; isActive: boolean; lastLoginAt: Date | null };
  deactivateHint: string;
  deleteHint: string;
};

export function AccessSection({ t, locale, user, deactivateHint, deleteHint }: AccessSectionProps) {
  return (
    <section className="card space-y-5">
      <div>
        <h2 className="mb-3 text-lg font-extrabold">{t.students.access}</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">{t.fields.status}</dt>
          <dd>
            <Badge tone={user.isActive ? "success" : "danger"}>{user.isActive ? t.common.active : t.common.inactive}</Badge>
          </dd>
          <dt className="text-muted">{t.fields.lastLogin}</dt>
          <dd className="font-semibold">{user.lastLoginAt ? formatDateTime(user.lastLoginAt, locale) : t.common.never}</dd>
        </dl>
      </div>

      <div className="flex flex-wrap gap-2">
        <FormDialog
          t={t}
          title={t.students.resetPassword}
          trigger={
            <>
              <KeyRound size={18} />
              {t.students.resetPassword}
            </>
          }
          triggerClassName="btn border border-border bg-surface"
          action={resetPassword.bind(null, user.id)}
          submitLabel={t.students.resetPassword}
        >
          <p className="text-muted">{t.students.resetConfirm}</p>
        </FormDialog>

        <form action={setUserActive.bind(null, user.id, !user.isActive)}>
          <SubmitButton className="btn border border-border bg-surface">
            <Power size={18} />
            {user.isActive ? t.students.deactivate : t.students.activate}
          </SubmitButton>
        </form>
      </div>
      {user.isActive && deactivateHint && <p className="text-xs text-muted">{deactivateHint}</p>}

      <div className="rounded-xl border border-danger/30 p-4">
        <h3 className="text-sm font-extrabold text-danger">{t.common.dangerZone}</h3>
        <p className="mb-3 mt-1 text-xs text-muted">{deleteHint}</p>
        <form action={deleteUser.bind(null, user.id)}>
          <SubmitButton className="btn bg-danger text-on-color hover:bg-danger/90" confirmText={t.common.confirmDelete}>
            <Trash2 size={18} />
            {t.common.delete}
          </SubmitButton>
        </form>
      </div>
    </section>
  );
}
