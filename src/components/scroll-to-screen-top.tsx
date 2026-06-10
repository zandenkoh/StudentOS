"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

const SCROLLABLE_SELECTOR = [
  "[data-agent-log-scroller]",
  "[data-screen-scroll]",
  ".overflow-auto",
  ".overflow-y-auto"
].join(",");

export function resetScreenScroll() {
  const root = document.documentElement;
  const body = document.body;
  const previousRootBehavior = root.style.scrollBehavior;
  const previousBodyBehavior = body.style.scrollBehavior;

  root.style.scrollBehavior = "auto";
  body.style.scrollBehavior = "auto";

  window.scrollTo({ top: 0, behavior: "instant" });
  root.scrollTop = 0;
  body.scrollTop = 0;

  document.querySelectorAll<HTMLElement>(SCROLLABLE_SELECTOR).forEach((element) => {
    element.scrollTop = 0;
    element.scrollLeft = 0;
  });

  // Defer restoring scroll behavior to ensure layout engine acts on instant scroll
  setTimeout(() => {
    root.style.scrollBehavior = previousRootBehavior;
    body.style.scrollBehavior = previousBodyBehavior;
  }, 50);
}

export function runStaggeredScrollResets() {
  resetScreenScroll();

  const timeouts = [50, 150, 300, 500, 800].map((delay) =>
    setTimeout(resetScreenScroll, delay)
  );

  const frameId = window.requestAnimationFrame(resetScreenScroll);

  return () => {
    window.cancelAnimationFrame(frameId);
    timeouts.forEach(clearTimeout);
  };
}

export function ScrollToScreenTop() {
  const pathname = usePathname();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    return runStaggeredScrollResets();
  }, [pathname]);

  return null;
}
