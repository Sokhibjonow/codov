import { Badge } from "@/components/ui/Badge";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { AssignmentProgress } from "@/lib/learning";

const tones = {
  NOT_STARTED: "neutral",
  IN_PROGRESS: "primary",
  SUBMITTED: "accent",
  NEEDS_REVIEW: "accent",
  ACCEPTED: "success",
  RETURNED: "danger",
} as const;

export function AssignmentStatusBadge({ status, t }: { status: AssignmentProgress; t: Dictionary }) {
  return <Badge tone={tones[status]}>{t.assignments.status[status]}</Badge>;
}
