import { Search } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries/ru";

type SelectFilter = {
  name: string;
  value: string;
  options: { value: string; label: string }[];
};

export function SearchFilters({ t, q, selects = [] }: { t: Dictionary; q: string; selects?: SelectFilter[] }) {
  return (
    <form role="search" className="mb-4 flex flex-wrap gap-2">
      <label className="relative min-w-0 flex-1 basis-64">
        <span className="sr-only">{t.common.search}</span>
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input type="search" name="q" defaultValue={q} placeholder={t.common.searchPlaceholder} className="input pl-10" />
      </label>
      {selects.map((select) => (
        <select key={select.name} name={select.name} defaultValue={select.value} className="input w-auto min-w-0 flex-1 sm:flex-none">
          {select.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ))}
      <button type="submit" className="btn btn-primary">
        {t.common.search}
      </button>
    </form>
  );
}
