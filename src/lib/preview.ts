export type CodeFiles = { html: string; css: string; js: string };

export type PreviewMessage = {
  __cubick: true;
  level: "log" | "info" | "warn" | "error";
  args: string[];
};

// Runs inside the preview iframe: forwards console output and errors to the parent page.
// Kept on one line so the line numbers of the student's script can be computed.
const bridge = (scriptLineOffset: number) =>
  `<script>(function(){var O=${scriptLineOffset};function f(v){try{if(typeof v==="string")return v;if(v instanceof Error)return v.name+": "+v.message;if(typeof Element!=="undefined"&&v instanceof Element)return v.outerHTML.slice(0,300);if(typeof v==="function")return v.toString().slice(0,300);var s=JSON.stringify(v);return s===undefined?String(v):s}catch(e){return String(v)}}function send(l,a){try{parent.postMessage({__cubick:true,level:l,args:Array.prototype.map.call(a,f)},"*")}catch(e){}}["log","info","warn","error"].forEach(function(l){var o=console[l];console[l]=function(){send(l,arguments);o.apply(console,arguments)}});window.addEventListener("error",function(e){var line=e.lineno&&e.lineno>O?" ("+(e.lineno-O)+")":"";send("error",[(e.message||"Error")+line])});window.addEventListener("unhandledrejection",function(e){send("error",["Unhandled promise rejection: "+f(e.reason)])})})();</script>`;

/**
 * Builds the preview document from the student's three files.
 * The iframe must be sandboxed without allow-same-origin.
 */
export function buildPreviewDocument({ html, css, js }: CodeFiles) {
  const head = (offset: number) =>
    `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${bridge(offset)}\n<style>\n${css.replace(/<\/style/gi, "<\\/style")}\n</style>\n</head>\n<body>\n${html}\n<script>\n`;

  // The bridge is a single line, so the offset value doesn't change the line count
  const offset = head(0).split("\n").length - 1;
  return `${head(offset)}${js.replace(/<\/script/gi, "<\\/script")}\n</script>\n</body>\n</html>`;
}
