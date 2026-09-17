"use client";

import type { CodeFiles } from "@/lib/preview";
import { CODE_FILES } from "./files";

const themes = {
  // VS Code "Dark+" colors
  vscode: { bar: "bg-[#252526]", active: "border-t-[#0078d4] bg-[#1e1e1e] text-white", idle: "border-t-transparent text-[#969696] hover:text-white" },
  onedark: { bar: "bg-[#21252b]", active: "border-t-transparent bg-[#282c34] text-white", idle: "border-t-transparent text-[#9da5b4] hover:text-white" },
};

export function FileTabs({
  active,
  onSelect,
  theme,
}: {
  active: keyof CodeFiles;
  onSelect: (key: keyof CodeFiles) => void;
  theme: keyof typeof themes;
}) {
  const colors = themes[theme];
  return (
    <div role="tablist" className={`flex shrink-0 overflow-x-auto ${colors.bar}`}>
      {CODE_FILES.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={active === key}
          onClick={() => onSelect(key)}
          className={`border-t-2 px-4 py-2 font-mono text-xs font-semibold transition-colors ${active === key ? colors.active : colors.idle}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
