"use client";

import { useState, type ReactNode } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { FormAlert } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { ActionState, FormAction } from "@/lib/action-state";
import { CredentialsView } from "./CredentialsView";

type FormDialogProps = {
  t: Dictionary;
  title: string;
  trigger: ReactNode;
  /** Accessible name for icon-only triggers */
  triggerLabel?: string;
  triggerClassName?: string;
  action: FormAction;
  submitLabel: string;
  submitClassName?: string;
  wide?: boolean;
  children: ReactNode;
};

/**
 * Button → dialog with a form. Closes on success, or shows the generated
 * credentials when the action returns them.
 */
export function FormDialog({
  t,
  title,
  trigger,
  triggerLabel,
  triggerClassName = "btn btn-primary",
  action,
  submitLabel,
  submitClassName = "btn btn-primary",
  wide,
  children,
}: FormDialogProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ActionState>();

  const close = () => {
    setOpen(false);
    setResult(undefined);
  };

  const credentials = result?.ok ? result.credentials : undefined;

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
        title={triggerLabel}
      >
        {trigger}
      </button>
      <Dialog open={open} onClose={close} title={credentials ? t.credentials.title : title} closeLabel={t.common.close} wide={wide || !!credentials}>
        {credentials ? (
          <div className="space-y-4">
            <FormAlert ok message={result?.message} />
            <CredentialsView credentials={credentials} t={t} />
            <div className="flex justify-end">
              <button type="button" onClick={close} className="btn btn-primary">
                {t.common.close}
              </button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-4"
            action={async (formData) => {
              const next = await action(undefined, formData);
              if (next?.ok && !next.credentials?.length) close();
              else setResult(next);
            }}
          >
            {result && !result.ok && <FormAlert ok={false} message={result.message} />}
            {children}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={close} className="btn btn-ghost">
                {t.common.cancel}
              </button>
              <SubmitButton className={submitClassName}>{submitLabel}</SubmitButton>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
