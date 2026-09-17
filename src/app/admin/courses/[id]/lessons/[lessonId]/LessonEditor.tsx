"use client";

import { Save } from "lucide-react";
import { useRef, useState } from "react";
import { useEditorGuards } from "@/components/admin/useEditorGuards";
import { BilingualMarkdownEditor } from "@/components/markdown/BilingualMarkdownEditor";
import { Field, FormAlert } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { ActionState, FormAction } from "@/lib/action-state";

type LessonEditorProps = {
  t: Dictionary;
  lesson: { titleUz: string; titleRu: string; contentUz: string; contentRu: string };
  saveAction: FormAction;
};

export function LessonEditor({ t, lesson, saveAction }: LessonEditorProps) {
  // All fields are controlled so React's automatic form reset after saving can't wipe them
  const [titles, setTitles] = useState({ uz: lesson.titleUz, ru: lesson.titleRu });
  const [content, setContent] = useState({ uz: lesson.contentUz, ru: lesson.contentRu });
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<ActionState>();

  const formRef = useRef<HTMLFormElement>(null);
  useEditorGuards(formRef, dirty);

  const markDirty = () => {
    setDirty(true);
    setResult(undefined);
  };

  return (
    <form
      ref={formRef}
      className="space-y-4"
      action={async (formData) => {
        const response = await saveAction(undefined, formData);
        setResult(response);
        if (response?.ok) setDirty(false);
      }}
    >
      <div className="card grid gap-4 sm:grid-cols-2">
        <Field
          name="titleUz"
          label={t.courses.titleUz}
          value={titles.uz}
          maxLength={120}
          onChange={(e) => {
            setTitles((prev) => ({ ...prev, uz: e.target.value }));
            markDirty();
          }}
        />
        <Field
          name="titleRu"
          label={t.courses.titleRu}
          value={titles.ru}
          maxLength={120}
          onChange={(e) => {
            setTitles((prev) => ({ ...prev, ru: e.target.value }));
            markDirty();
          }}
        />
      </div>

      <BilingualMarkdownEditor
        t={t}
        value={content}
        names={{ uz: "contentUz", ru: "contentRu" }}
        onChange={(lang, text) => {
          setContent((prev) => ({ ...prev, [lang]: text }));
          markDirty();
        }}
      />

      <SaveBar t={t} dirty={dirty} result={result} />
    </form>
  );
}

export function SaveBar({ t, dirty, result }: { t: Dictionary; dirty: boolean; result: ActionState }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-2xl md:border">
      <SubmitButton>
        <Save size={18} />
        {t.common.save}
      </SubmitButton>
      {dirty ? (
        <span className="text-sm font-semibold text-[#b45309]">{t.lessons.unsaved}</span>
      ) : (
        result && <FormAlert ok={result.ok} message={result.message} />
      )}
      <span className="ml-auto hidden text-xs text-muted md:inline">{t.lessons.saveShortcut}</span>
    </div>
  );
}
