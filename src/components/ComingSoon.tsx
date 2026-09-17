import { Construction } from "lucide-react";
import { getDictionary } from "@/i18n/server";

export async function ComingSoon() {
  const { t } = await getDictionary();

  return (
    <div className="card flex flex-col items-center py-16 text-center">
      <span className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Construction size={32} />
      </span>
      <h1 className="text-xl font-extrabold">{t.dashboard.comingSoon}</h1>
      <p className="mt-1 text-muted">{t.dashboard.comingSoonHint}</p>
    </div>
  );
}
