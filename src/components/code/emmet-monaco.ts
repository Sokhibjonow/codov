import type { OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditor, languages as MonacoLanguages, Position } from "monaco-editor";
import { emmetExpansion, type EmmetLanguage } from "./emmet";

type Monaco = Parameters<OnMount>[1];

// Emmet suggestions like in VS Code: typing `h1`, `div.card`, `ul>li*3` or `!` shows an "Emmet" item.

const registered = new WeakSet<object>();

/** Expansions offered per model, to tell an accepted Emmet suggestion from pasted code (whitespace-insensitive). */
const offered = new Map<string, Set<string>>();
const MAX_REMEMBERED = 50;

const withoutFields = (snippet: string) => snippet.replace(/\$\{\d+(?::([^}]*))?\}/g, "$1");
const compact = (text: string) => text.replace(/\s+/g, "");

function remember(modelUri: string, snippet: string) {
  const set = offered.get(modelUri) ?? new Set<string>();
  set.add(compact(withoutFields(snippet)));
  if (set.size > MAX_REMEMBERED) set.delete(set.values().next().value as string);
  offered.set(modelUri, set);
}

/** True when `text` inserted into the model is one of the Emmet expansions just offered there. */
export function isOfferedEmmetExpansion(model: MonacoEditor.ITextModel, text: string) {
  const key = compact(text);
  return key.length > 0 && (offered.get(model.uri.toString())?.has(key) ?? false);
}

export function forgetEmmetModel(model: MonacoEditor.ITextModel) {
  offered.delete(model.uri.toString());
}

export function createEmmetCompletionProvider(monaco: Monaco, language: EmmetLanguage): MonacoLanguages.CompletionItemProvider {
  return {
    triggerCharacters: language === "html" ? ["!", ".", "#", ">", "+", "*", "]", "}", ")"] : [],
    provideCompletionItems(model: MonacoEditor.ITextModel, position: Position) {
      const line = model.getLineContent(position.lineNumber);
      const column = position.column - 1;
      const expansion = emmetExpansion(language, line, column, () =>
        model.getValueInRange(new monaco.Range(1, 1, position.lineNumber, position.column)),
      );
      if (!expansion) return { suggestions: [] };

      remember(model.uri.toString(), expansion.snippet);
      const abbreviation = line.slice(column - expansion.length, column);

      return {
        suggestions: [
          {
            label: abbreviation,
            filterText: abbreviation,
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: "Emmet",
            documentation: { value: `\`\`\`${language}\n${withoutFields(expansion.snippet)}\n\`\`\`` },
            insertText: expansion.snippet,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: new monaco.Range(position.lineNumber, position.column - expansion.length, position.lineNumber, position.column),
            // First in the list and selected, as in VS Code
            sortText: "!",
            preselect: true,
          },
        ],
      };
    },
  };
}

export function registerEmmetSuggestions(monaco: Monaco) {
  if (registered.has(monaco)) return;
  registered.add(monaco);
  for (const language of ["html", "css"] as const) {
    monaco.languages.registerCompletionItemProvider(language, createEmmetCompletionProvider(monaco, language));
  }
}
