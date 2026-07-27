"use client";

import { useEffect, useState, type ReactNode } from "react";
import FitScale from "@/components/FitScale";

const DESKTOP_MIN = 1100;

/**
 * Phone/tablet: natural vertical scroll (no shrink).
 * Wide desktop only: FitScale broadcast canvas.
 */
export default function ResponsiveShell({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"mobile" | "desktop">("mobile");

  useEffect(() => {
    const update = () => {
      const wide = window.innerWidth >= DESKTOP_MIN;
      // Prefer vertical layout on touch phones even if width reports large
      const coarse =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches;
      const short = window.innerHeight < 900;
      setMode(wide && !(coarse && short) ? "desktop" : "mobile");
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
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
