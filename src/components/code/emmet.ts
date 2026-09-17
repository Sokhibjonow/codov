import expand, { extract } from "emmet";

// Emmet like in VS Code: `!` + Tab, `div.card>p*3` + Tab, `m10` + Tab in CSS.

const HTML_TAGS = new Set(
  (
    "a abbr address article aside audio b blockquote body br button canvas caption cite code col colgroup dd details dialog div dl dt " +
    "em fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hr html i iframe img input label legend li link main mark " +
    "meta nav noscript ol optgroup option output p picture pre progress q s script section select small source span strong style sub " +
    "summary sup svg table tbody td template textarea tfoot th thead time title tr u ul video"
  ).split(" "),
);

export type EmmetLanguage = "html" | "css";

export type EmmetExpansion = {
  /** Snippet in Monaco/VS Code syntax with ${1:placeholder} tab stops */
  snippet: string;
  /** How many characters before the cursor the abbreviation takes */
  length: number;
};

/**
 * Returns the expansion for the abbreviation right before the cursor, or null when Tab
 * should just indent (plain words, text inside a tag, CSS selectors…).
 *
 * @param line      the whole current line
 * @param column    0-based cursor position in the line
 * @param textBefore the whole document before the abbreviation (CSS: to check we're inside { })
 */
export function emmetExpansion(language: EmmetLanguage, line: string, column: number, textBefore: () => string): EmmetExpansion | null {
  const type = language === "css" ? "stylesheet" : "markup";
  const extracted = extract(line, column, { type, lookAhead: false });
  if (!extracted || extracted.end !== column || !extracted.abbreviation) return null;

  const abbreviation = extracted.abbreviation;
  const before = line.slice(0, extracted.start);

  if (language === "html") {
    // Inside `<div class="…` Tab is not an abbreviation
    if (before.lastIndexOf("<") > before.lastIndexOf(">")) return null;
    const head = /^[a-z][a-z0-9]*/i.exec(abbreviation)?.[0]?.toLowerCase();
    const isEmmet = abbreviation === "!" || /[.#>+*{[(^]/.test(abbreviation) || (head !== undefined && head === abbreviation.toLowerCase() && HTML_TAGS.has(head));
    if (!isEmmet) return null;
  } else {
    // Properties only: at the start of a line inside { }
    if (before.trim() !== "") return null;
    const text = textBefore();
    if ((text.match(/{/g) ?? []).length <= (text.match(/}/g) ?? []).length) return null;
  }

  try {
    const snippet = expand(abbreviation, {
      type,
      syntax: language,
      options: {
        "output.indent": "  ",
        "output.field": (index: number, placeholder: string) => `\${${index}${placeholder ? `:${placeholder}` : ""}}`,
      },
    });
    if (!snippet.trim() || snippet === abbreviation) return null;
    return { snippet, length: column - extracted.start };
  } catch {
    return null;
  }
}
