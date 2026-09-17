"use client";

import { useRef, useState } from "react";
import { useEditorGuards } from "@/components/admin/useEditorGuards";
import { AutotestsEditor } from "@/components/autotests/AutotestsEditor";
import { CodeTabsEditor } from "@/components/code/CodeTabsEditor";
import { PreviewPane } from "@/components/code/PreviewPane";
import { BilingualMarkdownEditor } from "@/components/markdown/BilingualMarkdownEditor";
import { Field } from "@/components/ui/Field";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { ActionState, FormAction } from "@/lib/action-state";
import type { AutotestRule } from "@/lib/autotests";
import type { CodeFiles } from "@/lib/preview";
import { SaveBar } from "../../LessonEditor";

type AssignmentEditorProps = {
  t: Dictionary;
  assignment: {
    titleUz: string;
    titleRu: string;
    descriptionUz: string;
    descriptionRu: string;
    topic: string;
    starterHtml: string;
    starterCss: string;
    starterJs: string;
    maxScore: number;
    aiReviewEnabled: boolean;
    tests: AutotestRule[];
  };
  saveAction: FormAction;
};

export function AssignmentEditor({ t, assignment, saveAction }: AssignmentEditorProps) {
  const [titles, setTitles] = useState({ uz: assignment.titleUz, ru: assignment.titleRu });
  const [description, setDescription] = useState({ uz: assignment.descriptionUz, ru: assignment.descriptionRu });
  const [starter, setStarter] = useState<CodeFiles>({
    html: assignment.starterHtml,
    css: assignment.starterCss,
    js: assignment.starterJs,
  });
  const [topic, setTopic] = useState(assignment.topic);
  const [maxScore, setMaxScore] = useState(String(assignment.maxScore));
  const [aiReview, setAiReview] = useState(assignment.aiReviewEnabled);
  const [tests, setTests] = useState(assignment.tests);
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<ActionState>();

  const formRef = useRef<HTMLFormElement>(null);
  useEditorGuards(formRef, dirty);

  // Wraps a setter so every edit marks the form as changed
  const edit =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
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
        <Field name="titleUz" label={t.courses.titleUz} value={titles.uz} maxLength={120} onChange={(e) => edit(setTitles)({ ...titles, uz: e.target.value })} />
        <Field name="titleRu" label={t.courses.titleRu} value={titles.ru} maxLength={120} onChange={(e) => edit(setTitles)({ ...titles, ru: e.target.value })} />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-extrabold">{t.assignments.description}</h2>
          <p className="text-sm text-muted">{t.assignments.descriptionHint}</p>
        </div>
        <BilingualMarkdownEditor
          t={t}
          value={description}
          names={{ uz: "descriptionUz", ru: "descriptionRu" }}
          heightClass="h-[45vh]"
          onChange={(lang, text) => edit(setDescription)({ ...description, [lang]: text })}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-extrabold">{t.assignments.starterCode}</h2>
          <p className="text-sm text-muted">{t.assignments.starterHint}</p>
        </div>
        <input type="hidden" name="starterHtml" value={starter.html} />
        <input type="hidden" name="starterCss" value={starter.css} />
        <input type="hidden" name="starterJs" value={starter.js} />
        <div className="grid overflow-hidden rounded-2xl border border-border lg:grid-cols-2">
          <CodeTabsEditor
            code={starter}
            className="h-[50vh]"
            onChange={(file, value) => {
              setStarter((prev) => ({ ...prev, [file]: value }));
              setDirty(true);
              setResult(undefined);
            }}
          />
          <PreviewPane code={starter} t={t} className="h-[50vh] border-t border-border lg:border-l lg:border-t-0" />
        </div>
      </section>

      <section className="card space-y-3">
        <div>
          <h2 className="text-lg font-extrabold">{t.autotests.title}</h2>
          <p className="text-sm text-muted">{t.autotests.hint}</p>
        </div>
        <input type="hidden" name="tests" value={JSON.stringify(tests)} />
        <AutotestsEditor t={t} rules={tests} onChange={edit(setTests)} />
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-extrabold">{t.assignments.settings}</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <Field
            name="topic"
            label={t.assignments.topic}
            placeholder={t.assignments.topicPlaceholder}
            value={topic}
            maxLength={200}
            onChange={(e) => edit(setTopic)(e.target.value)}
          />
          <Field
            name="maxScore"
            type="number"
            min={1}
            max={1000}
            label={t.assignments.maxScore}
            value={maxScore}
            onChange={(e) => edit(setMaxScore)(e.target.value)}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            name="aiReviewEnabled"
            checked={aiReview}
            onChange={(e) => edit(setAiReview)(e.target.checked)}
            className="size-4 accent-primary"
          />
          <span className="text-sm font-bold">{t.assignments.aiReview}</span>
        </label>
      </section>

      <SaveBar t={t} dirty={dirty} result={result} />
    </form>
  );
}
