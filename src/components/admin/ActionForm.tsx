"use client";

import { useActionState, type ReactNode } from "react";
import { FormAlert } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { FormAction } from "@/lib/action-state";

type ActionFormProps = {
  action: FormAction;
  submitLabel: string;
  children: ReactNode;
  className?: string;
};

/** Inline form that shows the action's success/error message under the fields. */
export function ActionForm({ action, submitLabel, children, className = "space-y-4" }: ActionFormProps) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className={className}>
      {children}
      {state && <FormAlert ok={state.ok} message={state.message} />}
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
