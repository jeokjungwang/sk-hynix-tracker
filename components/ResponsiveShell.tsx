"use client";

import type { ReactNode } from "react";

/**
 * Full-viewport fluid shell — charts shrink with the window.
 * No FitScale lock; CSS flex handles PC / mobile.
 */
export default function ResponsiveShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto h-full w-full min-h-0 overflow-hidden">
      {children}
    </div>
  );
}
