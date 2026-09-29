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
 * Relative image paths in students' pages ("img12.jpg", "img/img12.jpg") resolve to the shared
 * picture folder public/media, like files next to the page in a real project.
 */
export const MEDIA_BASE = '<base href="/media/">';

export type StorageItems = Record<string, string>;

export type StorageMessage = { __cubickStorage: true; items: StorageItems };

/** Upper bound for what a page may keep in its stand-in storage (characters of keys + values). */
export const MAX_STORAGE_CHARS = 200_000;

/**
 * A sandboxed frame without allow-same-origin can't use the real localStorage (it throws a
 * SecurityError), so lessons about it would break. This stand-in keeps the items in memory,
 * starting from `items`; with `persist` it posts every change to the parent, which can pass the
 * items into the next run — like data surviving a page reload.
 */
export function storageShim(items: StorageItems = {}, persist = false) {
  const initial = JSON.stringify(items).replace(/</g, "\\u003c");
  return `<script>(function(){try{window.localStorage.getItem("x");return}catch(e){}var M=${MAX_STORAGE_CHARS};function make(init,post){var d=Object.create(null);Object.keys(init).forEach(function(k){d[k]=String(init[k])});function size(){var n=0;for(var k in d)n+=k.length+d[k].length;return n}function save(){if(post)try{parent.postMessage({__cubickStorage:true,items:Object.assign({},d)},"*")}catch(e){}}function S(){}S.prototype.getItem=function(k){k=String(k);return k in d?d[k]:null};S.prototype.setItem=function(k,v){k=String(k);var old=d[k];d[k]=String(v);if(size()>M){if(old===undefined)delete d[k];else d[k]=old;throw new DOMException("The quota has been exceeded.","QuotaExceededError")}save()};S.prototype.removeItem=function(k){delete d[String(k)];save()};S.prototype.clear=function(){for(var k in d)delete d[k];save()};S.prototype.key=function(i){var ks=Object.keys(d);return i>=0&&i<ks.length?ks[i]:null};Object.defineProperty(S.prototype,"length",{get:function(){return Object.keys(d).length}});return new S()}try{Object.defineProperty(window,"localStorage",{value:make(${initial},${persist}),configurable:true});Object.defineProperty(window,"sessionStorage",{value:make({},false),configurable:true})}catch(e){}})();</script>`;
}

/** Everything a sandboxed example frame needs before the page itself: picture folder and storage. */
export const FRAME_HEAD = MEDIA_BASE + storageShim();

/**
 * Builds the preview document from the student's three files.
 * The iframe must be sandboxed without allow-same-origin.
 */
export function buildPreviewDocument({ html, css, js }: CodeFiles, storage: StorageItems = {}) {
  const head = (offset: number) =>
    `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n${MEDIA_BASE}\n${bridge(offset)}\n${storageShim(storage, true)}\n<style>\n${css.replace(/<\/style/gi, "<\\/style")}\n</style>\n</head>\n<body>\n${html}\n<script>\n`;

  // The bridge is a single line, so the offset value doesn't change the line count
  const offset = head(0).split("\n").length - 1;
  return `${head(offset)}${js.replace(/<\/script/gi, "<\\/script")}\n</script>\n</body>\n</html>`;
}
