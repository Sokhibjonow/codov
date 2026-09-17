import { z } from "zod";
import type { CodeFiles } from "./preview";

// Autotests: checks the teacher builds from ready-made blocks, run against the student's page.

const selector = z.string().trim().min(1).max(200);
const text = z.string().max(300);
const base = {
  id: z.string().min(1).max(64),
  points: z.number().int().min(1).max(100),
};

export const autotestRuleSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("exists"), selector, min: z.number().int().min(1).max(1000) }),
  z.object({ ...base, type: z.literal("count"), selector, count: z.number().int().min(0).max(1000) }),
  z.object({ ...base, type: z.literal("text"), selector, text: text.trim().min(1) }),
  z.object({ ...base, type: z.literal("attribute"), selector, attribute: z.string().trim().min(1).max(100), value: text }),
  z.object({ ...base, type: z.literal("style"), selector, property: z.string().trim().min(1).max(100), value: z.string().trim().min(1).max(200) }),
  z.object({ ...base, type: z.literal("click"), selector, target: selector, text: text.trim().min(1) }),
  z.object({ ...base, type: z.literal("input"), selector, value: text, button: selector, target: selector, text: text.trim().min(1) }),
  z.object({ ...base, type: z.literal("console"), text: text.trim().min(1) }),
  z.object({ ...base, type: z.literal("noErrors") }),
  z.object({ ...base, type: z.literal("code"), file: z.enum(["html", "css", "js"]), pattern: text.trim().min(1) }),
]);

export type AutotestRule = z.infer<typeof autotestRuleSchema>;
export type AutotestType = AutotestRule["type"];

export const AUTOTEST_TYPES: AutotestType[] = ["exists", "count", "text", "attribute", "style", "click", "input", "console", "noErrors", "code"];
export const MAX_RULES = 30;

export function parseRules(value: unknown): AutotestRule[] {
  const result = z.array(autotestRuleSchema).max(MAX_RULES).safeParse(value);
  return result.success ? result.data : [];
}

/** Index (1-based) of the first rule that is not filled in correctly, or null when all are valid. */
export function firstInvalidRule(value: unknown): number | null {
  if (!Array.isArray(value)) return 1;
  const index = value.findIndex((rule) => !autotestRuleSchema.safeParse(rule).success);
  return index === -1 ? null : index + 1;
}

export function newRule(type: AutotestType, id: string): AutotestRule {
  const common = { id, points: 1 };
  switch (type) {
    case "exists":
      return { ...common, type, selector: "", min: 1 };
    case "count":
      return { ...common, type, selector: "", count: 1 };
    case "text":
      return { ...common, type, selector: "", text: "" };
    case "attribute":
      return { ...common, type, selector: "", attribute: "", value: "" };
    case "style":
      return { ...common, type, selector: "", property: "", value: "" };
    case "click":
      return { ...common, type, selector: "", target: "", text: "" };
    case "input":
      return { ...common, type, selector: "", value: "", button: "", target: "", text: "" };
    case "console":
      return { ...common, type, text: "" };
    case "noErrors":
      return { ...common, type };
    case "code":
      return { ...common, type, file: "html", pattern: "" };
  }
}

// ───────────── Results ─────────────

export type AutotestFailure = "notFound" | "invalidSelector" | "mismatch" | "timeout" | "error";
export type AutotestResult = { id: string; passed: boolean; reason?: AutotestFailure; actual?: string };

const resultSchema = z.object({
  id: z.string().max(64),
  passed: z.boolean(),
  reason: z.enum(["notFound", "invalidSelector", "mismatch", "timeout", "error"]).optional(),
  actual: z.string().max(300).optional(),
});

/** One result per rule, in rule order; anything missing or malformed counts as failed. */
export function parseResults(value: unknown, rules: AutotestRule[]): AutotestResult[] {
  const parsed = z.array(z.unknown()).safeParse(value);
  const byId = new Map<string, AutotestResult>();
  for (const item of parsed.success ? parsed.data : []) {
    const result = resultSchema.safeParse(item);
    if (result.success) byId.set(result.data.id, result.data);
  }
  return rules.map((rule) => byId.get(rule.id) ?? { id: rule.id, passed: false, reason: "error" });
}

export function autotestScore(rules: AutotestRule[], results: AutotestResult[]) {
  if (rules.length === 0) return null;
  const passed = new Set(results.filter((r) => r.passed).map((r) => r.id));
  const total = rules.reduce((sum, rule) => sum + rule.points, 0);
  const earned = rules.reduce((sum, rule) => sum + (passed.has(rule.id) ? rule.points : 0), 0);
  return Math.round((earned / total) * 100);
}

/** "Code contains" rules don't need a browser. */
export function runCodeRules(rules: AutotestRule[], code: CodeFiles): AutotestResult[] {
  return rules.flatMap((rule) =>
    rule.type === "code" ? [{ id: rule.id, passed: code[rule.file].toLowerCase().includes(rule.pattern.toLowerCase()) }] : [],
  );
}
