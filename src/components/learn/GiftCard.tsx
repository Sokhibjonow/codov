import { Download, Gift as GiftIcon } from "lucide-react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { Gift } from "@/lib/gifts";
import { pick } from "@/lib/learning";

/** The gift promised in the videos, with a direct download. */
export function GiftCard({ gift, t, locale }: { gift: Gift; t: Dictionary["gift"]; locale: Locale }) {
  return (
    <section className="card mb-4 flex flex-col gap-4 border-primary/30 sm:flex-row sm:items-center">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <GiftIcon size={24} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-extrabold uppercase tracking-wide text-primary">{t.badge}</p>
        <p className="text-lg font-extrabold">{pick(locale, gift.titleUz, gift.titleRu)}</p>
        <p className="text-sm text-muted">{t.text}</p>
      </div>
      <a href={gift.href} download className="btn btn-primary shrink-0">
        <Download size={18} />
        {t.download}
      </a>
    </section>
  );
}
