import { CalendarDays, Send, Users } from "lucide-react";
import { format, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import { formatDayMonth, isPast } from "@/lib/format";
import type { getTrialOffer } from "@/lib/learning";

type Offer = NonNullable<Awaited<ReturnType<typeof getTrialOffer>>>;

/**
 * The invitation to the online group shown to trial students.
 * `locked`: the student reached the end of the free lessons, so the card leads with that.
 */
export function TrialOffer({ offer, t, locale, locked = false }: { offer: Offer; t: Dictionary["trial"]; locale: Locale; locked?: boolean }) {
  const start = offer.start && !isPast(offer.start) ? offer.start : null;

  return (
    <section className="relative mb-4 overflow-hidden rounded-3xl bg-navy p-6 text-white shadow-lg sm:p-8">
      <div aria-hidden="true" className="absolute -right-16 -top-20 size-64 rotate-12 rounded-[3rem] bg-brand/30" />
      <div className="relative max-w-2xl">
        <p className="text-xs font-extrabold uppercase tracking-wide text-brand-light">
          {locked ? t.lockedTitle : t.badge}
        </p>
        <h2 className="mt-2 text-2xl font-extrabold leading-tight sm:text-3xl">{t.offerTitle}</h2>
        <p className="mt-3 text-white/80">{locked ? t.lockedHint : t.offerText}</p>

        {(start || offer.seats != null) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {start && (
              <span className="flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-bold ring-1 ring-white/15">
                <CalendarDays size={16} />
                {format(t.start, { date: formatDayMonth(start, locale) })}
              </span>
            )}
            {offer.seats != null && (
              <span className="flex items-center gap-2 rounded-full bg-brand px-3.5 py-1.5 text-sm font-bold">
                <Users size={16} />
                {format(t.seats, { count: offer.seats })}
              </span>
            )}
          </div>
        )}

        <a href={offer.link} target="_blank" rel="noopener noreferrer" className="btn mt-6 bg-white text-navy hover:bg-white/90">
          <Send size={18} />
          {t.cta}
        </a>
      </div>
    </section>
  );
}
