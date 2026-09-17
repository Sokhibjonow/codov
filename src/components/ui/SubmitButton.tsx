"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Asks for confirmation before submitting */
  confirmText?: string;
};

export function SubmitButton({
  children,
  className = "btn btn-primary",
  confirmText,
  disabled,
  onClick,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={className}
      onClick={(event) => {
        if (confirmText && !window.confirm(confirmText)) event.preventDefault();
        onClick?.(event);
      }}
      {...props}
    >
      {pending && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  );
}
