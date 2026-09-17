"use client";

import Editor, { loader, type OnMount } from "@monaco-editor/react";
import { Loader2 } from "lucide-react";
import type { editor as MonacoEditor, IDisposable } from "monaco-editor";
import { useEffect, useId, useRef, useState } from "react";
import type { EditChange, EventKind } from "@/lib/integrity";
import type { CodeFiles } from "@/lib/preview";
import { emmetExpansion } from "./emmet";
import { forgetEmmetModel, isOfferedEmmetExpansion, registerEmmetSuggestions } from "./emmet-monaco";
import { FileTabs } from "./FileTabs";
import { CODE_FILES, fileIndex, type CodeFileIndex } from "./files";

// Served from our own site (copied by scripts/copy-monaco.mjs), not from a CDN
loader.config({ paths: { vs: "/monaco/vs" } });

type Monaco = Parameters<OnMount>[1];

export type MonacoTabsEditorProps = {
  code: CodeFiles;
  onChange?: (file: keyof CodeFiles, value: string) => void;
  readOnly?: boolean;
  activeFile?: keyof CodeFiles;
  onEdit?: (file: CodeFileIndex, changes: EditChange[], kind: EventKind) => void;
  className?: string;
};

const toLf = (text: string) => text.replace(/\r\n?/g, "\n");

