"use client";

import { useSyncExternalStore } from "react";
import { CodeMirrorTabsEditor, type CodeMirrorTabsEditorProps } from "./CodeMirrorTabsEditor";
import { MonacoTabsEditor } from "./MonacoTabsEditor";

const TOUCH_QUERY = "(pointer: coarse)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(TOUCH_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * The code editor used everywhere on the site: the VS Code editor (Monaco) on computers,
 * a lightweight editor on phones and tablets, where Monaco isn't supported.
 */
export function CodeTabsEditor(props: CodeMirrorTabsEditorProps) {
  const touch = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(TOUCH_QUERY).matches,
    () => null,
  );

  if (touch === null) return <div className={`bg-[#1e1e1e] ${props.className ?? ""}`} />;
  return touch ? <CodeMirrorTabsEditor {...props} /> : <MonacoTabsEditor {...props} />;
}
