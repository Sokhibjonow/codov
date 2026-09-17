import { Field, TextArea } from "@/components/ui/Field";
import type { Dictionary } from "@/i18n/dictionaries/ru";

type BilingualFieldsProps = {
  t: Dictionary;
  values?: { titleUz: string; titleRu: string; descriptionUz?: string; descriptionRu?: string };
  withDescription?: boolean;
};

export function BilingualFields({ t, values, withDescription }: BilingualFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field name="titleUz" label={t.courses.titleUz} defaultValue={values?.titleUz} maxLength={120} />
      <Field name="titleRu" label={t.courses.titleRu} defaultValue={values?.titleRu} maxLength={120} />
      {withDescription && (
        <>
          <TextArea name="descriptionUz" label={t.courses.descriptionUz} defaultValue={values?.descriptionUz} maxLength={1000} />
          <TextArea name="descriptionRu" label={t.courses.descriptionRu} defaultValue={values?.descriptionRu} maxLength={1000} />
        </>
      )}
    </div>
  );
}