/** The VS Code editor (Monaco) with index.html / style.css / script.js tabs and Emmet on Tab. */
export function MonacoTabsEditor({ code, onChange, readOnly = false, activeFile, onEdit, className = "" }: MonacoTabsEditorProps) {
  const [selected, setSelected] = useState<keyof CodeFiles>("html");
  const active = activeFile ?? selected;

  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const modelsRef = useRef<MonacoEditor.ITextModel[]>([]);
  const viewStates = useRef(new Map<number, MonacoEditor.ICodeEditorViewState | null>());
  const disposeRef = useRef<(() => void) | null>(null);
  // What caused the next content change: our own sync, a paste, an Emmet expansion
  const cause = useRef({ external: false, pasting: false, snippet: false });
  const latest = useRef({ code, onChange, onEdit, active, readOnly });
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    latest.current = { code, onChange, onEdit, active, readOnly };
  });

  useEffect(() => () => disposeRef.current?.(), []);

  const handleMount: OnMount = (editor, monaco: Monaco) => {
    editorRef.current = editor;
    registerEmmetSuggestions(monaco);
    const disposables: IDisposable[] = [];

    const models = CODE_FILES.map(({ key, label, monacoLanguage }, index) => {
      const uri = monaco.Uri.parse(`file:///${instanceId}/${label}`);
      monaco.editor.getModel(uri)?.dispose();

      cause.current.external = true;
      const model = monaco.editor.createModel(toLf(latest.current.code[key]), monacoLanguage, uri);
      // Windows would default to \r\n and break the recorded positions
      model.setEOL(monaco.editor.EndOfLineSequence.LF);
      model.updateOptions({ tabSize: 2, insertSpaces: true });
      cause.current.external = false;

      disposables.push(
        model.onDidChangeContent((event: MonacoEditor.IModelContentChangedEvent) => {
          const c = cause.current;
          let kind: EventKind = c.external
            ? "x"
            : event.isUndoing || event.isRedoing
              ? "u"
              : c.pasting
                ? "p"
                : c.snippet
                  ? "s"
                  : event.changes.every((change: MonacoEditor.IModelContentChange) => change.text === "")
                    ? "d"
                    : "t";
          // An accepted Emmet suggestion arrives as ordinary typing
          if (kind === "t" && event.changes.some((change: MonacoEditor.IModelContentChange) => change.text.length > 1 && isOfferedEmmetExpansion(model, change.text))) {
            kind = "s";
          }
          // Applying from the end keeps the original offsets valid one after another
          const changes = [...event.changes]
            .sort((a, b) => b.rangeOffset - a.rangeOffset)
            .map((change) => ({ from: change.rangeOffset, to: change.rangeOffset + change.rangeLength, text: change.text }));
          latest.current.onEdit?.(index as CodeFileIndex, changes, kind);
          if (!c.external) latest.current.onChange?.(key, model.getValue());

          // Some operations fall back to the OS line ending; keep \n so recorded positions stay valid
          if (model.getEOL() !== "\n") {
            queueMicrotask(() => {
              if (model.isDisposed()) return;
              cause.current.external = true;
              model.setEOL(monaco.editor.EndOfLineSequence.LF);
              cause.current.external = false;
            });
          }
        }),
      );
      return model;
    });
    modelsRef.current = models;

    const defaultModel = editor.getModel();
    editor.setModel(models[fileIndex(latest.current.active)]);
    defaultModel?.dispose();
    editor.updateOptions({ readOnly: latest.current.readOnly });

    // Paste and drop arrive as DOM events right before Monaco applies them
    const container = editor.getContainerDomNode();
    const markPaste = () => {
      cause.current.pasting = true;
      setTimeout(() => (cause.current.pasting = false), 0);
    };
    container.addEventListener("paste", markPaste, true);
    container.addEventListener("drop", markPaste, true);

    editor.addCommand(
      monaco.KeyCode.Tab,
      () => {
        const model = editor.getModel();
        const position = editor.getPosition();
        const language = model?.getLanguageId();
        const expansion =
          model && position && (language === "html" || language === "css")
            ? emmetExpansion(language, model.getLineContent(position.lineNumber), position.column - 1, () =>
                model.getValueInRange(new monaco.Range(1, 1, position.lineNumber, position.column)),
              )
            : null;

        if (!expansion) {
          editor.trigger("keyboard", "tab", null);
          return;
        }
        const snippets = editor.getContribution("snippetController2") as unknown as {
          insert: (template: string, options: { overwriteBefore: number }) => void;
        } | null;
        cause.current.snippet = true;
        try {
          snippets?.insert(expansion.snippet, { overwriteBefore: expansion.length });
        } finally {
          cause.current.snippet = false;
        }
      },
      "editorTextFocus && !editorReadonly && !suggestWidgetVisible && !inSnippetMode && !editorHasSelection && !editorTabMovesFocus",
    );

    disposeRef.current = () => {
      container.removeEventListener("paste", markPaste, true);
      container.removeEventListener("drop", markPaste, true);
      disposables.forEach((d) => d.dispose());
      models.forEach((m) => {
        forgetEmmetModel(m);
        m.dispose();
      });
    };
  };

  // Switch file tab, keeping cursor and scroll position of each file
  useEffect(() => {
    const editor = editorRef.current;
    const models = modelsRef.current;
    if (!editor || models.length === 0) return;
    const next = models[fileIndex(active)];
    const current = editor.getModel();
    if (current === next) return;
    const currentIndex = models.indexOf(current as MonacoEditor.ITextModel);
    if (currentIndex >= 0) viewStates.current.set(currentIndex, editor.saveViewState());
    editor.setModel(next);
    const state = viewStates.current.get(fileIndex(active));
    if (state) editor.restoreViewState(state);
    if (!latest.current.readOnly) editor.focus();
  }, [active]);

  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly });
  }, [readOnly]);

  // Sync code changed from outside (reset to starter code, replay frames)
  useEffect(() => {
    CODE_FILES.forEach(({ key }, index) => {
      const model = modelsRef.current[index];
      const value = toLf(code[key]);
      if (!model || model.getValue() === value) return;
      cause.current.external = true;
      model.pushEditOperations([], [{ range: model.getFullModelRange(), text: value }], () => null);
      cause.current.external = false;
    });
  }, [code]);

  return (
    <div className={`flex min-h-0 flex-col bg-[#1e1e1e] ${className}`}>
      <FileTabs active={active} onSelect={setSelected} theme="vscode" />
      <div className="min-h-0 flex-1">
        <Editor
          theme="vs-dark"
          keepCurrentModel
          onMount={handleMount}
          loading={<Loader2 size={24} className="animate-spin text-[#969696]" />}
          options={{
            automaticLayout: true,
            fontSize: 14,
            lineHeight: 22,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true, indentation: true },
            linkedEditing: true,
            renderLineHighlight: "all",
            smoothScrolling: true,
            cursorBlinking: "smooth",
            fixedOverflowWidgets: true,
            // Enter still makes a new line after `p` unless a suggestion really changes the text
            acceptSuggestionOnEnter: "smart",
            tabCompletion: "off",
            padding: { top: 8 },
          }}
        />
      </div>
    </div>
  );
}
