import type { Role } from "./session-token";

export type Credential = {
  name: string;
  role: Role;
  login: string;
  password: string;
};

export type ActionState =
  | {
      ok: boolean;
      message?: string;
      /** Freshly generated logins/passwords, shown to the teacher exactly once */
      credentials?: Credential[];
    }
  | undefined;

export type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function fail(message: string): ActionState {
  return { ok: false, message };
}

export function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function formList(formData: FormData, key: string) {
  return formData.getAll(key).filter((v): v is string => typeof v === "string" && v !== "");
}

export function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}
