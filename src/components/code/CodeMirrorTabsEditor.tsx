"use client";

import type { Transaction } from "@codemirror/state";
import { useState } from "react";
import { LONG_INSERT, type EditChange, type EventKind } from "@/lib/integrity";
import type { CodeFiles } from "@/lib/preview";
import { CodeEditor } from "./CodeEditor";
import { FileTabs } from "./FileTabs";
import { CODE_FILES, type CodeFileIndex } from "./files";

export type CodeMirrorTabsEditorProps = {
  code: CodeFiles;
  onChange?: (file: keyof CodeFiles, value: string) => void;
  readOnly?: boolean;
  activeFile?: keyof CodeFiles;
  onEdit?: (file: CodeFileIndex, changes: EditChange[], kind: EventKind) => void;
  className?: string;
};

function describeTransaction(transaction: Transaction): { changes: EditChange[]; kind: EventKind } {
  const changes: EditChange[] = [];
  // iterChanges reports positions in the old document; shift them so the changes apply one after another
  let shift = 0;
  transaction.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    const text = inserted.toString();
    changes.push({ from: fromA + shift, to: toA + shift, text });
    shift += text.length - (toA - fromA);
  });

  let kind: EventKind = "x";
  if (transaction.isUserEvent("input.paste") || transaction.isUserEvent("input.drop")) kind = "p";
  else if (transaction.isUserEvent("undo") || transaction.isUserEvent("redo")) kind = "u";
  else if (transaction.isUserEvent("delete")) kind = "d";
  else if (transaction.isUserEvent("input")) {
    kind = changes.some((c) => c.text.trim().length > LONG_INSERT) ? "p" : "t";
  }
  return { changes, kind };
}

/** Lightweight CodeMirror editor, used on phones and tablets where Monaco doesn't work well. */
export function CodeMirrorTabsEditor({ code, onChange, readOnly, activeFile, onEdit, className = "" }: CodeMirrorTabsEditorProps) {
  const [selected, setSelected] = useState<keyof CodeFiles>("html");
  const active = activeFile ?? selected;

  return (
    <div className={`flex min-h-0 flex-col bg-[#282c34] ${className}`}>
      <FileTabs active={active} onSelect={setSelected} theme="onedark" />
      {CODE_FILES.map(({ key, label }, index) => (
        <CodeEditor
          key={key}
          language={key}
          label={label}
          value={code[key]}
          readOnly={readOnly}
          onChange={(value) => onChange?.(key, value)}
          onTransaction={
            onEdit &&
            ((transaction) => {
              const { changes, kind } = describeTransaction(transaction);
              onEdit(index as CodeFileIndex, changes, kind);
            })
          }
          className={active === key ? "min-h-0 flex-1" : "hidden"}
        />
      ))}
    </div>
  );
}
