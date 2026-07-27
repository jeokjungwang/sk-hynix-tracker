"use client";

import { useEffect, useState, type ReactNode } from "react";
import FitScale from "@/components/FitScale";

const DESKTOP_MIN = 1100;

/**
 * Phone/tablet: natural vertical scroll (no shrink).
 * Wide desktop only: FitScale broadcast canvas.
 * Mode is locked after first detect so resize won't remount charts.
 */
export default function ResponsiveShell({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"mobile" | "desktop">("mobile");

  useEffect(() => {
    const wide = window.innerWidth >= DESKTOP_MIN;
    const coarse =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    const short = window.innerHeight < 900;
    setMode(wide && !(coarse && short) ? "desktop" : "mobile");
  }, []);

  if (mode === "desktop") {
    return <FitScale designWidth={1600}>{children}</FitScale>;
  }

  return (
    <div className="mx-auto h-full w-full max-w-xl overflow-y-auto overscroll-y-contain pb-8">
      {children}
    </div>
  );
}
