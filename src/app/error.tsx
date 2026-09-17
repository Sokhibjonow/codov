"use client";

import { RotateCw, TriangleAlert } from "lucide-react";

// Shown instead of Next's bare error screen; the dictionary isn't available here, so both languages are shown.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-5">
      <div className="card flex max-w-md flex-col items-center py-10 text-center">
        <span className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-danger-soft text-danger">
          <TriangleAlert size={32} />
        </span>
        <h1 className="text-xl font-extrabold">Xatolik yuz berdi</h1>
        <p className="text-muted">Nimadir noto‘g‘ri ketdi. Qaytadan urinib ko‘ring.</p>
        <h2 className="mt-4 text-xl font-extrabold">Что-то пошло не так</h2>
        <p className="text-muted">Попробуйте ещё раз.</p>
        <button type="button" onClick={reset} className="btn btn-primary mt-6">
          <RotateCw size={18} />
          Qayta urinish / Повторить
        </button>
      </div>
    </div>
  );
}
