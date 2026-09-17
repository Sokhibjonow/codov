import type { CodeFiles } from "@/lib/preview";

export const CODE_FILES = [
  { key: "html", label: "index.html", monacoLanguage: "html" },
  { key: "css", label: "style.css", monacoLanguage: "css" },
  { key: "js", label: "script.js", monacoLanguage: "javascript" },
] as const satisfies readonly { key: keyof CodeFiles; label: string; monacoLanguage: string }[];

export type CodeFileIndex = 0 | 1 | 2;

export function fileIndex(key: keyof CodeFiles): CodeFileIndex {
  return CODE_FILES.findIndex((f) => f.key === key) as CodeFileIndex;
}
