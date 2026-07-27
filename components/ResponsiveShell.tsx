"use client";

import { useEffect, useState, type ReactNode } from "react";
import FitScale from "@/components/FitScale";

/**
 * Desktop (lg+): broadcast FitScale canvas.
 * Mobile/tablet: natural vertical scroll — no shrink-to-fit.
 */
export default function ResponsiveShell({ children }: { children: ReactNode }) {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Avoid flash of wrong layout
  if (isDesktop === null) {
    return <div className="h-full w-full overflow-y-auto">{children}</div>;
  }

  if (isDesktop) {
    return <FitScale designWidth={1600}>{children}</FitScale>;
  }

  return (
    <div className="mx-auto h-full w-full max-w-lg overflow-y-auto overscroll-y-contain pb-6">
      {children}
    </div>
  );
}
