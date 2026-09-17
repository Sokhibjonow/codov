import { youtubeEmbedUrl } from "@/lib/attachments";
import { DOCUMENT_END, DOCUMENT_START } from "./html-detect";

export type ContentPart =
  | { kind: "markdown"; text: string }
  /** ```html-live — code and its result, both visible to students */
  | { kind: "live"; code: string }
  /** ```html-result or a bare HTML page — only the result; the code is never sent to students */
  | { kind: "result"; code: string; index: number }
  | { kind: "video"; src: string };

/**
 * Splits lesson Markdown into the parts react-markdown renders and the blocks we render ourselves.
 * Anything inside ordinary code fences is left untouched.
 */
export function splitContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let buffer: string[] = [];
  let fence: { open: string; type: "live" | "result" | null; lines: string[] } | null = null;
  let htmlDocument: string[] | null = null;
  let resultIndex = 0;

  const flush = () => {
    if (buffer.join("").trim()) parts.push({ kind: "markdown", text: buffer.join("\n") });
    buffer = [];
  };
  const pushResult = (code: string) => {
    flush();
    parts.push({ kind: "result", code, index: resultIndex++ });
  };

  for (const line of content.split(/\r?\n/)) {
    if (fence) {
      if (/^```\s*$/.test(line)) {
        const code = fence.lines.join("\n");
        if (fence.type === "live") {
          flush();
          parts.push({ kind: "live", code });
        } else if (fence.type === "result") {
          pushResult(code);
        } else {
          buffer.push(fence.open, ...fence.lines, line);
        }
        fence = null;
      } else {
        fence.lines.push(line);
      }
      continue;
    }

    if (htmlDocument || DOCUMENT_START.test(line)) {
      htmlDocument = [...(htmlDocument ?? []), line];
      if (DOCUMENT_END.test(line)) {
        pushResult(htmlDocument.join("\n"));
        htmlDocument = null;
      }
      continue;
    }

    const open = /^```\s*([\w-]*)/.exec(line);
    if (open) {
      const type = open[1] === "html-live" ? "live" : open[1] === "html-result" ? "result" : null;
      fence = { open: line, type, lines: [] };
      continue;
    }

    const video = /^\s*<?(https?:\/\/\S+?)>?\s*$/.exec(line);
    const embed = video && youtubeEmbedUrl(video[1]);
    if (embed) {
      flush();
      parts.push({ kind: "video", src: embed });
      continue;
    }

    buffer.push(line);
  }

  // An unclosed fence is shown as plain text; an unfinished HTML page still runs as a result
  if (fence) buffer.push(fence.open, ...fence.lines);
  if (htmlDocument) pushResult(htmlDocument.join("\n"));
  flush();
  return parts;
}

/** Code of the result-only blocks, in order — served to students by /results/... */
export function resultBlocks(content: string) {
  return splitContent(content).flatMap((part) => (part.kind === "result" ? [part.code] : []));
}
