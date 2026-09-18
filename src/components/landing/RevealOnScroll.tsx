"use client";

import { useEffect } from "react";

/**
 * Fades blocks marked with data-reveal in as they scroll into view.
 * Without JavaScript or with "reduce motion" everything is simply visible (see globals.css).
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

    const root = document.documentElement;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    const elements = document.querySelectorAll("[data-reveal]");
    elements.forEach((element) => observer.observe(element));
    root.classList.add("reveal-ready");

    // Safety net: whatever is already on screen never stays hidden, even if the observer is late
    const fallback = window.setTimeout(() => {
      elements.forEach((element) => {
        if (element.getBoundingClientRect().top < window.innerHeight) element.classList.add("is-visible");
      });
    }, 2000);

    return () => {
      window.clearTimeout(fallback);
      observer.disconnect();
      root.classList.remove("reveal-ready");
    };
  }, []);

  return null;
}
