import { Field } from "@/components/ui/Field";
import type { Dictionary } from "@/i18n/dictionaries/ru";

type UserFieldsProps = {
  t: Dictionary;
  user?: { firstName: string; lastName: string; phone: string | null; login: string };
  /** On create the login may be left empty and is generated automatically */
  loginOptional?: boolean;
};

export function UserFields({ t, user, loginOptional }: UserFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field name="lastName" label={t.fields.lastName} defaultValue={user?.lastName} maxLength={60} />
      <Field name="firstName" label={t.fields.firstName} defaultValue={user?.firstName} maxLength={60} required />
      <Field
        name="phone"
        type="tel"
        inputMode="tel"
        label={t.fields.phone}
        placeholder="+998 90 123 45 67"
        defaultValue={user?.phone ?? ""}
        maxLength={30}
      />
      <Field
        name="login"
        label={t.fields.login}
        defaultValue={user?.login}
        hint={loginOptional ? t.fields.loginAuto : undefined}
        required={!loginOptional}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={32}
        className="[&_input]:font-mono"
      />
    </div>
  );
}
