import type { AutotestRule } from "./autotests";
import type { CodeFiles } from "./preview";

export type RunnerMessage = { __cubickTests: true; runId: string; results: unknown };

// Collects console output and errors before the student's code runs.
const PRELUDE = `<script>(function(){var L=window.__cubickLogs=[];var E=window.__cubickErrors=[];function s(a){try{return typeof a==="string"?a:JSON.stringify(a)}catch(e){return String(a)}}["log","info","warn","error"].forEach(function(l){var o=console[l];console[l]=function(){try{L.push(Array.prototype.map.call(arguments,s).join(" "))}catch(e){}return o.apply(console,arguments)}});window.addEventListener("error",function(e){E.push(e.message||"error")});window.addEventListener("unhandledrejection",function(e){E.push("Unhandled rejection: "+s(e.reason))})})();</script>`;

// Plain JavaScript on purpose: it runs inside the student's page as-is, without any build step.
const RUNNER = `(function (config) {
  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function norm(s) { return String(s == null ? "" : s).replace(/\\s+/g, " ").trim().toLowerCase(); }
  function short(s) { s = String(s == null ? "" : s).replace(/\\s+/g, " ").trim(); return s.length > 120 ? s.slice(0, 117) + "..." : s; }
  function query(sel) {
    try { return { list: Array.prototype.slice.call(document.querySelectorAll(sel)) }; }
    catch (e) { return { invalid: true, list: [] }; }
  }
  function textOf(el) {
    return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") ? el.value : el ? el.textContent : "";
  }
  function containsText(list, expected) {
    return list.some(function (el) { return norm(textOf(el)).indexOf(norm(expected)) >= 0; });
  }
  function canonicalStyle(property, value) {
    var probe = document.createElement("div");
    probe.style.setProperty(property, value);
    if (!probe.style.getPropertyValue(property)) return norm(value);
    probe.style.position = "absolute";
    document.body.appendChild(probe);
    var result = getComputedStyle(probe).getPropertyValue(property);
    probe.remove();
    return norm(result);
  }
  function result(rule, passed, reason, actual) {
    var r = { id: rule.id, passed: passed };
    if (!passed && reason) r.reason = reason;
    if (!passed && actual !== undefined) r.actual = short(actual);
    return r;
  }
  function targetText(rule) {
    var t = query(rule.target);
    if (t.invalid) return result(rule, false, "invalidSelector");
    if (!t.list.length) return result(rule, false, "notFound");
    return result(rule, containsText(t.list, rule.text), "mismatch", textOf(t.list[0]));
  }
  async function check(rule) {
    var q;
    switch (rule.type) {
      case "exists":
        q = query(rule.selector);
        if (q.invalid) return result(rule, false, "invalidSelector");
        return result(rule, q.list.length >= rule.min, q.list.length ? "mismatch" : "notFound", String(q.list.length));
      case "count":
        q = query(rule.selector);
        if (q.invalid) return result(rule, false, "invalidSelector");
        return result(rule, q.list.length === rule.count, "mismatch", String(q.list.length));
      case "text":
        q = query(rule.selector);
        if (q.invalid) return result(rule, false, "invalidSelector");
        if (!q.list.length) return result(rule, false, "notFound");
        return result(rule, containsText(q.list, rule.text), "mismatch", textOf(q.list[0]));
      case "attribute":
        q = query(rule.selector);
        if (q.invalid) return result(rule, false, "invalidSelector");
        if (!q.list.length) return result(rule, false, "notFound");
        var ok = q.list.some(function (el) {
          return rule.value ? norm(el.getAttribute(rule.attribute)) === norm(rule.value) : el.hasAttribute(rule.attribute);
        });
        var current = q.list[0].getAttribute(rule.attribute);
        return result(rule, ok, "mismatch", current == null ? "—" : current);
      case "style":
        q = query(rule.selector);
        if (q.invalid) return result(rule, false, "invalidSelector");
        if (!q.list.length) return result(rule, false, "notFound");
        var actual = norm(getComputedStyle(q.list[0]).getPropertyValue(rule.property));
        var expected = canonicalStyle(rule.property, rule.value);
        return result(rule, actual === expected || actual === norm(rule.value), "mismatch", actual);
      case "click":
        q = query(rule.selector);
        if (q.invalid) return result(rule, false, "invalidSelector");
        if (!q.list.length) return result(rule, false, "notFound");
        q.list[0].click();
        await wait(250);
        return targetText(rule);
      case "input":
        q = query(rule.selector);
        if (q.invalid) return result(rule, false, "invalidSelector");
        if (!q.list.length) return result(rule, false, "notFound");
        var field = q.list[0];
        if (field.focus) field.focus();
        field.value = rule.value;
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
        var b = query(rule.button);
        if (b.invalid) return result(rule, false, "invalidSelector");
        if (!b.list.length) return result(rule, false, "notFound");
        b.list[0].click();
        await wait(250);
        return targetText(rule);
      case "console":
        var logs = window.__cubickLogs || [];
        var found = logs.some(function (line) { return norm(line).indexOf(norm(rule.text)) >= 0; });
        return result(rule, found, "mismatch", logs.slice(-3).join(" | ") || "—");
      case "noErrors":
        var errors = window.__cubickErrors || [];
        return result(rule, errors.length === 0, "mismatch", errors[0]);
      default:
        return result(rule, false, "error");
    }
  }
  async function run() {
    var results = [];
    for (var i = 0; i < config.rules.length; i++) {
      var rule = config.rules[i];
      try { results.push(await check(rule)); }
      catch (e) { results.push(result(rule, false, "error", e && e.message)); }
    }
    parent.postMessage({ __cubickTests: true, runId: config.runId, results: results }, "*");
  }
  function start() { setTimeout(run, 300); }
  if (document.readyState === "complete") start(); else window.addEventListener("load", start);
})`;

/** Student page + a runner that checks the browser rules and posts the results to the parent window. */
export function buildTestDocument({ html, css, js }: CodeFiles, rules: AutotestRule[], runId: string) {
  const config = JSON.stringify({ runId, rules: rules.filter((r) => r.type !== "code") }).replace(/</g, "\\u003c");
  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    PRELUDE,
    `<style>\n${css.replace(/<\/style/gi, "<\\/style")}\n</style>`,
    "</head>",
    "<body>",
    html,
    `<script>\n${js.replace(/<\/script/gi, "<\\/script")}\n</script>`,
    `<script>${RUNNER}(${config});</script>`,
    "</body>",
    "</html>",
  ].join("\n");
}
