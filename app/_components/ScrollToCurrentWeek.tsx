"use client";

import { useEffect } from "react";

interface Props {
  week: number;
}

// Scrolls the plan to the current week on open, so landing on /plan lands you on
// where you are in the plan rather than at week 1. Parent only renders this when
// that week is actually on screen. Honors prefers-reduced-motion.
export default function ScrollToCurrentWeek({ week }: Props) {
  useEffect(() => {
    const el = document.getElementById(`week-${week}`);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [week]);

  return null;
}
