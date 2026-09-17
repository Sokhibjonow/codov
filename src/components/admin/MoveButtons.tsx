import { ChevronDown, ChevronUp } from "lucide-react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Dictionary } from "@/i18n/dictionaries/ru";

type MoveButtonsProps = {
  t: Dictionary;
  up: () => Promise<void>;
  down: () => Promise<void>;
  isFirst: boolean;
  isLast: boolean;
};

export function MoveButtons({ t, up, down, isFirst, isLast }: MoveButtonsProps) {
  return (
    <span className="inline-flex">
      <form action={up}>
        <SubmitButton className="btn btn-ghost p-1.5" disabled={isFirst} title={t.courses.moveUp} aria-label={t.courses.moveUp}>
          <ChevronUp size={16} />
        </SubmitButton>
      </form>
      <form action={down}>
        <SubmitButton className="btn btn-ghost p-1.5" disabled={isLast} title={t.courses.moveDown} aria-label={t.courses.moveDown}>
          <ChevronDown size={16} />
        </SubmitButton>
      </form>
    </span>
  );
}
