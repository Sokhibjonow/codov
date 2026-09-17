// Light / dark theme. The choice lives in a cookie so the server can render it, and a tiny inline
// script applies it before the first paint (no white flash in dark mode). Without a choice the
// device setting is used.

export const themeModes = ["light", "dark"] as const;
export type ThemeMode = (typeof themeModes)[number];
export const THEME_COOKIE = "cubick_theme";

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && (themeModes as readonly string[]).includes(value);
}

/** Browser bar color on phones for each theme */
export const THEME_BAR_COLORS = { light: "#F6F3EC", dark: "#0E1320" };

/** Sets data-theme on <html> from the cookie or the device setting and keeps following the device. */
export const themeScript = `(function(){try{
var d=document.documentElement,mq=matchMedia("(prefers-color-scheme: dark)");
function apply(){var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)/);var t=m?m[1]:(mq.matches?"dark":"light");
d.dataset.theme=t;var c=t==="dark"?"${THEME_BAR_COLORS.dark}":"${THEME_BAR_COLORS.light}";
document.querySelectorAll("meta[name=theme-color]").forEach(function(e){e.setAttribute("content",c);e.removeAttribute("media");});}
apply();window.__applyTheme=apply;mq.addEventListener("change",apply);document.addEventListener("DOMContentLoaded",apply);
new MutationObserver(function(){if(!d.dataset.theme)apply();}).observe(d,{attributes:true,attributeFilter:["data-theme"]});
}catch(e){}})();`;
