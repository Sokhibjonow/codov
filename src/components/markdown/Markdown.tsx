import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { MEDIA_BASE } from "@/lib/preview";
import { splitContent } from "./parse";

const components: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  // eslint-disable-next-line @next/next/no-img-element
  img: ({ src, alt }) => <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" />,
  table: ({ children }) => (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  ),
};

const FRAME_SANDBOX = "allow-scripts allow-modals allow-forms allow-popups";

function MarkdownText({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
      {text}
    </ReactMarkdown>
  );
}

function ResultFrame({ label, code, src }: { label: string; code?: string; src?: string }) {
  return (
    <div className="live-example-frame">
      {/* No allow-same-origin: the page can run scripts but can't touch the platform */}
      {src ? (
        <iframe title={label} sandbox={FRAME_SANDBOX} src={src} loading="lazy" />
      ) : (
        <iframe title={label} sandbox={FRAME_SANDBOX} srcDoc={MEDIA_BASE + code} loading="lazy" />
      )}
    </div>
  );
}

type MarkdownProps = {
  content: string;
  resultLabel: string;
  /** Teacher preview: marks result-only blocks as hidden from students */
  hiddenCodeNote?: string;
  /**
   * Student pages: URL of each result-only block. When given, the block's code is not put
   * into the page at all — the frame loads it from the server after an access check.
   */
  resultUrl?: (index: number) => string;
};

/** Renders lesson Markdown. Raw HTML in the text is not rendered (react-markdown escapes it). */
export function Markdown({ content, resultLabel, hiddenCodeNote, resultUrl }: MarkdownProps) {
  return (
    <div className="markdown">
      {splitContent(content).map((part, i) => {
        switch (part.kind) {
          case "live":
            return (
              <div key={i} className="live-example">
                <MarkdownText text={`\`\`\`html\n${part.code}\n\`\`\``} />
                <div className="live-example-label">{resultLabel}</div>
                <ResultFrame label={resultLabel} code={part.code} />
              </div>
            );
          case "result":
            return (
              <div key={i} className="live-example">
                <div className="live-example-label">
                  {resultLabel}
                  {hiddenCodeNote && <span className="normal-case"> · {hiddenCodeNote}</span>}
                </div>
                {resultUrl ? (
                  <ResultFrame label={resultLabel} src={resultUrl(part.index)} />
                ) : (
                  <ResultFrame label={resultLabel} code={part.code} />
                )}
              </div>
            );
          case "video":
            return (
              <div key={i} className="video-embed my-4">
                <iframe
                  src={part.src}
                  title="YouTube"
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            );
          default:
            return <MarkdownText key={i} text={part.text} />;
        }
      })}
    </div>
  );
}
