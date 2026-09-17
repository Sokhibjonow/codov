/** Pasted text that is HTML code (a page or a fragment) rather than lesson prose. */
export function looksLikeHtmlCode(text: string) {
  const s = text.trim();
  if (!s.startsWith("<") || s.includes("```")) return false;
  return /^<!doctype html/i.test(s) || /<\/[a-z][\w-]*\s*>/i.test(s);
}

export const DOCUMENT_START = /^\s*(<!doctype html|<html[\s>])/i;
export const DOCUMENT_END = /<\/html>\s*$/i;
