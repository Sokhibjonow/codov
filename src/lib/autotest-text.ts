import { format } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries/ru";
import type { AutotestResult, AutotestRule } from "./autotests";

const FILE_NAMES = { html: "index.html", css: "style.css", js: "script.js" };

/** Human-readable description of a rule, shown to students and the teacher (and given to the AI). */
export function describeRule(t: Dictionary, rule: AutotestRule) {
  const d = t.autotests.describe;
  switch (rule.type) {
    case "exists":
      return rule.min > 1 ? format(d.existsMin, { selector: rule.selector, min: rule.min }) : format(d.exists, { selector: rule.selector });
    case "count":
      return format(d.count, { selector: rule.selector, count: rule.count });
    case "text":
      return format(d.text, { selector: rule.selector, text: rule.text });
    case "attribute":
      return rule.value
        ? format(d.attributeValue, { selector: rule.selector, attribute: rule.attribute, value: rule.value })
        : format(d.attribute, { selector: rule.selector, attribute: rule.attribute });
    case "style":
      return format(d.style, { selector: rule.selector, property: rule.property, value: rule.value });
    case "click":
      return format(d.click, { selector: rule.selector, target: rule.target, text: rule.text });
    case "input":
      return format(d.input, { selector: rule.selector, value: rule.value, button: rule.button, target: rule.target, text: rule.text });
    case "console":
      return format(d.console, { text: rule.text });
    case "noErrors":
      return d.noErrors;
    case "code":
      return format(d.code, { file: FILE_NAMES[rule.file], pattern: rule.pattern });
  }
}

export function describeFailure(t: Dictionary, result: AutotestResult) {
  const f = t.autotests.failure;
  const parts: string[] = [];
  if (result.reason && result.reason !== "mismatch") parts.push(f[result.reason]);
  // "Not found · Now: 0" says the same thing twice
  if (result.actual && result.reason !== "notFound") parts.push(format(f.actual, { actual: result.actual }));
  return parts.join(" · ");
}
