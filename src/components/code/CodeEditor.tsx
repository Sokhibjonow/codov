"use client";

import { indentWithTab } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { indentUnit } from "@codemirror/language";
import { Compartment, EditorState, type Transaction } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { useEffect, useRef } from "react";

export type CodeLanguage = "html" | "css" | "js";

const languages = { html: () => html(), css: () => css(), js: () => javascript() };

const layout = EditorView.theme({
  "&": { height: "100%" },
  ".cm-scroller": { fontFamily: "var(--font-jetbrains), ui-monospace, monospace", lineHeight: "1.6" },
});

const readOnlyExtension = (readOnly: boolean) => [EditorState.readOnly.of(readOnly), EditorView.editable.of(!readOnly)];

type CodeEditorProps = {
  value: string;
  language: CodeLanguage;
  onChange: (value: string) => void;
  label: string;
  readOnly?: boolean;
  /** Every document-changing transaction, e.g. for recording how the code was written */
  onTransaction?: (transaction: Transaction) => void;
  className?: string;
};

/** CodeMirror 6 editor. Uncontrolled inside; external `value` changes (e.g. reset) are synced in. */
export function CodeEditor({ value, language, onChange, label, readOnly = false, onTransaction, className }: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const latest = useRef({ onChange, onTransaction, readOnly });
  const initialValueRef = useRef(value);
  const readOnlyCompartment = useRef(new Compartment());

  // Declared first so the creation effect below sees the current props
  useEffect(() => {
    latest.current = { onChange, onTransaction, readOnly };
  });

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initialValueRef.current,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          indentUnit.of("  "),
          EditorState.tabSize.of(2),
          languages[language](),
          oneDark,
          layout,
          readOnlyCompartment.current.of(readOnlyExtension(latest.current.readOnly)),
          EditorView.contentAttributes.of({ "aria-label": label, autocapitalize: "off", autocorrect: "off" }),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            for (const transaction of update.transactions) {
              if (transaction.docChanged) latest.current.onTransaction?.(transaction);
            }
            latest.current.onChange(update.state.doc.toString());
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, label]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: readOnlyCompartment.current.reconfigure(readOnlyExtension(readOnly)) });
  }, [readOnly]);

  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div ref={hostRef} className={`code-editor ${className ?? ""}`} />;
}
