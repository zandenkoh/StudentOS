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

  window.scrollTo(0, 0);
  root.scrollTop = 0;
  body.scrollTop = 0;

  document.querySelectorAll<HTMLElement>(SCROLLABLE_SELECTOR).forEach((element) => {
    element.scrollTop = 0;
    element.scrollLeft = 0;
  });

  root.style.scrollBehavior = previousRootBehavior;
  body.style.scrollBehavior = previousBodyBehavior;
}

export function ScrollToScreenTop() {
  const pathname = usePathname();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    resetScreenScroll();
    const frameId = window.requestAnimationFrame(resetScreenScroll);

    return () => window.cancelAnimationFrame(frameId);
  }, [pathname]);

  return null;
}
